// Path: /root/begasist/lib/agents/orchestratorAgent.ts
// Fase 2: Agente Orquestador. En esta fase el coordinador sigue siendo messageHandler.ts
// Este módulo define la interfaz del orquestador/planificador y una primera migración
// no crítica (camino "saludo simple" con fallback determinista) para mantener paridad.

// Tipos base para la orquestación. Están inspirados en el shape de PreLLMResult,
// pero solo incluyen lo necesario para el camino migrado.
export type OrchestratorInput = {
    lang: "es" | "en" | "pt";
    msg: { content?: string; hotelId?: string };
    inModifyMode: boolean;
    currSlots: any;
    prevCategory: string | null;
    // Contexto adicional para ramas de negocio
    conversationId?: string;
    lcHistory?: any[];
    st?: any;
    prevSlotsStrict?: any;
    // Razón opcional para activar un camino migrado distinto del saludo.
    // "empty_final_text" → fallback determinista; "structured_fallback" → usar respuesta estructurada.
    fallbackReason?: "empty_final_text" | "structured_fallback";
    priorNeedsSupervision?: boolean; // preserva decisión previa de bodyLLM si ya existía.
    structuredFallback?: {
        answer?: string;
        intent?: string;
        entities?: any;
        handoff?: boolean;
    } | null;
};

export type OrchestratorOutput = {
    finalText: string;
    nextCategory: string | null;
    nextSlots: any;
    needsSupervision: boolean;
    graphResult?: any;
};

// Camino migrado "seguro":
// - Caso de saludo simple en entorno de test/fast-path cuando NO estamos en modo modificación.
// - Este camino en bodyLLM evitaba invocar el grafo y respondía con ruleBasedFallback,
//   marcando la categoría como "retrieval_based" y sin supervisión.
// - Es seguro porque no ejecuta tools, no modifica reservas, ni toca conv_state
//   (messageHandler solo persiste follow-ups de copia, que aquí no aplican).

function looksGreeting(text: string): boolean {
    return /^(hola|buenas|hello|hi|hey|ol[aá]|oi)\b/i.test(text || "");
}

function isTestFastEnv(): boolean {
    try {
        // Mantiene la lógica del handler: fast en test/vitest o VITEST
        // Evitamos depender de globalThis.vitest si no existe
        const isTest = process.env.NODE_ENV === "test" || Boolean((globalThis as any).vitest) || Boolean(process.env.VITEST) || Boolean(process.env.DEBUG_FASTPATH) || Boolean(process.env.ENABLE_TEST_FASTPATH);
        return isTest;
    } catch {
        return false;
    }
}

function ruleBasedFallback(lang: string, userText: string): string {
    const t = (userText || "").toLowerCase();
    const es = lang.startsWith("es"), pt = lang.startsWith("pt");
    const wantsReservation = /reserv|book|quero reservar|quiero reservar/.test(t);
    if (wantsReservation) {
        return es
            ? "Para avanzar con tu reserva necesito: nombre del huésped, tipo de habitación, fecha de check-in y fecha de check-out. ¿Me lo compartís?"
            : pt
                ? "Para prosseguir com a sua reserva preciso: nome do hóspede, tipo de quarto, data de check-in e check-out. Pode me enviar?"
                : "To proceed with your booking I need: guest name, room type, check-in date and check-out date. Could you share them?";
    }
    return es ? "¿En qué puedo ayudarte?"
        : pt ? "Em que posso ajudar?"
            : "How can I help you?";
}

