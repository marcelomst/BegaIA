// Central helper to consolidate and interpret date inputs across turns.
// Extracted from messageHandler large inline block.
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { extractSlotsFromText } from '@/lib/agents/helpers';

export interface DateConsolidationParams {
    lang: string;
    msgText: string;
    lcHistory: (HumanMessage | AIMessage)[];
    prevSlots: { checkIn?: string; checkOut?: string };
    nextSlots: { checkIn?: string; checkOut?: string;[k: string]: any };
    st: any; // conv state
    // Cuando el handler detectó que el usuario pidió modificar SOLO el check-in sin dar fecha todavía,
    // queremos preservar ese prompt aunque la consolidación encuentre el rango previo y genere una
    // confirmación accidental. Indicamos esa intención con este flag.
    preserveAskCheckInPrompt?: string | null;
}

export interface DateConsolidationResult {
    finalText?: string;              // response override (ask missing, noted range, etc.)
    nextSlots: { checkIn?: string; checkOut?: string;[k: string]: any };
    changed: boolean;
    preservedPrompt?: string | null; // devolvemos el prompt a preservar para que el handler pueda reinstaurarlo si fuera sobre-escrito
}

// Utility regex & helpers reused from handler (duplicated mínimamente para evitar dependencias circulares)
// Nota: versión con captura (no global) y versión global para usar con matchAll.
const RE_SINGLE_DATE = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
const RE_SINGLE_DATE_GLOBAL = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g;
// Fecha corta (dd/mm) para heredar año del contexto
const RE_SINGLE_DATE_SHORT = /(\b\d{1,2}[\/\-]\d{1,2}\b)(?![\/\-]\d{2,4})/;

