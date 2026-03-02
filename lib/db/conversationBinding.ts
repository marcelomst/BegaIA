// Path: /root/begasist/lib/db/conversationBinding.ts
import { getAstraDB } from "@/lib/astra/connection";

type MessageBindingDoc = {
  hotelId?: string;
  channel?: string;
  guestPhone?: string;
  guestId?: string;
  conversationId?: string | null;
  createdAt?: string;
};

export async function getConversationIdByGuestPhone(input: {
  hotelId: string;
  channel: "whatsapp";
  guestPhone: string;
}): Promise<string | null> {
  const hotelId = String(input.hotelId || "").trim();
  const guestPhone = String(input.guestPhone || "").trim();
  if (!hotelId || !guestPhone) return null;

  try {
    const collection = getAstraDB().collection<MessageBindingDoc>("messages");

    // Prefer guestPhone and keep guestId compatibility with current persisted docs.
    const byGuestPhone = await collection.find(
      { hotelId, channel: input.channel, guestPhone },
      { sort: { createdAt: -1 }, limit: 1 },
    );
    const firstByGuestPhone = Array.isArray(byGuestPhone)
      ? byGuestPhone[0]
      : (await byGuestPhone?.toArray?.())?.[0];
    if (firstByGuestPhone?.conversationId) return String(firstByGuestPhone.conversationId);

    const byGuestId = await collection.find(
      { hotelId, channel: input.channel, guestId: guestPhone },
      { sort: { createdAt: -1 }, limit: 1 },
    );
    const firstByGuestId = Array.isArray(byGuestId)
      ? byGuestId[0]
      : (await byGuestId?.toArray?.())?.[0];
    return firstByGuestId?.conversationId ? String(firstByGuestId.conversationId) : null;
  } catch (error) {
    console.warn("[WA_TWILIO_BINDING_FAILED]", {
      hotelId,
      guestPhone,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
