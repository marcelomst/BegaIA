// Path: /root/begasist/lib/db/convState.ts
import { getAstraDB } from "@/lib/astra/connection";

export type ReservationSlots = {
  guestName?: string;
  roomType?: string;
  checkIn?: string;  // YYYY-MM-DD
  checkOut?: string; // YYYY-MM-DD
  numGuests?: number | string;
};

export type ConversationFlowState = {
  hotelId: string;
  conversationId: string;
  activeFlow?: "reservation" | "cancel_reservation" | null;
  reservationSlots?: ReservationSlots;
  lastCategory?: string | null;
  updatedAt: string;
};

const COLLECTION = "conv_state";

function col() {
  return getAstraDB().collection<ConversationFlowState & { _id: string }>(COLLECTION);
}

function key(hotelId: string, conversationId: string) {
  return `${hotelId}:${conversationId}`;
}

export async function getConvState(
  hotelId: string,
  conversationId: string
): Promise<ConversationFlowState | null> {
  const doc = await col().findOne({ _id: key(hotelId, conversationId) });
  return doc ?? null;
}

export async function upsertConvState(
  hotelId: string,
  conversationId: string,
  patch: Partial<ConversationFlowState>
) {
  const _id = key(hotelId, conversationId);
  const now = new Date().toISOString();
  await col().updateOne(
    { _id },
    {
      $set: {
        _id,
        hotelId,
        conversationId,
        updatedAt: now,
        ...patch,
      },
    },
    { upsert: true }
  );
}