export async function runOrchestratorPlanner(input: OrchestratorInput): Promise<OrchestratorOutput> {
    const text = String(input.msg.content || "");
    const inTestFast = isTestFastEnv();

    // Camino 1: saludo simple (ya migrado)
    if (inTestFast && looksGreeting(text) && !input.inModifyMode && !input.fallbackReason) {
        const finalText = ruleBasedFallback(input.lang, text);
        return {
            finalText,
            nextCategory: "retrieval_based",
            nextSlots: input.currSlots,
            needsSupervision: false,
            graphResult: null,
        };
    }

    // Camino 1.b: Recotización de huéspedes (re-quote)
    // FUENTE ÚNICA DE VERDAD (legacy eliminado en messageHandler/bodyLLM)
    // Condiciones seguras:
    //   - Fechas conocidas (en currSlots o en st.reservationSlots)
    //   - Usuario aporta un nuevo número de huéspedes distinto al previo (prevSlotsStrict/st)
    // Efectos:
    //   - Ajuste de roomType si capacidad insuficiente
    //   - Recalculo vía runAvailabilityCheck
    //   - Texto ACK + resumen pricing final
    // Si falla, se degrada silenciosamente al bodyLLM (no rompe flujo externo)
    try {
        const prevGuestsVal = String(
            (input.prevSlotsStrict as any)?.numGuests || (input.st as any)?.reservationSlots?.numGuests || ""
        );
        const { extractSlotsFromText, localizeRoomType } = await import("@/lib/agents/helpers");
        const { runAvailabilityCheck } = await import("@/lib/handlers/pipeline/availability");
        const slotsFromText = extractSlotsFromText(text, input.lang) as any;
        const guestsParsed = slotsFromText?.numGuests ? parseInt(String(slotsFromText.numGuests), 10) : NaN;
        const hasNewGuests = Number.isFinite(guestsParsed) && guestsParsed > 0 && String(guestsParsed) !== prevGuestsVal;
        const haveDatesNow = Boolean(
            (input.currSlots?.checkIn || (input.st as any)?.reservationSlots?.checkIn) &&
            (input.currSlots?.checkOut || (input.st as any)?.reservationSlots?.checkOut)
        );
        try {
            // Debug mínimo para diagnosticar por qué no entra al camino migrado en tests
            // Evita ruido en producción: solo en entorno de test/log rápido
            const dbg = (process.env.NODE_ENV === 'test' || (globalThis as any).vitest || process.env.VITEST) ? console.log : () => { };
            dbg('[orch][re-quote] prevGuests=%s, parsed=%s, hasNewGuests=%s, haveDatesNow=%s, currSlots=%o, st.resSlots=%o',
                prevGuestsVal, guestsParsed, hasNewGuests, haveDatesNow,
                input.currSlots,
                (input as any)?.st?.reservationSlots);
        } catch { }
        if (hasNewGuests && haveDatesNow) {
            const finalGuests = String(guestsParsed);
            const currentType = input.currSlots?.roomType || (input.st as any)?.reservationSlots?.roomType;
            const { chooseRoomTypeForGuests } = await import("@/lib/handlers/pipeline/availability");
            const { target, changed } = chooseRoomTypeForGuests(currentType, parseInt(finalGuests, 10));
            // Construir nextSlots fusionando slots actuales/previos + nuevos
            const baseSlots = {
                ...(input.st as any)?.reservationSlots,
                ...(input.currSlots || {}),
            } as any;
            const nextSlots = {
                ...baseSlots,
                numGuests: finalGuests,
                roomType: target,
            };
            const ciISO = nextSlots.checkIn || (input.st as any)?.reservationSlots?.checkIn;
            const coISO = nextSlots.checkOut || (input.st as any)?.reservationSlots?.checkOut;
            const preLike = {
                lang: input.lang,
                lcHistory: (input.lcHistory || []) as any[],
                st: input.st,
                msg: { hotelId: input.msg.hotelId as string, channel: undefined },
                conversationId: input.conversationId || "",
            } as any;
            const res = await runAvailabilityCheck(preLike, nextSlots, ciISO, coISO);
            const ack = changed
                ? (input.lang === "es"
                    ? `Actualicé la capacidad a ${finalGuests} huésped(es) y ajusté el tipo a ${localizeRoomType(target, input.lang)}.`
                    : input.lang === "pt"
                        ? `Atualizei a capacidade para ${finalGuests} hóspede(s) e ajustei o tipo para ${localizeRoomType(target, input.lang)}.`
                        : `I updated capacity to ${finalGuests} guest(s) and adjusted the room type to ${localizeRoomType(target, input.lang)}.`)
                : (input.lang === "es"
                    ? `Actualicé la capacidad a ${finalGuests} huésped(es).`
                    : input.lang === "pt"
                        ? `Atualizei a capacidade para ${finalGuests} hóspede(s).`
                        : `I updated capacity to ${finalGuests} guest(s).`);
            const finalText = `${ack}\n\n${res.finalText}`.trim();
            return {
                finalText,
                nextCategory: input.prevCategory || "reservation",
                nextSlots: res.nextSlots,
                needsSupervision: !!input.priorNeedsSupervision || !!res.needsHandoff,
                graphResult: null,
            };
        }
    } catch (_e) {
        // Si algo falla, no bloquea: el proxy degradará a bodyLLM
    }

    // Camino 2: fallback structured (respuesta estructurada tras grafo fallido o vacío)
    if (input.fallbackReason === "structured_fallback" && input.structuredFallback?.answer) {
        const sf = input.structuredFallback;
        let finalText: string;
        if (sf.handoff === true && input.inModifyMode) {
            finalText = buildModifyGuidance(input.lang, input.currSlots);
        } else {
            finalText = sf.answer!;
        }
        const s = sf.entities || {};
        const mergedSlots = {
            ...input.currSlots,
            checkIn: input.currSlots.checkIn || s.checkin_date || undefined,
            checkOut: input.currSlots.checkOut || s.checkout_date || undefined,
            roomType: input.currSlots.roomType || s.room_type || undefined,
            numGuests: input.currSlots.numGuests || (typeof s.guests === "number" ? String(s.guests) : undefined),
        };
        return {
            finalText,
            nextCategory: mapStructuredIntentToCategory(sf.intent || "general_question"),
            nextSlots: mergedSlots,
            needsSupervision: sf.handoff === true ? true : !!input.priorNeedsSupervision,
            graphResult: null,
        };
    }

    // Camino 3: fallback determinista por grafo sin salida útil.
    if (input.fallbackReason === "empty_final_text") {
        const finalText = ruleBasedFallback(input.lang, text);
        return {
            finalText,
            nextCategory: input.prevCategory || "retrieval_based",
            nextSlots: input.currSlots,
            needsSupervision: !!input.priorNeedsSupervision,
            graphResult: null,
        };
    }

    // No coincide ningún camino migrado
    throw Object.assign(new Error("ORCH_NO_MATCH"), { code: "ORCH_NO_MATCH" });
}

