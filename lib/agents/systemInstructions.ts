// Path: /root/begasist/lib/agents/systemInstructions.ts
import { getLatestPlaybook } from "@/lib/astra/systemPlaybook";

export type ConversationState = {
  draft?: {
    guestName?: string;
    roomType?: string;
    checkIn?: string;
    checkOut?: string;
    numGuests?: string;
  } | null;
  confirmedBooking?: { code?: string } | null;
  locale?: string; // "es" por defecto
};

export function choosePlaybookKey(
  intent: "reservation" | "modify" | "ambiguous"
): string {
  if (intent === "reservation") return "reservation_flow";
  if (intent === "modify") return "modify_reservation";
  return "ambiguity_policy";
}

function byLang<T extends Record<"es" | "pt" | "en", string>>(lang: string, msgs: T): string {
  if (lang.startsWith("pt")) return msgs.pt;
  if (lang.startsWith("en")) return msgs.en;
  return msgs.es; // default ES
}

function buildDynamicRules(lang: string, state?: ConversationState): string[] {
  const s = state || {};
  const d = s.draft || {};

  const has = {
    guestName: !!d?.guestName,
    roomType: !!d?.roomType,
    checkIn: !!d?.checkIn,
    checkOut: !!d?.checkOut,
    numGuests: !!d?.numGuests,
  };

  const rules: string[] = [];

  // Locale ya definido
  rules.push(
    byLang(lang, {
      es: `- No pidas el código de idioma (locale); ya está definido como "${lang}".`,
      pt: `- Não peça o código de idioma (locale); já está definido como "${lang}".`,
      en: `- Do not ask for the locale; it is already set to "${lang}".`,
    })
  );

  // Si ya hay slots en borrador, no repreguntar
  if (has.checkIn && has.checkOut) {
    rules.push(
      byLang(lang, {
        es: `- Ya tenemos fechas: check-in ${d.checkIn} y check-out ${d.checkOut}. No vuelvas a pedirlas; solo reconfirma brevemente si hubiera ambigüedad.`,
        pt: `- Já temos as datas: check-in ${d.checkIn} e check-out ${d.checkOut}. Não volte a pedir; apenas reconfirme brevemente se houver ambiguidade.`,
        en: `- We already have the dates: check-in ${d.checkIn} and check-out ${d.checkOut}. Do not ask again; only briefly reconfirm if ambiguous.`,
      })
    );
  }
  if (has.roomType) {
    rules.push(
      byLang(lang, {
        es: `- Ya tenemos el tipo de habitación: ${d.roomType}. No vuelvas a pedirlo salvo conflicto.`,
        pt: `- Já temos o tipo de quarto: ${d.roomType}. Não volte a pedir, salvo conflito.`,
        en: `- We already have the room type: ${d.roomType}. Do not ask again unless there is a conflict.`,
      })
    );
  }
  if (has.numGuests) {
    rules.push(
      byLang(lang, {
        es: `- Ya tenemos el número de huéspedes: ${d.numGuests}.`,
        pt: `- Já temos o número de hóspedes: ${d.numGuests}.`,
        en: `- We already have the number of guests: ${d.numGuests}.`,
      })
    );
  }
  if (has.guestName) {
    rules.push(
      byLang(lang, {
        es: `- Ya tenemos el nombre del huésped: ${d.guestName}.`,
        pt: `- Já temos o nome do hóspede: ${d.guestName}.`,
        en: `- We already have the guest name: ${d.guestName}.`,
      })
    );
  }

  // Pedir solo lo que falta (formato sugerido para fechas)
  if (!has.checkIn || !has.checkOut) {
    rules.push(
      byLang(lang, {
        es: `- Si faltan fechas, pídeles juntas en una sola línea indicando el formato dd/mm/aaaa.`,
        pt: `- Se faltarem datas, solicite-as juntas em uma única linha indicando o formato dd/mm/aaaa.`,
        en: `- If dates are missing, request both in a single line and specify the format dd/mm/yyyy.`,
      })
    );
  }
  if (!has.numGuests) {
    rules.push(
      byLang(lang, {
        es: `- Si falta el número de huéspedes, pídelo en la misma línea de aclaración.`,
        pt: `- Se faltar o número de hóspedes, peça-o na mesma linha de esclarecimento.`,
        en: `- If the number of guests is missing, ask for it in the same clarification line.`,
      })
    );
  }
  if (!has.roomType) {
    rules.push(
      byLang(lang, {
        es: `- Si falta el tipo de habitación, ofrece 2 opciones razonables según la ocupación (sin inventar disponibilidad).`,
        pt: `- Se faltar o tipo de quarto, ofereça 2 opções razoáveis conforme a ocupação (sem inventar disponibilidade).`,
        en: `- If room type is missing, offer 2 reasonable options given the occupancy (do not fabricate availability).`,
      })
    );
  }

  // Política de diálogo
  rules.push(
    byLang(lang, {
      es: `- Evita más de 1 repregunta encadenada; si faltan varios datos, pídeles juntos en una sola línea.`,
      pt: `- Evite mais de 1 repregunta encadeada; se faltarem vários dados, peça-os juntos em uma única linha.`,
      en: `- Avoid more than one follow-up question in a row; if multiple fields are missing, ask for them together in one line.`,
    })
  );
  rules.push(
    byLang(lang, {
      es: `- Si el usuario corrige un dato ya guardado, acepta la corrección y actualiza el borrador.`,
      pt: `- Se o usuário corrigir um dado já salvo, aceite a correção e atualize o rascunho.`,
      en: `- If the user corrects a stored value, accept the correction and update the draft.`,
    })
  );
  rules.push(
    byLang(lang, {
      es: `- Nunca inventes disponibilidad ni precios; limita tus respuestas a datos provistos por el sistema o el usuario.`,
      pt: `- Nunca invente disponibilidade nem preços; limite-se aos dados fornecidos pelo sistema ou pelo usuário.`,
      en: `- Never fabricate availability or prices; limit your answers to data provided by the system or the user.`,
    })
  );

  return rules;
}

