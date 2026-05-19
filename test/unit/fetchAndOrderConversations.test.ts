import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAllConversationsByChannel } from "@/utils/fetchAndOrderConversations";

describe("fetchAllConversationsByChannel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls admin conversations endpoint with explicit channel filter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          conversations: [
            { conversationId: "conv-older", lastUpdatedAt: "2026-05-18T09:00:00.000Z" },
            { conversationId: "conv-newer", lastUpdatedAt: "2026-05-19T09:00:00.000Z" },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const conversations = await fetchAllConversationsByChannel("hotel999", "email");

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/conversations?hotelId=hotel999&channel=email");
    expect(conversations.map((conv) => conv.conversationId)).toEqual(["conv-newer", "conv-older"]);
  });
});