function parseSingle(raw: string): string | undefined {
    const parts = raw.split(/[\/\-]/);
    if (parts.length !== 3) return;
    let [d, m, y] = parts;
    if (!y) return;
    y = y.length === 2 ? (Number(y) >= 70 ? '19' : '20') + y : y;
    return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function isoToDDMMYYYY(iso?: string) {
    if (!iso) return undefined;
    const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso;
    return `${m[3]}/${m[2]}/${m[1]}`;
}

// Detect if previous AI asked explicitly for missing check-in or check-out.
function lastAIMissingSide(history: (HumanMessage | AIMessage)[], lang: string): 'checkIn' | 'checkOut' | null {
    const ai = [...history].reverse().find(m => m instanceof AIMessage) as AIMessage | undefined;
    if (!ai) return null;
    const txt = String(ai.content || '').toLowerCase();
    const isEs = lang === 'es'; const isPt = lang === 'pt';
    const askCheckOut = /(check\s*-?out|salida|egreso|retirada|partida|sa[ií]da|checkout)/i;
    const askCheckIn = /(check\s*-?in|ingreso|entrada|arribo|llegada|arrival|checkin)/i;
    if (askCheckOut.test(txt) && !/check\s*-?in/.test(txt)) return 'checkOut';
    if (askCheckIn.test(txt) && !/check\s*-?out/.test(txt)) return 'checkIn';
    return null;
}

export function consolidateDates(p: DateConsolidationParams): DateConsolidationResult {
    let { nextSlots } = p;
    let finalText: string | undefined;
    const msg = p.msgText;
    let slotsChanged = false;

    // 0) Detección temprana de rango completo (ambas fechas en un solo mensaje) usando extractSlotsFromText.
    // Si el mensaje provee checkIn y checkOut (aunque el estado previo tuviera otro rango), podemos generar confirmación inmediata.
    try {
        const rawSlots = extractSlotsFromText(msg, p.lang);
        if (rawSlots.checkIn && rawSlots.checkOut) {
            const prevCI = p.prevSlots.checkIn;
            const prevCO = p.prevSlots.checkOut;
            const isDifferent = rawSlots.checkIn !== prevCI || rawSlots.checkOut !== prevCO;
            if (isDifferent) {
                nextSlots = { ...nextSlots, checkIn: rawSlots.checkIn, checkOut: rawSlots.checkOut };
                slotsChanged = true;
                const ciTxt = isoToDDMMYYYY(rawSlots.checkIn) || rawSlots.checkIn;
                const coTxt = isoToDDMMYYYY(rawSlots.checkOut) || rawSlots.checkOut;
                finalText = p.lang === 'es'
                    ? `Anoté nuevas fechas: ${ciTxt} → ${coTxt}. ¿Deseás que verifique disponibilidad y posibles diferencias?`
                    : p.lang === 'pt'
                        ? `Anotei as novas datas: ${ciTxt} → ${coTxt}. Deseja que eu verifique a disponibilidade e possíveis diferenças?`
                        : `Noted the new dates: ${ciTxt} → ${coTxt}. Do you want me to check availability and any differences?`;
            }
        }
    } catch (_) { /* silencioso */ }

    // 1) Detección de fechas completas presentes en el mensaje.
    // Si hay 2+ fechas, intentamos inferir rango ordenándolas cronológicamente (aun sin conectores "al/hasta").
    const fullDateMatches = [...msg.matchAll(RE_SINGLE_DATE_GLOBAL)].map(m => m[0]);
    if (!finalText && fullDateMatches.length >= 2) {
        const isoDates = fullDateMatches.map(d => parseSingle(d)).filter(Boolean) as string[];
        if (isoDates.length >= 2) {
            // Tomar solo las dos primeras distintas
            const distinct = [...new Set(isoDates)];
            if (distinct.length >= 2) {
                const [aRaw, bRaw] = distinct.slice(0, 2);
                const aTime = new Date(aRaw).getTime();
                const bTime = new Date(bRaw).getTime();
                if (!isNaN(aTime) && !isNaN(bTime) && aTime !== bTime) {
                    const ci = aTime < bTime ? aRaw : bRaw;
                    const co = aTime < bTime ? bRaw : aRaw;
                    const differs = ci !== p.prevSlots.checkIn || co !== p.prevSlots.checkOut;
                    if (differs) {
                        nextSlots = { ...nextSlots, checkIn: ci, checkOut: co };
                        slotsChanged = true;
                        const ciTxt = isoToDDMMYYYY(ci) || ci;
                        const coTxt = isoToDDMMYYYY(co) || co;
                        finalText = p.lang === 'es'
                            ? `Anoté nuevas fechas: ${ciTxt} → ${coTxt}. ¿Deseás que verifique disponibilidad y posibles diferencias?`
                            : p.lang === 'pt'
                                ? `Anotei as novas datas: ${ciTxt} → ${coTxt}. Deseja que eu verifique a disponibilidade e possíveis diferenças?`
                                : `Noted the new dates: ${ciTxt} → ${coTxt}. Do you want me to check availability and any differences?`;
                    }
                }
            }
        }
    }

    // Si no era un rango multi-fecha, seguimos con lógica de single date.
    let single = (!finalText && fullDateMatches.length === 1) ? fullDateMatches[0] : undefined;
    if (single) {
        const iso = parseSingle(single);
        if (iso) {
            const lower = msg.toLowerCase();
            // Ampliamos 'ingreso' para cubrir 'ingresar', 'vamos a ingresar', 'ingresamos'
            // y extendemos verbos de salida ("salimos", "salir") para evitar falsos positivos de single-date.
            const OUT_VERBS = /(check\s*-?out|salida|salir|salimos|egreso|retirada|partida|sa[ií]da|departure)/i;
            const IN_VERBS = /(check\s*-?in|ingres[ao]?|ingresar|inreso|entrada|arribo|arrival)/i;
            const mentionsInOnly = IN_VERBS.test(lower) && !OUT_VERBS.test(lower);
            const mentionsOutOnly = OUT_VERBS.test(lower) && !IN_VERBS.test(lower);
            if (mentionsInOnly) {
                if (nextSlots.checkIn !== iso) { nextSlots = { ...nextSlots, checkIn: iso }; slotsChanged = true; }
                finalText = buildAskMissing(p.lang, 'checkOut');
            } else if (mentionsOutOnly) {
                if (nextSlots.checkOut !== iso) { nextSlots = { ...nextSlots, checkOut: iso }; slotsChanged = true; }
                finalText = buildAskMissing(p.lang, 'checkIn');
            }
        }
    }

    // Intentar dd/mm heredando año si no había fecha completa
    if (!single) {
        const short = msg.match(RE_SINGLE_DATE_SHORT)?.[1];
        if (short) {
            // Incluir nextSlots (lo capturado en el turno actual previo a consolidación) como fuente primaria
            let inheritFrom = nextSlots.checkIn || nextSlots.checkOut || p.prevSlots.checkIn || p.prevSlots.checkOut || p.st?.reservationSlots?.checkIn || p.st?.reservationSlots?.checkOut;
            if (!inheritFrom) {
                // Buscar en historial última fecha completa con año explícito aportada por el usuario
                for (let i = p.lcHistory.length - 1; i >= 0; i--) {
                    const h = p.lcHistory[i];
                    if (h instanceof HumanMessage) {
                        const txt = String((h as any).content || '');
                        const full = txt.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
                        if (full) { inheritFrom = parseSingle(full[1]) || undefined; break; }
                    }
                }
            }
            const isoShort = parseShortWithYear(short, inheritFrom);
            if (isoShort) {
                const trimmedMsg = msg.trim();
                const isPureShort = /^\d{1,2}[\/\-]\d{1,2}$/.test(trimmedMsg);
                // Caso especial: usuario envía SOLO la fecha corta y ya tenemos un checkIn guardado.
                // Si además ya había un checkOut previo y esta fecha difiere → interpretar como nuevo checkOut.
                if (isPureShort && nextSlots.checkIn && (!nextSlots.checkOut || nextSlots.checkOut !== isoShort)) {
                    const ciTime = new Date(nextSlots.checkIn).getTime();
                    const coTime = new Date(isoShort).getTime();
                    if (!isNaN(ciTime) && !isNaN(coTime)) {
                        // Reajustar orden si el usuario pasó fecha anterior (raro pero defensivo)
                        if (coTime >= ciTime) {
                            nextSlots = { ...nextSlots, checkOut: isoShort };
                            slotsChanged = true;
                        } else {
                            // El usuario quizá quiso invertir; ajustamos checkIn
                            nextSlots = { ...nextSlots, checkIn: isoShort };
                            slotsChanged = true;
                        }
                    }
                } else {
                    // Determinar qué lado falta con heurística simple
                    if (!nextSlots.checkIn && (nextSlots.checkOut || p.prevSlots.checkOut)) {
                        nextSlots = { ...nextSlots, checkIn: isoShort }; slotsChanged = true;
                    } else if (!nextSlots.checkOut && (nextSlots.checkIn || p.prevSlots.checkIn)) {
                        nextSlots = { ...nextSlots, checkOut: isoShort }; slotsChanged = true;
                    } else if (!nextSlots.checkIn && !p.prevSlots.checkIn) {
                        nextSlots = { ...nextSlots, checkIn: isoShort }; slotsChanged = true;
                    } else if (!nextSlots.checkOut && !p.prevSlots.checkOut) {
                        nextSlots = { ...nextSlots, checkOut: isoShort }; slotsChanged = true;
                    }
                }
                single = short;
            }
        }
    }

    // 2) If we still have only one side and user just provided single date after AI asked for the other side.
    if (!finalText && single) {
        const sideNeeded = lastAIMissingSide(p.lcHistory, p.lang);
        if (sideNeeded) {
            let iso = parseSingle(single);
            if (!iso) {
                const inherit = p.prevSlots.checkIn || p.prevSlots.checkOut || p.st?.reservationSlots?.checkIn || p.st?.reservationSlots?.checkOut;
                iso = parseShortWithYear(single, inherit);
            }
            if (iso) {
                if (sideNeeded === 'checkOut' && (!nextSlots.checkOut || nextSlots.checkOut === p.prevSlots.checkOut)) {
                    // Permitimos override del checkOut previo si el asistente lo pidió explícitamente
                    nextSlots = { ...nextSlots, checkOut: iso }; slotsChanged = true;
                    // Intentar recuperar nuevo check-in previo (single date anterior) si el usuario lo dio en un mensaje anterior
                    if (!nextSlots.checkIn || nextSlots.checkIn === p.prevSlots.checkIn) {
                        for (let i = p.lcHistory.length - 1; i >= 0; i--) {
                            const m = p.lcHistory[i];
                            if (m instanceof HumanMessage) {
                                const txt = String((m as any).content || '');
                                // Saltar el mensaje actual (no está aún en history, así que no problema) y buscar la última fecha única distinta al rango previo
                                const datesHere = [...txt.matchAll(RE_SINGLE_DATE_GLOBAL)].map(d => d[0]);
                                if (datesHere.length === 1) {
                                    const parsed = parseSingle(datesHere[0]);
                                    if (parsed && parsed !== p.prevSlots.checkIn) {
                                        nextSlots = { ...nextSlots, checkIn: parsed }; slotsChanged = true; break;
                                    }
                                }
                            }
                        }
                    }
                    // Si ahora tenemos rango completo nuevo -> confirmar inmediatamente
                    if (nextSlots.checkIn && nextSlots.checkOut && (nextSlots.checkIn !== p.prevSlots.checkIn || nextSlots.checkOut !== p.prevSlots.checkOut)) {
                        const ciTxt = isoToDDMMYYYY(nextSlots.checkIn) || nextSlots.checkIn;
                        const coTxt = isoToDDMMYYYY(nextSlots.checkOut) || nextSlots.checkOut;
                        finalText = p.lang === 'es'
                            ? `Anoté nuevas fechas: ${ciTxt} → ${coTxt}. ¿Deseás que verifique disponibilidad y posibles diferencias?`
                            : p.lang === 'pt'
                                ? `Anotei as novas datas: ${ciTxt} → ${coTxt}. Deseja que eu verifique a disponibilidade e possíveis diferenças?`
                                : `Noted the new dates: ${ciTxt} → ${coTxt}. Do you want me to check availability and any differences?`;
                    }
                } else if (sideNeeded === 'checkIn' && !nextSlots.checkIn) {
                    nextSlots = { ...nextSlots, checkIn: iso }; slotsChanged = true;
                    if (nextSlots.checkIn && nextSlots.checkOut && (nextSlots.checkIn !== p.prevSlots.checkIn || nextSlots.checkOut !== p.prevSlots.checkOut)) {
                        const ciTxt = isoToDDMMYYYY(nextSlots.checkIn) || nextSlots.checkIn;
                        const coTxt = isoToDDMMYYYY(nextSlots.checkOut) || nextSlots.checkOut;
                        finalText = p.lang === 'es'
                            ? `Anoté nuevas fechas: ${ciTxt} → ${coTxt}. ¿Deseás que verifique disponibilidad y posibles diferencias?`
                            : p.lang === 'pt'
                                ? `Anotei as novas datas: ${ciTxt} → ${coTxt}. Deseja que eu verifique a disponibilidade e possíveis diferenças?`
                                : `Noted the new dates: ${ciTxt} → ${coTxt}. Do you want me to check availability and any differences?`;
                    }
                }
            }
        }
    }

    // 2.5) Heurística específica: flujo "nuevo check in DD/MM/YYYY" seguido por "DD/MM" (sin año) => interpretar como nuevo rango.
    // Condiciones: no hay finalText aún, el mensaje actual trae una fecha corta (single quedó indefinido porque era dd/mm; se detectó en short),
    // prevSlots representan la reserva antigua (con checkIn y checkOut), y en el historial inmediato hay un mensaje usuario con patrón 'nuevo check in <full date>'.
    if (true) { // ejecutamos siempre para que pueda overridear menús genéricos
        const humanMsgs = [...p.lcHistory].filter(m => m instanceof HumanMessage) as HumanMessage[];
        const lastUserBefore = humanMsgs.length >= 2 ? humanMsgs[humanMsgs.length - 2] : undefined;
        const currentUser = humanMsgs[humanMsgs.length - 1];
        const currentTxt = String(currentUser?.content || '').trim();
        const isShortOnly = /^\d{1,2}[\/\-]\d{1,2}$/.test(currentTxt);
        if (isShortOnly && lastUserBefore) {
            const prevTxt = String((lastUserBefore as any).content || '');
            const mPrev = prevTxt.match(/nuevo\s+check\s*-?in\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i) || prevTxt.match(/new\s+check\s*-?in\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
            if (mPrev) {
                const newCheckInISO = parseSingle(mPrev[1]);
                if (newCheckInISO) {
                    const coISO = parseShortWithYear(currentTxt, newCheckInISO);
                    if (coISO) {
                        // Reordenar si necesario
                        const a = new Date(newCheckInISO) <= new Date(coISO) ? newCheckInISO : coISO;
                        const b = a === newCheckInISO ? coISO : newCheckInISO;
                        nextSlots = { ...nextSlots, checkIn: a, checkOut: b };
                        const ciTxt = isoToDDMMYYYY(a) || a;
                        const coTxt = isoToDDMMYYYY(b) || b;
                        finalText = p.lang === 'es'
                            ? `Anoté nuevas fechas: ${ciTxt} → ${coTxt}. ¿Deseás que verifique disponibilidad y posibles diferencias?`
                            : p.lang === 'pt'
                                ? `Anotei as novas datas: ${ciTxt} → ${coTxt}. Deseja que eu verifique a disponibilidade e possíveis diferenças?`
                                : `Noted the new dates: ${ciTxt} → ${coTxt}. Do you want me to check availability and any differences?`;
                    }
                }
            }
        }
    }

    // Caso intermedio: si había un rango previo y el usuario solo cambió un lado aportando UNA sola fecha en este turno,
    // preferimos pedir la otra fecha explícitamente en lugar de confirmar de inmediato (evita los falsos positivos
    // detectados por los tests de follow-up de una sola fecha en modificación / 'vamos a ingresar ...').
    if (!finalText) {
        const hadPrevRange = !!(p.prevSlots.checkIn && p.prevSlots.checkOut);
        const nowRange = !!(nextSlots.checkIn && nextSlots.checkOut);
        const changedRange = nowRange && (nextSlots.checkIn !== p.prevSlots.checkIn || nextSlots.checkOut !== p.prevSlots.checkOut);
        if (hadPrevRange && changedRange) {
            const datesInMsg = [...p.msgText.matchAll(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/g)].length;
            if (datesInMsg === 1) {
                // Determinar qué lado cambió
                const changedCheckIn = nextSlots.checkIn !== p.prevSlots.checkIn && nextSlots.checkOut === p.prevSlots.checkOut;
                const changedCheckOut = nextSlots.checkOut !== p.prevSlots.checkOut && nextSlots.checkIn === p.prevSlots.checkIn;
                if (changedCheckIn) {
                    finalText = buildAskMissing(p.lang, 'checkOut');
                } else if (changedCheckOut) {
                    finalText = buildAskMissing(p.lang, 'checkIn');
                }
            }
        }
    }

    // Detectar si el usuario realmente incluyó algún token de fecha en este mensaje (completa o corta)
    const userProvidedSomeDate = /\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/.test(msg);

    // Confirmación temprana opcional si acabamos de completar rango (incluyendo herencia de año) y antes no lo había.
    // Importante: solo confirmar si el usuario efectivamente aportó alguna fecha en este turno; de lo contrario
    // podríamos sobre-escribir prompts del handler como "¿Cuál es la fecha de check-in?" cuando el usuario solo dijo
    // "quiero modificar el check in" sin fechas nuevas.
    if (!finalText && userProvidedSomeDate) {
        const hadPrevRange = !!(p.prevSlots.checkIn && p.prevSlots.checkOut);
        const nowRange = !!(nextSlots.checkIn && nextSlots.checkOut);
        const changedRange = nowRange && (nextSlots.checkIn !== p.prevSlots.checkIn || nextSlots.checkOut !== p.prevSlots.checkOut);
        // Generar confirmación si el rango es nuevo o incompleto antes (aunque hubiera uno previo diferente)
        if (nowRange && (!hadPrevRange || changedRange)) {
            const ciTxt = isoToDDMMYYYY(nextSlots.checkIn) || nextSlots.checkIn;
            const coTxt = isoToDDMMYYYY(nextSlots.checkOut) || nextSlots.checkOut;
            finalText = p.lang === 'es'
                ? `Anoté nuevas fechas: ${ciTxt} → ${coTxt}. ¿Deseás que verifique disponibilidad y posibles diferencias?`
                : p.lang === 'pt'
                    ? `Anotei as novas datas: ${ciTxt} → ${coTxt}. Deseja que eu verifique a disponibilidade e possíveis diferenças?`
                    : `Noted the new dates: ${ciTxt} → ${coTxt}. Do you want me to check availability and any differences?`;
        }
    }

    // 3) Refuerzo: si ya teníamos finalText genérico (por otra rama externa) pero ahora hay rango completo nuevo y finalText parece "entendido" o ack corto, reemplazarlo.
    // También aplicamos el mismo guard: solo si el usuario aportó alguna fecha (evita confirmar sin input de fecha).
    if (!finalText && userProvidedSomeDate) {
        const hasRange = !!(nextSlots.checkIn && nextSlots.checkOut);
        const prevRangeDifferent = (nextSlots.checkIn !== p.prevSlots.checkIn) || (nextSlots.checkOut !== p.prevSlots.checkOut);
        if (hasRange && prevRangeDifferent) {
            const ciTxt = isoToDDMMYYYY(nextSlots.checkIn) || nextSlots.checkIn;
            const coTxt = isoToDDMMYYYY(nextSlots.checkOut) || nextSlots.checkOut;
            finalText = p.lang === 'es'
                ? `Anoté nuevas fechas: ${ciTxt} → ${coTxt}. ¿Deseás que verifique disponibilidad y posibles diferencias?`
                : p.lang === 'pt'
                    ? `Anotei as novas datas: ${ciTxt} → ${coTxt}. Deseja que eu verifique a disponibilidade e possíveis diferenças?`
                    : `Noted the new dates: ${ciTxt} → ${coTxt}. Do you want me to check availability and any differences?`;
        }
    }

    // Si debemos preservar el prompt original de pedir check-in y se generó una confirmación
    if (p.preserveAskCheckInPrompt && /anot[eé] nuevas fechas|anotei as novas datas|noted the new dates/i.test(finalText || '')) {
        // No borramos finalText aquí: entregamos ambos para que el handler decida (para trazabilidad)
        return { finalText, nextSlots, changed: slotsChanged || !!finalText, preservedPrompt: p.preserveAskCheckInPrompt };
    }
    return { finalText, nextSlots, changed: slotsChanged || !!finalText, preservedPrompt: p.preserveAskCheckInPrompt || null };
}

// Parse dd/mm heredando año desde un ISO conocido
function parseShortWithYear(raw: string, inheritFromISO?: string): string | undefined {
    const parts = raw.split(/[\/\-]/);
    if (parts.length !== 2) return undefined;
    if (!inheritFromISO) return undefined;
    const mIso = inheritFromISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!mIso) return undefined;
    const year = mIso[1];
    const [d, m] = parts;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function buildAskMissing(lang: string, side: 'checkIn' | 'checkOut') {
    if (lang === 'pt') return side === 'checkOut' ? 'Qual é a data de check-out? (dd/mm/aaaa)' : 'Qual é a data de check-in? (dd/mm/aaaa)';
    if (lang !== 'es') return side === 'checkOut' ? 'What is the check-out date? (dd/mm/yyyy)' : 'What is the check-in date? (dd/mm/yyyy)';
    return side === 'checkOut' ? '¿Cuál es la fecha de check-out? (dd/mm/aaaa)' : '¿Cuál es la fecha de check-in? (dd/mm/aaaa)';
}