export async function runAuditAdvisory(_pre: any, _body: OrchestratorOutput): Promise<{ verdictInfo: any; llmInterp: any; needsSupervision: boolean; }> {
    throw new Error("runAuditAdvisory no implementado en Fase 2 (placeholder). El coordinador sigue usando posLLM interno.");
}

// Proxy fino para enrutar el bodyLLM existente o el planner migrado sin cambiar comportamiento.
// Si el flag USE_ORCHESTRATOR_AGENT está activo y el caso coincide con el camino migrado,
// usa runOrchestratorPlanner; en caso contrario delega en runBodyPhase (bodyLLM actual).
export async function runOrchestratorProxy<T extends OrchestratorOutput>(
    pre: any,
    runBodyPhase: () => Promise<T>
): Promise<T> {
    const enabled = process.env.USE_ORCHESTRATOR_AGENT === "1" || process.env.USE_ORCHESTRATOR_AGENT === "true";
    try {
        const dbg = (process.env.NODE_ENV === 'test' || (globalThis as any).vitest || process.env.VITEST) ? console.log : () => { };
        dbg('[orch][proxy] enabled=%s msg="%s"', enabled, String(pre?.msg?.content || ''));
    } catch { }
    if (!enabled) return await runBodyPhase();

    // Marcamos el pre para que bodyLLM omita su propio fallback determinista.
    (pre as any).__orchestratorActive = true;

    // Intento inicial: planner sobre caminos migrados sin tools (saludo, recotización).
    try {
        const greetingInput: OrchestratorInput = {
            lang: pre.lang,
            msg: { content: pre?.msg?.content, hotelId: pre?.msg?.hotelId },
            inModifyMode: !!pre.inModifyMode,
            currSlots: pre.currSlots,
            prevCategory: pre.prevCategory ?? null,
            conversationId: pre.conversationId,
            lcHistory: pre.lcHistory,
            st: pre.st,
            prevSlotsStrict: pre.prevSlotsStrict,
        };
        const planned = await runOrchestratorPlanner(greetingInput);
        return planned as T;
    } catch (e: any) {
        if (e?.code !== "ORCH_NO_MATCH") {
            // Error inesperado → degradar directo
            return await runBodyPhase();
        }
    }

    // Ejecutar bodyLLM real (sin fallback interno si finalText queda vacío)
    const body = await runBodyPhase();
    const structuredFallback = body?.graphResult?.structuredFallback;
    // Prioridad: si hay structuredFallback y finalText vacío → usar planner structured
    if ((!body.finalText || !String(body.finalText).trim()) && structuredFallback?.answer) {
        try {
            const sfInput: OrchestratorInput = {
                lang: pre.lang,
                msg: { content: pre?.msg?.content },
                inModifyMode: !!pre.inModifyMode,
                currSlots: body.nextSlots || pre.currSlots,
                prevCategory: body.nextCategory ?? pre.prevCategory ?? null,
                fallbackReason: "structured_fallback",
                priorNeedsSupervision: body.needsSupervision,
                structuredFallback,
            };
            const plannedStructured = await runOrchestratorPlanner(sfInput);
            body.finalText = plannedStructured.finalText;
            body.nextCategory = plannedStructured.nextCategory;
            body.nextSlots = plannedStructured.nextSlots;
            body.needsSupervision = plannedStructured.needsSupervision;
            if (plannedStructured.graphResult !== undefined) body.graphResult = plannedStructured.graphResult;
        } catch (e: any) {
            // Si falla el planner structured, continuamos a fallback determinista normal bajo mismo chequeo.
        }
    }
    // Si aún sigue vacío → fallback determinista migrado
    if (!body.finalText || !String(body.finalText).trim()) {
        try {
            const fbInput: OrchestratorInput = {
                lang: pre.lang,
                msg: { content: pre?.msg?.content },
                inModifyMode: !!pre.inModifyMode,
                currSlots: body.nextSlots || pre.currSlots,
                prevCategory: body.nextCategory ?? pre.prevCategory ?? null,
                fallbackReason: "empty_final_text",
                priorNeedsSupervision: body.needsSupervision,
            };
            const plannedFallback = await runOrchestratorPlanner(fbInput);
            body.finalText = plannedFallback.finalText;
            body.nextCategory = plannedFallback.nextCategory;
            body.nextSlots = plannedFallback.nextSlots;
            body.needsSupervision = plannedFallback.needsSupervision;
            if (plannedFallback.graphResult !== undefined) body.graphResult = plannedFallback.graphResult;
        } catch (e: any) {
            body.finalText = ruleBasedFallback(pre.lang, String(pre?.msg?.content || ""));
            if (!body.nextCategory) body.nextCategory = pre.prevCategory || "retrieval_based";
        }
    }
    return body;
}

