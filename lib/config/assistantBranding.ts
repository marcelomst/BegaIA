export type AssistantBrandingConfig = {
  displayName?: string | null;
  roleLabel?: string | null;
  acknowledgementLabel?: string | null;
};

export type AssistantBrandingStored = {
  displayName?: string;
  roleLabel?: string;
  acknowledgementLabel?: AssistantAcknowledgementLabel;
};

export const ASSISTANT_ACKNOWLEDGEMENT_OPTIONS = [
  "Encantado",
  "Encantada",
  "Un gusto",
] as const;

export type AssistantAcknowledgementLabel =
  typeof ASSISTANT_ACKNOWLEDGEMENT_OPTIONS[number];

export const ASSISTANT_BRANDING_LIMITS = {
  displayName: 60,
  roleLabel: 120,
} as const;

export const DEFAULT_ASSISTANT_BRANDING = {
  displayName: "BegaIA",
  roleLabel: "el asistente hotelero digital",
  acknowledgementLabel: "Encantado",
} as const;

export function resolveAssistantBranding(branding?: AssistantBrandingConfig | null) {
  const rawDisplayName = typeof branding?.displayName === "string" ? branding.displayName.trim() : "";
  const rawRoleLabel = typeof branding?.roleLabel === "string" ? branding.roleLabel.trim() : "";
  if (!rawDisplayName && !rawRoleLabel) {
    return { ...DEFAULT_ASSISTANT_BRANDING };
  }

  const displayName = rawDisplayName || DEFAULT_ASSISTANT_BRANDING.displayName;
  const roleLabel = rawRoleLabel || DEFAULT_ASSISTANT_BRANDING.roleLabel;
  const rawAcknowledgementLabel = typeof branding?.acknowledgementLabel === "string"
    ? branding.acknowledgementLabel.trim()
    : "";
  const acknowledgementLabel = ASSISTANT_ACKNOWLEDGEMENT_OPTIONS.includes(
    rawAcknowledgementLabel as AssistantAcknowledgementLabel
  )
    ? rawAcknowledgementLabel as AssistantAcknowledgementLabel
    : DEFAULT_ASSISTANT_BRANDING.acknowledgementLabel;
  return { displayName, roleLabel, acknowledgementLabel };
}

export function normalizeAssistantBrandingInput(raw: AssistantBrandingConfig | null | undefined): {
  error?:
    | "assistant_branding_display_name_too_long"
    | "assistant_branding_role_label_too_long"
    | "assistant_branding_acknowledgement_label_invalid";
  value?: AssistantBrandingStored | null;
} {
  if (raw == null) return { value: undefined };

  const displayName = typeof raw.displayName === "string" ? raw.displayName.trim() : "";
  const roleLabel = typeof raw.roleLabel === "string" ? raw.roleLabel.trim() : "";
  const acknowledgementLabel = typeof raw.acknowledgementLabel === "string"
    ? raw.acknowledgementLabel.trim()
    : "";

  if (displayName.length > ASSISTANT_BRANDING_LIMITS.displayName) {
    return { error: "assistant_branding_display_name_too_long" as const };
  }
  if (roleLabel.length > ASSISTANT_BRANDING_LIMITS.roleLabel) {
    return { error: "assistant_branding_role_label_too_long" as const };
  }
  if (
    acknowledgementLabel &&
    !ASSISTANT_ACKNOWLEDGEMENT_OPTIONS.includes(acknowledgementLabel as AssistantAcknowledgementLabel)
  ) {
    return { error: "assistant_branding_acknowledgement_label_invalid" as const };
  }

  if (!displayName && !roleLabel) {
    return { value: null };
  }

  return {
    value: {
      ...(displayName ? { displayName } : {}),
      ...(roleLabel ? { roleLabel } : {}),
      ...(acknowledgementLabel && acknowledgementLabel !== DEFAULT_ASSISTANT_BRANDING.acknowledgementLabel
        ? { acknowledgementLabel: acknowledgementLabel as AssistantAcknowledgementLabel }
        : {}),
    },
  };
}

export function buildAssistantGreetingNamePrompt(args: {
  lang: "es" | "en" | "pt";
  hotelName?: string | null;
  assistantBranding?: AssistantBrandingConfig | null;
}): string {
  const cleanHotelName = String(args.hotelName || "").trim();
  const { displayName, roleLabel } = resolveAssistantBranding(args.assistantBranding);
  const roleLabelPt = roleLabel === DEFAULT_ASSISTANT_BRANDING.roleLabel
    ? "a assistente hoteleira digital"
    : roleLabel;
  const roleLabelEn = roleLabel === DEFAULT_ASSISTANT_BRANDING.roleLabel
    ? "the digital hospitality assistant"
    : roleLabel;

  if (cleanHotelName) {
    if (args.lang === "pt") return `Olá, sou ${displayName}, ${roleLabelPt} de ${cleanHotelName}. Como você prefere que eu te chame?`;
    if (args.lang === "en") return `Hello, I'm ${displayName}, ${roleLabelEn} for ${cleanHotelName}. What would you like me to call you?`;
    return `Hola, soy ${displayName}, ${roleLabel} de ${cleanHotelName}. ¿Cómo preferís que te llame?`;
  }

  if (args.lang === "pt") return `Olá, sou ${displayName}, ${roleLabelPt} do hotel. Como você prefere que eu te chame?`;
  if (args.lang === "en") return `Hello, I'm ${displayName}, ${roleLabelEn} for the hotel. What would you like me to call you?`;
  return `Hola, soy ${displayName}, ${roleLabel} del hotel. ¿Cómo preferís que te llame?`;
}

export function buildAssistantAcknowledgementReply(args: {
  lang: "es" | "en" | "pt";
  guestDisplayName: string;
  assistantBranding?: AssistantBrandingConfig | null;
}): string {
  if (args.lang === "pt") return `Prazer, ${args.guestDisplayName}. Como posso te ajudar hoje?`;
  if (args.lang === "en") return `Nice to meet you, ${args.guestDisplayName}. How can I help you today?`;
  const { acknowledgementLabel } = resolveAssistantBranding(args.assistantBranding);
  return `${acknowledgementLabel}, ${args.guestDisplayName}. ¿En qué puedo ayudarte hoy?`;
}
