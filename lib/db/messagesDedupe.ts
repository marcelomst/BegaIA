// Path: /root/begasist/lib/db/messagesDedupe.ts
import { getAstraDB } from "@/lib/astra/connection";

type MessageDedupeDoc = {
  hotelId?: string;
  channel?: string;
  direction?: string;
  sourceMsgId?: string;
};

export async function hasInboundMessageBySourceMsgId(input: {
  hotelId: string;
  channel: "whatsapp";
  sourceMsgId: string;
}): Promise<boolean> {
  const hotelId = String(input.hotelId || "").trim();
  const sourceMsgId = String(input.sourceMsgId || "").trim();
  if (!hotelId || !sourceMsgId) return false;

  try {
    const doc = await getAstraDB()
      .collection<MessageDedupeDoc>("messages")
      .findOne({
        hotelId,
        channel: input.channel,
        direction: "in",
        sourceMsgId,
      });
    return Boolean(doc);
  } catch (error) {
    console.warn("[WA_TWILIO_DEDUP_CHECK_FAILED]", {
      hotelId,
      sourceMsgId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
