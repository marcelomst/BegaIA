// Path: /root/begasist/test/integration/api_admin_guests_merge.test.ts
import { describe, expect, it } from "vitest";
import { POST as mergeGuestsPOST } from "@/app/api/admin/guests/merge/route";
import { failNextCassandraExecute, getCollection } from "../mocks/astra";

function makeReq(body: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/guests/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("/api/admin/guests/merge (integration)", () => {
  it("mergea aliases y referencias de conversaciones/mensajes al guest primario", async () => {
    const guestCol = getCollection("guests");
    const aliasCol = getCollection("guest_aliases");
    const aliasByGuestCol = getCollection("guest_aliases_by_guest");
    const convCol = getCollection("conversations");
    const msgCol = getCollection("messages");

    await guestCol.insertOne({
      guestId: "guest-primary-1",
      hotelId: "hotel999",
      createdAt: "2026-03-09T10:00:00.000Z",
      updatedAt: "2026-03-09T10:00:00.000Z",
      mode: "automatic",
      aliases: ["whatsapp:+59811111111"],
    });
    await guestCol.insertOne({
      guestId: "guest-secondary-1",
      hotelId: "hotel999",
      createdAt: "2026-03-09T10:01:00.000Z",
      updatedAt: "2026-03-09T10:01:00.000Z",
      mode: "automatic",
      aliases: ["web:session_xyz"],
    });

    await aliasCol.insertOne({
      hotelid: "hotel999",
      alias: "whatsapp:+59811111111",
      guestid: "guest-primary-1",
      createdat: "2026-03-09T10:00:00.000Z",
    });
    await aliasByGuestCol.insertOne({
      hotelid: "hotel999",
      guestid: "guest-primary-1",
      alias: "whatsapp:+59811111111",
      createdat: "2026-03-09T10:00:00.000Z",
    });

    await aliasCol.insertOne({
      hotelid: "hotel999",
      alias: "web:session_xyz",
      guestid: "guest-secondary-1",
      createdat: "2026-03-09T10:01:00.000Z",
    });
    await aliasByGuestCol.insertOne({
      hotelid: "hotel999",
      guestid: "guest-secondary-1",
      alias: "web:session_xyz",
      createdat: "2026-03-09T10:01:00.000Z",
    });

    await convCol.insertOne({
      conversationId: "conv-merge-1",
      hotelId: "hotel999",
      guestId: "guest-secondary-1",
      channel: "web",
      startedAt: "2026-03-09T10:02:00.000Z",
      lastUpdatedAt: "2026-03-09T10:02:00.000Z",
      lang: "es",
      status: "active",
      metadata: {
        source: "web-widget",
        untouched: true,
      },
    });
    await convCol.insertOne({
      conversationId: "conv-merge-2",
      hotelId: "hotel999",
      guestId: "guest-secondary-1",
      channel: "email",
      startedAt: "2026-03-09T10:04:00.000Z",
      lastUpdatedAt: "2026-03-09T10:04:00.000Z",
      lang: "es",
      status: "active",
      metadata: {
        source: "email",
      },
    });
    await msgCol.insertOne({
      _id: "msg-merge-1",
      messageId: "msg-merge-1",
      hotelId: "hotel999",
      guestId: "guest-secondary-1",
      conversationId: "conv-merge-1",
      channel: "web",
      role: "user",
      content: "hola",
      timestamp: "2026-03-09T10:02:10.000Z",
    });
    await msgCol.insertOne({
      _id: "msg-merge-2",
      messageId: "msg-merge-2",
      hotelId: "hotel999",
      guestId: "guest-secondary-1",
      conversationId: "conv-merge-2",
      channel: "email",
      role: "user",
      content: "hola por email",
      timestamp: "2026-03-09T10:04:10.000Z",
    });

    const r = await mergeGuestsPOST(
      makeReq({
        hotelId: "hotel999",
        primaryGuestId: "guest-primary-1",
        secondaryGuestId: "guest-secondary-1",
        mergedBy: "qa@begasist",
      }),
    );

    expect(r.ok).toBe(true);
    const json = await r.json();
    expect(json.ok).toBe(true);
    expect(json.result.primaryGuestId).toBe("guest-primary-1");
    expect(json.result.secondaryGuestId).toBe("guest-secondary-1");
    expect(json.result.movedAliases).toBe(1);
    expect(json.result.updatedConversations).toBe(2);
    expect(json.result.updatedMessages).toBe(2);

    const aliasMoved = await aliasCol.findOne({
      hotelid: "hotel999",
      alias: "web:session_xyz",
    });
    expect(aliasMoved?.guestid).toBe("guest-primary-1");
    const reverseForPrimary = await aliasByGuestCol.findOne({
      hotelid: "hotel999",
      guestid: "guest-primary-1",
      alias: "web:session_xyz",
    });
    expect(reverseForPrimary).toBeNull();
    const reverseForSecondary = await aliasByGuestCol.findOne({
      hotelid: "hotel999",
      guestid: "guest-secondary-1",
      alias: "web:session_xyz",
    });
    expect(reverseForSecondary).toBeTruthy();

    const convMoved = await convCol.findOne({ conversationId: "conv-merge-1" });
    expect(convMoved?.guestId).toBe("guest-primary-1");
    expect(convMoved?.metadata).toEqual(
      expect.objectContaining({
        source: "web-widget",
        untouched: true,
        guestMerge: {
          mergedAt: expect.any(String),
          mergedBy: "qa@begasist",
          fromGuestId: "guest-secondary-1",
          toGuestId: "guest-primary-1",
        },
      }),
    );

    const secondConvMoved = await convCol.findOne({ conversationId: "conv-merge-2" });
    expect(secondConvMoved?.guestId).toBe("guest-primary-1");
    expect(secondConvMoved?.metadata).toEqual(
      expect.objectContaining({
        source: "email",
        guestMerge: expect.objectContaining({
          fromGuestId: "guest-secondary-1",
          toGuestId: "guest-primary-1",
        }),
      }),
    );

    const msgMoved = await msgCol.findOne({ _id: "msg-merge-1" });
    expect(msgMoved?.guestId).toBe("guest-primary-1");
    const secondMsgMoved = await msgCol.findOne({ _id: "msg-merge-2" });
    expect(secondMsgMoved?.guestId).toBe("guest-primary-1");

    const primaryGuest = await guestCol.findOne({
      hotelId: "hotel999",
      guestId: "guest-primary-1",
    });
    expect(primaryGuest?.mergedIds).toEqual(expect.arrayContaining(["guest-secondary-1"]));
    expect(primaryGuest?.aliases.filter((alias: string) => alias === "web:session_xyz")).toHaveLength(1);

    const secondaryGuest = await guestCol.findOne({
      hotelId: "hotel999",
      guestId: "guest-secondary-1",
    });
    const tags = Array.isArray(secondaryGuest?.tags) ? secondaryGuest.tags : [];
    expect(tags).toEqual(expect.arrayContaining(["merged", "merged-into:guest-primary-1"]));
  });

  it("tolera guests derivados desde conversations creando registros mínimos para consolidar", async () => {
    const guestCol = getCollection("guests");
    const convCol = getCollection("conversations");
    const msgCol = getCollection("messages");

    await guestCol.insertOne({
      guestId: "guest-primary-derived-1",
      hotelId: "hotel999",
      createdAt: "2026-03-09T11:00:00.000Z",
      updatedAt: "2026-03-09T11:00:00.000Z",
      mode: "automatic",
      aliases: ["email:primary@example.com"],
    });

    await convCol.insertOne({
      conversationId: "conv-derived-1",
      hotelId: "hotel999",
      guestId: "web:session_only",
      channel: "web",
      startedAt: "2026-03-09T11:02:00.000Z",
      lastUpdatedAt: "2026-03-09T11:03:00.000Z",
      lang: "es",
      status: "active",
    });
    await msgCol.insertOne({
      _id: "msg-derived-1",
      messageId: "msg-derived-1",
      hotelId: "hotel999",
      guestId: "web:session_only",
      conversationId: "conv-derived-1",
      channel: "web",
      role: "user",
      content: "hola desde guest derivado",
      timestamp: "2026-03-09T11:03:10.000Z",
    });

    const r = await mergeGuestsPOST(
      makeReq({
        hotelId: "hotel999",
        primaryGuestId: "guest-primary-derived-1",
        secondaryGuestId: "web:session_only",
        mergedBy: "qa@begasist",
      }),
    );

    expect(r.ok).toBe(true);
    const json = await r.json();
    expect(json.ok).toBe(true);
    expect(json.result.primaryGuestId).toBe("guest-primary-derived-1");
    expect(json.result.secondaryGuestId).toBe("web:session_only");

    const convMoved = await convCol.findOne({ conversationId: "conv-derived-1" });
    expect(convMoved?.guestId).toBe("guest-primary-derived-1");

    const msgMoved = await msgCol.findOne({ _id: "msg-derived-1" });
    expect(msgMoved?.guestId).toBe("guest-primary-derived-1");

    const derivedSecondaryGuest = await guestCol.findOne({
      hotelId: "hotel999",
      guestId: "web:session_only",
    });
    expect(derivedSecondaryGuest).toBeTruthy();
    const tags = Array.isArray(derivedSecondaryGuest?.tags) ? derivedSecondaryGuest.tags : [];
    expect(tags).toEqual(expect.arrayContaining(["merged", "merged-into:guest-primary-derived-1"]));

    const primaryGuest = await guestCol.findOne({
      hotelId: "hotel999",
      guestId: "guest-primary-derived-1",
    });
    expect(primaryGuest?.aliases).toEqual(expect.arrayContaining(["web:session_only"]));
  });

  it("preserva name, mode y aliases del guest canónico al consolidar", async () => {
    const guestCol = getCollection("guests");
    const convCol = getCollection("conversations");

    await guestCol.insertOne({
      guestId: "guest-primary-name-1",
      hotelId: "hotel999",
      name: "Marcelo",
      aliases: ["web:guest-primary-name-1"],
      createdAt: "2026-03-09T12:00:00.000Z",
      updatedAt: "2026-03-09T12:00:00.000Z",
      mode: "automatic",
    });
    await guestCol.insertOne({
      guestId: "guest-secondary-name-1",
      hotelId: "hotel999",
      aliases: ["web:guest-secondary-name-1"],
      createdAt: "2026-03-09T12:01:00.000Z",
      updatedAt: "2026-03-09T12:01:00.000Z",
      mode: "automatic",
    });

    await convCol.insertOne({
      conversationId: "conv-name-merge-1",
      hotelId: "hotel999",
      guestId: "guest-secondary-name-1",
      channel: "web",
      startedAt: "2026-03-09T12:02:00.000Z",
      lastUpdatedAt: "2026-03-09T12:03:00.000Z",
      lang: "es",
      status: "active",
    });

    const r = await mergeGuestsPOST(
      makeReq({
        hotelId: "hotel999",
        primaryGuestId: "guest-primary-name-1",
        secondaryGuestId: "guest-secondary-name-1",
        mergedBy: "qa@begasist",
      }),
    );

    expect(r.ok).toBe(true);

    const primaryGuest = await guestCol.findOne({
      hotelId: "hotel999",
      guestId: "guest-primary-name-1",
    });
    expect(primaryGuest?.name).toBe("Marcelo");
    expect(primaryGuest?.mode).toBe("automatic");
    expect(primaryGuest?.aliases).toEqual(
      expect.arrayContaining(["web:guest-primary-name-1", "web:guest-secondary-name-1"]),
    );
  });

  it("preserva aliases que existen solo en la tabla inversa del secondary", async () => {
    const guestCol = getCollection("guests");
    const aliasCol = getCollection("guest_aliases");
    const aliasByGuestCol = getCollection("guest_aliases_by_guest");

    await guestCol.insertOne({
      guestId: "guest-primary-reverse-only-1",
      hotelId: "hotel999",
      createdAt: "2026-03-09T12:10:00.000Z",
      updatedAt: "2026-03-09T12:10:00.000Z",
      mode: "automatic",
      aliases: [],
    });
    await guestCol.insertOne({
      guestId: "guest-secondary-reverse-only-1",
      hotelId: "hotel999",
      createdAt: "2026-03-09T12:11:00.000Z",
      updatedAt: "2026-03-09T12:11:00.000Z",
      mode: "automatic",
      aliases: [],
    });
    await aliasByGuestCol.insertOne({
      hotelid: "hotel999",
      guestid: "guest-secondary-reverse-only-1",
      alias: "email:reverse-only@example.com",
      createdat: "2026-03-09T12:11:00.000Z",
    });

    const r = await mergeGuestsPOST(
      makeReq({
        hotelId: "hotel999",
        primaryGuestId: "guest-primary-reverse-only-1",
        secondaryGuestId: "guest-secondary-reverse-only-1",
        mergedBy: "qa@begasist",
      }),
    );

    expect(r.ok).toBe(true);
    const json = await r.json();
    expect(json.result.movedAliases).toBe(1);

    const canonical = await aliasCol.findOne({
      hotelid: "hotel999",
      alias: "email:reverse-only@example.com",
    });
    expect(canonical?.guestid).toBe("guest-primary-reverse-only-1");

    const reverseForPrimary = await aliasByGuestCol.findOne({
      hotelid: "hotel999",
      guestid: "guest-primary-reverse-only-1",
      alias: "email:reverse-only@example.com",
    });
    expect(reverseForPrimary).toBeNull();

    const primaryGuest = await guestCol.findOne({
      hotelId: "hotel999",
      guestId: "guest-primary-reverse-only-1",
    });
    expect(primaryGuest?.aliases).toEqual(expect.arrayContaining(["email:reverse-only@example.com"]));
  });

  it("bloquea el merge si falla la escritura canónica del alias", async () => {
    const guestCol = getCollection("guests");
    const aliasCol = getCollection("guest_aliases");
    const aliasByGuestCol = getCollection("guest_aliases_by_guest");

    await guestCol.insertOne({
      guestId: "guest-primary-canonical-fail-1",
      hotelId: "hotel999",
      createdAt: "2026-03-09T12:20:00.000Z",
      updatedAt: "2026-03-09T12:20:00.000Z",
      mode: "automatic",
      aliases: [],
    });
    await guestCol.insertOne({
      guestId: "guest-secondary-canonical-fail-1",
      hotelId: "hotel999",
      createdAt: "2026-03-09T12:21:00.000Z",
      updatedAt: "2026-03-09T12:21:00.000Z",
      mode: "automatic",
      aliases: ["web:canonical-fail"],
    });
    await aliasByGuestCol.insertOne({
      hotelid: "hotel999",
      guestid: "guest-secondary-canonical-fail-1",
      alias: "web:canonical-fail",
      createdat: "2026-03-09T12:21:00.000Z",
    });
    failNextCassandraExecute("insert_guest_aliases", "canonical alias write failed");

    const response = await mergeGuestsPOST(
      makeReq({
        hotelId: "hotel999",
        primaryGuestId: "guest-primary-canonical-fail-1",
        secondaryGuestId: "guest-secondary-canonical-fail-1",
        mergedBy: "qa@begasist",
      }),
    );

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "canonical alias write failed" });
    await expect(
      aliasCol.findOne({
        hotelid: "hotel999",
        alias: "web:canonical-fail",
      }),
    ).resolves.toBeNull();
  });

  it("no ejecuta proyecciones inversas en el camino síncrono del merge", async () => {
    const guestCol = getCollection("guests");
    const aliasCol = getCollection("guest_aliases");
    const aliasByGuestCol = getCollection("guest_aliases_by_guest");

    await guestCol.insertOne({
      guestId: "guest-primary-projection-fail-1",
      hotelId: "hotel999",
      createdAt: "2026-03-09T12:30:00.000Z",
      updatedAt: "2026-03-09T12:30:00.000Z",
      mode: "automatic",
      aliases: [],
    });
    await guestCol.insertOne({
      guestId: "guest-secondary-projection-fail-1",
      hotelId: "hotel999",
      createdAt: "2026-03-09T12:31:00.000Z",
      updatedAt: "2026-03-09T12:31:00.000Z",
      mode: "automatic",
      aliases: ["web:projection-fail"],
    });
    await aliasByGuestCol.insertOne({
      hotelid: "hotel999",
      guestid: "guest-secondary-projection-fail-1",
      alias: "web:projection-fail",
      createdat: "2026-03-09T12:31:00.000Z",
    });
    failNextCassandraExecute("insert_guest_aliases_by_guest", "primary reverse insert would fail");
    failNextCassandraExecute("delete_guest_aliases_by_guest", "secondary reverse delete would fail");

    const response = await mergeGuestsPOST(
      makeReq({
        hotelId: "hotel999",
        primaryGuestId: "guest-primary-projection-fail-1",
        secondaryGuestId: "guest-secondary-projection-fail-1",
        mergedBy: "qa@begasist",
      }),
    );

    expect(response.ok).toBe(true);
    const canonical = await aliasCol.findOne({
      hotelid: "hotel999",
      alias: "web:projection-fail",
    });
    expect(canonical?.guestid).toBe("guest-primary-projection-fail-1");
    const reverseForSecondary = await aliasByGuestCol.findOne({
      hotelid: "hotel999",
      guestid: "guest-secondary-projection-fail-1",
      alias: "web:projection-fail",
    });
    expect(reverseForSecondary).toBeTruthy();

    const reverseForPrimary = await aliasByGuestCol.findOne({
      hotelid: "hotel999",
      guestid: "guest-primary-projection-fail-1",
      alias: "web:projection-fail",
    });
    expect(reverseForPrimary).toBeNull();
  });

  it("soporta dos merges consecutivos aunque guest_aliases_by_guest del primary esté incompleta", async () => {
    const guestCol = getCollection("guests");
    const aliasCol = getCollection("guest_aliases");
    const aliasByGuestCol = getCollection("guest_aliases_by_guest");
    const convCol = getCollection("conversations");
    const msgCol = getCollection("messages");

    await guestCol.insertOne({
      guestId: "guest-demo-web-1",
      hotelId: "hotel999",
      aliases: ["web:demo-session-1"],
      createdAt: "2026-03-09T12:40:00.000Z",
      updatedAt: "2026-03-09T12:40:00.000Z",
      mode: "automatic",
    });
    await guestCol.insertOne({
      guestId: "guest-demo-wa-1",
      hotelId: "hotel999",
      aliases: ["whatsapp:+59899999999"],
      createdAt: "2026-03-09T12:41:00.000Z",
      updatedAt: "2026-03-09T12:41:00.000Z",
      mode: "automatic",
    });
    await guestCol.insertOne({
      guestId: "guest-demo-email-1",
      hotelId: "hotel999",
      aliases: ["email:demo@example.com"],
      createdAt: "2026-03-09T12:42:00.000Z",
      updatedAt: "2026-03-09T12:42:00.000Z",
      mode: "automatic",
    });

    for (const [alias, guestid] of [
      ["web:demo-session-1", "guest-demo-web-1"],
      ["whatsapp:+59899999999", "guest-demo-wa-1"],
      ["email:demo@example.com", "guest-demo-email-1"],
    ]) {
      await aliasCol.insertOne({ hotelid: "hotel999", alias, guestid, createdat: "2026-03-09T12:40:00.000Z" });
      await aliasByGuestCol.insertOne({ hotelid: "hotel999", guestid, alias, createdat: "2026-03-09T12:40:00.000Z" });
      await convCol.insertOne({
        conversationId: `conv-${guestid}`,
        hotelId: "hotel999",
        guestId: guestid,
        channel: alias.startsWith("email:") ? "email" : alias.startsWith("whatsapp:") ? "whatsapp" : "web",
        startedAt: "2026-03-09T12:45:00.000Z",
        lastUpdatedAt: "2026-03-09T12:45:00.000Z",
        lang: "es",
        status: "active",
      });
      await msgCol.insertOne({
        _id: `msg-${guestid}`,
        messageId: `msg-${guestid}`,
        hotelId: "hotel999",
        guestId: guestid,
        conversationId: `conv-${guestid}`,
        channel: alias.startsWith("email:") ? "email" : alias.startsWith("whatsapp:") ? "whatsapp" : "web",
        role: "user",
        content: "hola",
        timestamp: "2026-03-09T12:45:01.000Z",
      });
    }

    const first = await mergeGuestsPOST(
      makeReq({
        hotelId: "hotel999",
        primaryGuestId: "guest-demo-web-1",
        secondaryGuestId: "guest-demo-wa-1",
        mergedBy: "qa@begasist",
      }),
    );
    expect(first.ok).toBe(true);

    await expect(
      aliasByGuestCol.findOne({
        hotelid: "hotel999",
        guestid: "guest-demo-web-1",
        alias: "whatsapp:+59899999999",
      }),
    ).resolves.toBeNull();

    const second = await mergeGuestsPOST(
      makeReq({
        hotelId: "hotel999",
        primaryGuestId: "guest-demo-web-1",
        secondaryGuestId: "guest-demo-email-1",
        mergedBy: "qa@begasist",
      }),
    );
    expect(second.ok).toBe(true);

    const primaryGuest = await guestCol.findOne({
      hotelId: "hotel999",
      guestId: "guest-demo-web-1",
    });
    expect(primaryGuest?.aliases).toEqual(
      expect.arrayContaining(["web:demo-session-1", "whatsapp:+59899999999", "email:demo@example.com"]),
    );

    await expect(aliasCol.findOne({ hotelid: "hotel999", alias: "whatsapp:+59899999999" }))
      .resolves.toEqual(expect.objectContaining({ guestid: "guest-demo-web-1" }));
    await expect(aliasCol.findOne({ hotelid: "hotel999", alias: "email:demo@example.com" }))
      .resolves.toEqual(expect.objectContaining({ guestid: "guest-demo-web-1" }));

    const webConversations = await convCol.findMany({ hotelId: "hotel999", guestId: "guest-demo-web-1" });
    const webMessages = await msgCol.findMany({ hotelId: "hotel999", guestId: "guest-demo-web-1" });
    expect(webConversations).toHaveLength(3);
    expect(webMessages).toHaveLength(3);
  });

  it("bloquea un segundo merge del mismo secondary sin devolver éxito engañoso", async () => {
    const guestCol = getCollection("guests");
    const convCol = getCollection("conversations");

    await guestCol.insertOne({
      guestId: "guest-primary-repeat-1",
      hotelId: "hotel999",
      createdAt: "2026-03-09T13:00:00.000Z",
      updatedAt: "2026-03-09T13:00:00.000Z",
      mode: "automatic",
      aliases: [],
    });
    await guestCol.insertOne({
      guestId: "guest-secondary-repeat-1",
      hotelId: "hotel999",
      createdAt: "2026-03-09T13:01:00.000Z",
      updatedAt: "2026-03-09T13:01:00.000Z",
      mode: "automatic",
      aliases: [],
    });
    await convCol.insertOne({
      conversationId: "conv-repeat-1",
      hotelId: "hotel999",
      guestId: "guest-secondary-repeat-1",
      channel: "web",
      startedAt: "2026-03-09T13:02:00.000Z",
      lastUpdatedAt: "2026-03-09T13:02:00.000Z",
      lang: "es",
      status: "active",
    });

    const first = await mergeGuestsPOST(
      makeReq({
        hotelId: "hotel999",
        primaryGuestId: "guest-primary-repeat-1",
        secondaryGuestId: "guest-secondary-repeat-1",
        mergedBy: "qa@begasist",
      }),
    );
    expect(first.ok).toBe(true);

    const second = await mergeGuestsPOST(
      makeReq({
        hotelId: "hotel999",
        primaryGuestId: "guest-primary-repeat-1",
        secondaryGuestId: "guest-secondary-repeat-1",
        mergedBy: "qa@begasist",
      }),
    );
    expect(second.ok).toBe(false);
    expect(second.status).toBe(500);
    await expect(second.json()).resolves.toEqual({
      error: "secondary guest is already merged",
    });

    const primaryGuest = await guestCol.findOne({
      hotelId: "hotel999",
      guestId: "guest-primary-repeat-1",
    });
    expect(primaryGuest?.mergedIds).toEqual(["guest-secondary-repeat-1"]);
  });

  it("propaga errores de updateMany sin responder ok=true", async () => {
    const guestCol = getCollection("guests");
    const convCol = getCollection("conversations") as any;
    const originalUpdateMany = convCol.updateMany;

    await guestCol.insertOne({
      guestId: "guest-primary-update-error-1",
      hotelId: "hotel999",
      createdAt: "2026-03-09T14:00:00.000Z",
      updatedAt: "2026-03-09T14:00:00.000Z",
      mode: "automatic",
      aliases: [],
    });
    await guestCol.insertOne({
      guestId: "guest-secondary-update-error-1",
      hotelId: "hotel999",
      createdAt: "2026-03-09T14:01:00.000Z",
      updatedAt: "2026-03-09T14:01:00.000Z",
      mode: "automatic",
      aliases: [],
    });

    convCol.updateMany = async () => {
      throw new Error("updateMany failed");
    };

    try {
      const response = await mergeGuestsPOST(
        makeReq({
          hotelId: "hotel999",
          primaryGuestId: "guest-primary-update-error-1",
          secondaryGuestId: "guest-secondary-update-error-1",
          mergedBy: "qa@begasist",
        }),
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({ error: "updateMany failed" });
    } finally {
      convCol.updateMany = originalUpdateMany;
    }
  });
});