export async function buildSystemInstruction(opts: {
  promptKey: string;
  lang?: string; // default "es"
  state?: ConversationState;
  hotelId?: string;
}) {
  const lang = (opts.lang || opts.state?.locale || "es").toLowerCase();

  // Reglas dinámicas según estado/idioma
  const dynamicRules = buildDynamicRules(lang, opts.state);

  const pb = await getLatestPlaybook({ promptKey: opts.promptKey, langIso1: lang });

  if (!pb) {
    // Fallback sin playbook pero con reglas dinámicas
    return [
      byLang(lang, {
        es: `Eres un recepcionista experto. Idioma=${lang}.`,
        pt: `Você é um recepcionista experiente. Idioma=${lang}.`,
        en: `You are an experienced front-desk agent. Language=${lang}.`,
      }),
      byLang(lang, {
        es: `- Si faltan playbooks, actúa con sentido común.`,
        pt: `- Se faltarem playbooks, aja com bom senso.`,
        en: `- If playbooks are missing, act with common sense.`,
      }),
      byLang(lang, {
        es: `- Si hay borrador activo, continúa completándolo; confirma solo con datos completos.`,
        pt: `- Se houver rascunho ativo, continue completando; confirme apenas com dados completos.`,
        en: `- If a draft exists, continue completing it; confirm only with complete data.`,
      }),
      byLang(lang, {
        es: `- Para modificaciones de reservas confirmadas, solicita el código y NO derives al hotel: sigue el flujo de modificación tú mismo.`,
        pt: `- Para alterações de reservas confirmadas, solicite o código e NÃO encaminhe ao hotel: siga o fluxo de alteração você mesmo.`,
        en: `- For modifications of confirmed bookings, request the code and DO NOT refer to the hotel: follow the modification flow yourself.`,
      }),
      byLang(lang, {
        es: `- Si hay ambigüedad:  repreguntas y luego opciones claras.`,
        pt: `- Se houver ambiguidade:  reperguntas e depois opções claras.`,
        en: `- If ambiguous: ask  clarifying questions, then present clear options.`,
      }),
      ``,
      `[[REGLAS_DINAMICAS]]`,
      ...dynamicRules,
    ].join("\n");
  }

  const s = opts.state;
  const facts: string[] = [];
  if (s?.draft) {
    facts.push(
      `borrador_activo=si`,
      `borrador.guestName=${s.draft.guestName ?? "-"}`,
      `borrador.roomType=${s.draft.roomType ?? "-"}`,
      `borrador.checkIn=${s.draft.checkIn ?? "-"}`,
      `borrador.checkOut=${s.draft.checkOut ?? "-"}`,
      `borrador.numGuests=${s.draft.numGuests ?? "-"}`
    );
  } else {
    facts.push(`borrador_activo=no`);
  }
  if (s?.confirmedBooking?.code) {
    facts.push(`reserva_confirmada=si`, `reserva.code=${s.confirmedBooking.code}`);
  } else {
    facts.push(`reserva_confirmada=no`);
  }
  if (opts.hotelId) facts.push(`hotelId=${opts.hotelId}`);
  facts.push(`lang=${lang}`);

  return [
    `[[PLAYBOOK ${pb.promptKey} ${pb.version} (${pb.langIso1})]]`,
    pb.text?.trim() ?? "",
    ``,
    `[[CONTEXTO_DE_ESTADO]]`,
    facts.map((f) => `- ${f}`).join("\n"),
    ``,
    `[[REGLAS]]`,
    `- Nunca confirmes/canceles/modifiques sin la confirmación que el playbook exige.`,
    `- Si el usuario solicita modificar una reserva, NO derives al hotel: sigue el flujo de modificación tú mismo según el playbook (pide código si es confirmada, modifica directo si es borrador).`,
    `- Si hay ambigüedad y no alcanza con 1–2 repreguntas, ofrece opciones claras.`,
    ``,
    `[[REGLAS_DINAMICAS]]`,
    ...dynamicRules,
  ].join("\n");
}
