export type AssistantBrandingConfig = {
  displayName?: string | null;
  roleLabel?: string | null;
};

export type AssistantBrandingStored = {
  displayName?: string;
  roleLabel?: string;
};

export const ASSISTANT_BRANDING_LIMITS = {
  displayName: 60,
  roleLabel: 120,
} as const;

export const DEFAULT_ASSISTANT_BRANDING = {
  displayName: "BegaIA",
  roleLabel: "el asistente hotelero digital",
} as const;

export function resolveAssistantBranding(branding?: AssistantBrandingConfig | null) {
  const displayName = String(branding?.displayName || DEFAULT_ASSISTANT_BRANDING.displayName).trim()
    || DEFAULT_ASSISTANT_BRANDING.displayName;
  const roleLabel = String(branding?.roleLabel || DEFAULT_ASSISTANT_BRANDING.roleLabel).trim()
    || DEFAULT_ASSISTANT_BRANDING.roleLabel;
  return { displayName, roleLabel };
}

export function normalizeAssistantBrandingInput(raw: AssistantBrandingConfig | null | undefined): {
  error?: "assistant_branding_display_name_too_long" | "assistant_branding_role_label_too_long";
  value?: AssistantBrandingStored | null;
} {
  if (raw == null) return { value: undefined };

  const displayName = typeof raw.displayName === "string" ? raw.displayName.trim() : "";
  const roleLabel = typeof raw.roleLabel === "string" ? raw.roleLabel.trim() : "";

  if (displayName.length > ASSISTANT_BRANDING_LIMITS.displayName) {
    return { error: "assistant_branding_display_name_too_long" as const };
  }
  if (roleLabel.length > ASSISTANT_BRANDING_LIMITS.roleLabel) {
    return { error: "assistant_branding_role_label_too_long" as const };
  }

  if (!displayName && !roleLabel) {
    return { value: null };
  }

  return {
    value: {
      ...(displayName ? { displayName } : {}),
      ...(roleLabel ? { roleLabel } : {}),
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