// === Helpers replicados (evitar dependencia circular con messageHandler) ===
function mapStructuredIntentToCategory(intent: string): string {
    switch (intent) {
        case "reservation_inquiry": return "reservation";
        case "cancellation_policy": return "cancel_reservation";
        case "pricing_request": return "pricing_info";
        case "checkin_info": return "checkin_info";
        case "checkout_info": return "checkout_info";
        case "amenities_info": return "amenities_info";
        case "location_directions": return "directions_info";
        case "general_question": return "retrieval_based";
        case "out_of_scope": return "out_of_scope";
        default: return "retrieval_based";
    }
}

function buildModifyGuidance(lang: "es" | "en" | "pt", slots: any): string {
    const hasDates = Boolean(slots?.checkIn && slots?.checkOut);
    const es = () => `Podemos modificar tu reserva confirmada. Decime qué querés cambiar: ${hasDates ? "nuevas fechas, " : "fechas (check-in y check-out), "}tipo de habitación o cantidad de huéspedes. Si es por fechas, indicá nuevo check-in y check-out.`;
    const en = () => `We can modify your confirmed booking. Tell me what you'd like to change: ${hasDates ? "new dates, " : "check-in and check-out dates, "}room type, or number of guests. For dates, please provide the new check-in and check-out.`;
    const pt = () => `Podemos modificar sua reserva confirmada. Diga o que você deseja alterar: ${hasDates ? "novas datas, " : "datas de check-in e check-out, "}tipo de quarto ou quantidade de hóspedes. Para datas, informe o novo check-in e check-out.`;
    return lang === "es" ? es() : lang === "pt" ? pt() : en();
}
