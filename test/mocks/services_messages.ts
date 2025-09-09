// Path: /root/begasist/test/mocks/services_messages.ts

// Devolvemos una lista estable (orden asc por timestamp) para que el test
// pueda asertar m1, m2 sin depender de DB real.
export async function getMessagesByConversationService(..._args: any[]) {
  const [firstTs, secondTs] = [
    "2024-01-01T00:00:00.000Z",
    "2024-01-01T00:00:01.000Z",
  ];
  return [
    {
      messageId: "m1",
      hotelId: "hotel999",
      conversationId: "conv-list",
      channel: "web",
      content: "a",
      timestamp: firstTs,
    },
    {
      messageId: "m2",
      hotelId: "hotel999",
      conversationId: "conv-list",
      channel: "web",
      content: "b",
      timestamp: secondTs,
    },
  ];
}
