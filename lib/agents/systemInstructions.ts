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

export async function buildSystemInstruction(opts: {
  promptKey: string;
  lang?: string; // default "es"
  state?: ConversationState;
  hotelId?: string;
}) {
  const lang = opts.lang || "es";
  const pb = await getLatestPlaybook({ promptKey: opts.promptKey, langIso1: lang });

  if (!pb) {
    return `Eres un recepcionista experto. Idioma=${lang}.
- Si faltan playbooks, actúa con sentido común.
- Si hay borrador activo, continúa completándolo; confirma solo con datos completos.
- Para modificaciones de reservas confirmadas, solicita código.
- Si hay ambigüedad: 1–2 repreguntas y luego opciones claras.`;
  }

  const s = opts.state;
  const facts: string[] = [];
  if (s?.draft) {
    facts.push(
      `borrador_activo=si`,
      `borrador.guestName=${s.draft.guestName ?? "-"}`,
      `borrador.roomType=${s.draft.roomType ?? "-"}`,
      `borrador.checkIn=${s.draft.checkIn ?? "-"}`,
      `borrador.checkOut=${s.draft.checkOut ?? "-"}`
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
    `- Si hay ambigüedad y no alcanza con 1–2 repreguntas, ofrece opciones claras.`,
  ].join("\n");
}
