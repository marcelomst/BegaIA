export function hasReservationAvailabilitySignal(s: string) {
  const t = (s || "").toLowerCase();
  return /\b(reserv\w*|booking|book|disponibil\w*|availability|habitaci[oó]n|room|quarto|check[ -]?in|check[ -]?out|hu[eé]sped(?:es)?|guest(?:s)?|adulto(?:s)?|adult)\b/.test(
    t,
  );
}

export function wantsEvents(s: string) {
  const t = (s || "").toLowerCase();
  if (hasReservationAvailabilitySignal(t)) return false;
  const keys = [
    "evento",
    "eventos",
    "agenda",
    "hoy",
    "mañana",
    "manana",
    "esta noche",
    "fin de semana",
    "este fin de semana",
    "evento turistico",
    "evento turístico",
    "eventos turisticos",
    "eventos turísticos",
    "event",
    "events",
    "tourist event",
    "tourist events",
    "today",
    "tomorrow",
    "tonight",
    "weekend",
    "this weekend",
    "hoje",
    "amanhã",
    "amanha",
    "esta noite",
    "fim de semana",
    "este fim de semana",
    "evento turistico",
    "eventos turisticos",
  ];
  return keys.some((k) => t.includes(k));
}

export function hasEventFollowupCue(s: string) {
  const t = (s || "").toLowerCase();
  if (!t) return false;
  if (/\b(evento|eventos|agenda|concierto|recital|festival|feria|show|teatro|exposicion|exposición)\b/.test(t)) return true;
  if (/\b(foto|fotos|imagen|imagenes|imágenes|photos|pics)\b/.test(t)) return true;
  if (/\b(hoy|mañana|manana|esta noche|fin de semana|este fin de semana|proxima semana|próxima semana|weekend|this weekend|next week)\b/.test(t)) return true;
  return false;
}

export function hasStrongNonEventIntent(
  s: string,
  regexes?: {
    support?: RegExp;
    billing?: RegExp;
    transport?: RegExp;
    breakfast?: RegExp;
    amenities?: RegExp;
  },
) {
  const t = (s || "").toLowerCase();
  if (!t) return false;
  if (
    regexes?.support?.test(t) ||
    regexes?.billing?.test(t) ||
    regexes?.transport?.test(t) ||
    regexes?.breakfast?.test(t) ||
    regexes?.amenities?.test(t)
  ) {
    return true;
  }
  if (/\b(contacto|contactar|telefono|teléfono|whatsapp|email|correo|soporte|ayuda|recepcion|recepción|guardia|guardia nocturna|horario|atencion|atención)\b/.test(t)) {
    return true;
  }
  return false;
}

export function isSeasonalQuery(s: string) {
  const t = (s || "").toLowerCase();
  return /\b(este mes|temporada|verano|invierno|otoño|oton(o)?|primavera|this month|season|summer|winter|fall|spring|este mês|neste mês|estação|verao|verão|inverno|outono|primavera)\b/.test(
    t,
  );
}

export function hasExplicitAgendaSignal(s: string) {
  const t = (s || "").toLowerCase();
  return /\b(evento(s)?|agenda|calendario|calendar|event calendar|concierto(s)?|recital(es)?|festival(es)?|feria(s)?|show(s)?|teatro|exposici[oó]n(es)?|carnaval|muestra(s)?)\b/.test(
    t,
  );
}

export function wantsThingsToDo(s: string) {
  const t = (s || "").toLowerCase();
  const keys = [
    "que hacer",
    "qué hacer",
    "que se puede hacer",
    "planes",
    "plan",
    "diversion",
    "diversión",
    "actividades",
    "recomendas",
    "recomendás",
    "lugares para ir",
    "salir de noche",
    "que hay",
    "what to do",
    "things to do",
    "plans",
    "activities",
    "nightlife",
    "o que fazer",
    "planos",
    "atividades",
    "vida noturna",
  ];
  return keys.some((k) => t.includes(k));
}

export function wantsImages(s: string) {
  const t = (s || "").toLowerCase();
  return /\b(imagenes|imágenes|fotos|con\s+imagenes|con\s+imágenes|con\s+fotos|images|photos|pictures|pics|with\s+images|with\s+photos|with\s+pictures|with\s+pics|imagens|com\s+imagens|com\s+fotos)\b/.test(
    t,
  );
}

export function wantsChannelManager(s: string) {
  const t = (s || "").toLowerCase();
  if (!t) return false;
  return /\b(canal|canales|channel|channels|por que canal|por qué canal|v[ií]a de contacto|contactar por|escribir por|fuera de horario|out of hours|canal recomendado)\b/.test(
    t,
  );
}
