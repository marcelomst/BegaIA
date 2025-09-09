// Path: /root/begasist/lib/db/messageGuards.ts
import { getCassandraSession } from "@/lib/astra/cassandra";

type GuardArgs = {
  hotelId: string;
  conversationId: string;
  sourceMsgId: string;
  direction?: "in" | "out";
  ttlSec?: number; // default 7d
};

// cache de prepared statement (si el bind de TTL funciona)
let preparedOk = true;
let preparedQuery: string | null = null;

/**
 * Reclamá (hotelId, conversationId, direction, sourceMsgId) 1 sola vez (LWT).
 * Devuelve { applied:true } si sos el primero; false si ya existía.
 */
export async function guardOnce({
  hotelId,
  conversationId,
  sourceMsgId,
  direction = "in",
  ttlSec = 7 * 24 * 60 * 60,
}: GuardArgs): Promise<{ applied: boolean }> {
  if (!sourceMsgId) return { applied: true };

  const session = await getCassandraSession();

  // 1) Intento con TTL bind param
  if (preparedOk) {
    try {
      if (!preparedQuery) {
        preparedQuery = `
          INSERT INTO message_guards (
            hotel_id, conversation_id, direction, source_msg_id, created_at
          ) VALUES (?, ?, ?, ?, toTimestamp(now()))
          USING TTL ?
          IF NOT EXISTS
        `;
      }
      const res = await session.execute(preparedQuery, [hotelId, conversationId, direction, sourceMsgId, ttlSec], { prepare: true });
      const applied = typeof res.wasApplied === "function"
        ? res.wasApplied()
        : !!res.rows?.[0]?.["[applied]"];
      return { applied: !!applied };
    } catch (e) {
      // Si el cluster no banca TTL como bind, degradamos a interpolación
      preparedOk = false;
      // cae al plan B
    }
  }

  // 2) Plan B: interpolar TTL literal (sigue siendo LWT)
  const q = `
    INSERT INTO message_guards (
      hotel_id, conversation_id, direction, source_msg_id, created_at
    ) VALUES (?, ?, ?, ?, toTimestamp(now()))
    USING TTL ${Math.max(1, Math.floor(ttlSec))}
    IF NOT EXISTS
  `;
  const res = await session.execute(q, [hotelId, conversationId, direction, sourceMsgId], { prepare: true });
  const applied = typeof res.wasApplied === "function"
    ? res.wasApplied()
    : !!res.rows?.[0]?.["[applied]"];
  return { applied: !!applied };
}

/** Alias específico para entrantes (tu caso actual) */
export async function guardInboundOnce(args: Omit<GuardArgs, "direction">) {
  return guardOnce({ ...args, direction: "in" });
}

/** (Opcional) util de test para limpiar un guard */
export async function clearGuardForTest(hotelId: string, conversationId: string, sourceMsgId: string, direction: "in" | "out" = "in") {
  const session = await getCassandraSession();
  await session.execute(
    `DELETE FROM message_guards WHERE hotel_id=? AND conversation_id=? AND direction=? AND source_msg_id=?`,
    [hotelId, conversationId, direction, sourceMsgId],
    { prepare: true }
  );
}
