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

export type RichPayload = LegacyRichPayload | RichResponse;
