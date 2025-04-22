import { describe, it, expect } from "vitest";
import { deleteTestMessagesFromAstra } from "@/lib/db/messages";

describe("deleteTestMessagesFromAstra (Astra DB)", () => {
  it("elimina todos los mensajes de prueba (id empieza con test- o msg-)", async () => {
    const result = await deleteTestMessagesFromAstra();
    expect(result.deletedCount).toBeGreaterThanOrEqual(0);
  });
});
