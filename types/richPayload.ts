import type { RichResponse } from "@/types/richResponse";

export type LegacyRichPayload = {
  type:
    | "quick-actions"
    | "dates"
    | "guests"
    | "room-cards"
    | "upsell"
    | "handoff"
    | "room-info-img";
  data?: any;
};

// Ensure common optional fields exist across union for simpler UI access.
type RichPayloadBase = {
  type?: LegacyRichPayload["type"];
  data?: any;
};

export type RichPayload = LegacyRichPayload | (RichResponse & RichPayloadBase);
