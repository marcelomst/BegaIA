// Path: /root/begasist/lib/services/whatsapp.ts
import type { Message, MessageAck } from "whatsapp-web.js"; // type-only para evitar CJS en runtime
import { whatsappClient as client } from "./whatsappClient";
import qrcode from "qrcode-terminal";

import { parseWhatsAppToChannelMessage } from "@/lib/parsers/whatsappParser";
import { universalChannelEventHandler } from "@/lib/handlers/universalChannelEventHandler";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import {
  getMessages,                 // para leer mensajes (con límite opcional)
  updateMessageInAstra,        // ya lo usás para updates
  saveMessageIdempotent,       // helper idempotente nuevo (db/messages.ts)
} from "@/lib/db/messages";

import { setQR, clearQR, setWhatsAppState } from "@/lib/services/redis";
import { startChannelHeartbeat } from "@/lib/services/heartbeat";
import { normalizePhone } from "@/lib/config/hotelPhoneMap";
import { shouldIngestWaMessageOnce } from "@/lib/utils/waIdempotency";
import { debugLog } from "@/lib/utils/debugLog";
import { resolveGuestIdentity } from "@/lib/pipeline/resolveGuestIdentity";
import type { ChannelMessage } from "@/types/channel";

// Logs recortados
const preview = (s: string, n = 120) => (s || "").replace(/\s+/g, " ").trim().slice(0, n);

function attachWhatsAppBrowserDiagnostics(hotelId: string) {
  const page = (client as any).pupPage;
  const browser = (client as any).pupBrowser;
  if (!page || (page as any).__begasistDiagnosticsAttached) return;
  (page as any).__begasistDiagnosticsAttached = true;

  console.log(`[whatsapp][diag] browser diagnostics attached hotelId=${hotelId}`);
  page.on("pageerror", (err: Error) => {
    console.error(`[whatsapp][pageerror] hotelId=${hotelId}:`, err?.message || err);
    debugLog("[wa.lifecycle]", { event: "pageerror", hotelId, error: String(err?.message || err) }, "error");
  });
  page.on("requestfailed", (req: any) => {
    const failure = req.failure?.();
    console.warn(`[whatsapp][requestfailed] hotelId=${hotelId} ${req.method?.() || ""} ${req.url?.() || ""}`, failure || "");
    debugLog("[wa.lifecycle]", {
      event: "requestfailed",
      hotelId,
      url: String(req.url?.() || ""),
      error: String(failure?.errorText || ""),
    }, "warn");
  });
  page.on("console", (msg: any) => {
    const type = String(msg.type?.() || "log");
    if (!["error", "warning"].includes(type)) return;
    console.warn(`[whatsapp][browser:${type}] hotelId=${hotelId}: ${msg.text?.() || ""}`);
  });
  browser?.on?.("disconnected", () => {
    console.warn(`[whatsapp][browser] disconnected hotelId=${hotelId}`);
    debugLog("[wa.lifecycle]", { event: "browser_disconnected", hotelId }, "warn");
  });
}

async function dumpWhatsAppPageState(hotelId: string, reason: string) {
  try {
    const page = (client as any).pupPage;
    if (!page) return;
    const state = await page.evaluate(() => ({
      href: location.href,
      readyState: document.readyState,
      title: document.title,
      hasStore: typeof (window as any).Store !== "undefined",
      hasWWebJS: typeof (window as any).WWebJS !== "undefined",
      hasAuthStore: typeof (window as any).AuthStore !== "undefined",
      debugVersion: (window as any).Debug?.VERSION || null,
      appState: (window as any).AuthStore?.AppState?.state || null,
      hasSynced: (window as any).AuthStore?.AppState?.hasSynced || null,
    }));
    console.log(`[whatsapp][diag] state hotelId=${hotelId} reason=${reason}`, state);
    debugLog("[wa.lifecycle]", { event: "page_state", hotelId, reason, state });
  } catch (err) {
    console.warn(`[whatsapp][diag] state failed hotelId=${hotelId} reason=${reason}:`, err);
  }
}

/**
 * Nota: el control de grupos ahora es por hotel desde hotel_config.channelConfigs.whatsapp.ignoreGroups
 * (por defecto true si no está definido).
 */
export function startWhatsAppBot({
  hotelId,
  hotelPhone,
}: {
  hotelId: string;
  hotelPhone?: string;
}) {
  if (!hotelId) {
    console.warn("⚠️ [whatsapp] startWhatsAppBot llamado sin hotelId. Abortando init.");
    return;
  }

  // Evitar múltiples inicializaciones en dev/hot-reload
  const INIT_KEY = "__WA_INIT__";
  const POLLER_KEY = "__WA_POLLERS__" as const;
  type PollerMap = Record<string, NodeJS.Timeout>;

  // @ts-ignore - attach to global for dev
  if (!(globalThis as any)[POLLER_KEY]) (globalThis as any)[POLLER_KEY] = {};

  function ensureSinglePoller(hid: string, create: () => NodeJS.Timeout) {
    const map = (globalThis as any)[POLLER_KEY] as PollerMap;
    if (!map[hid]) map[hid] = create();
  }
  function clearPoller(hid: string) {
    const map = (globalThis as any)[POLLER_KEY] as PollerMap;
    if (map[hid]) {
      clearInterval(map[hid]);
      delete map[hid];
    }
  }

  // @ts-ignore
  if ((globalThis as any)[INIT_KEY]?.[hotelId]) {
    console.log(`↪️ [whatsapp] Ya inicializado para hotelId=${hotelId}, evitando doble init.`);
    return;
  }
  // @ts-ignore
  (globalThis as any)[INIT_KEY] = (globalThis as any)[INIT_KEY] || {};
  // @ts-ignore
  (globalThis as any)[INIT_KEY][hotelId] = true;

  // ───────────────────────────────────────────────────────────────────────────
  // Eventos de ciclo de vida (QR, auth, ready, disconnected)
  // ───────────────────────────────────────────────────────────────────────────
  client.on("qr", async (qr: string) => {
    try {
      console.log(`⚡ [whatsapp] QR generado para hotelId=${hotelId}. Escaneá para conectar:`);
      debugLog("[wa.lifecycle]", { event: "qr", hotelId, qrLen: String(qr || "").length });
      qrcode.generate(qr, { small: true });
      await setQR(hotelId, qr);
      await setWhatsAppState(hotelId, "waiting_qr");
      startChannelHeartbeat("whatsapp", hotelId);
    } catch (err) {
      console.error("⛔ [whatsapp] Error seteando QR/estado:", err);
      debugLog("[wa.lifecycle]", { event: "qr_error", hotelId, error: String((err as any)?.message || err) }, "error");
    }
  });

  client.on("authenticated", () => {
    console.log(`🔐 [whatsapp] authenticated hotelId=${hotelId}`);
    debugLog("[wa.lifecycle]", { event: "authenticated", hotelId });
    attachWhatsAppBrowserDiagnostics(hotelId);
    setTimeout(() => {
      void dumpWhatsAppPageState(hotelId, "authenticated+15s");
    }, 15_000);
    setTimeout(() => {
      void dumpWhatsAppPageState(hotelId, "authenticated+60s");
    }, 60_000);
  });

  client.on("loading_screen", (percent: number, message: string) => {
    console.log(`⏳ [whatsapp] loading_screen hotelId=${hotelId} ${percent}% ${message || ""}`.trim());
    debugLog("[wa.lifecycle]", { event: "loading_screen", hotelId, percent, message: message || "" });
  });

  client.on("change_state", (state: string) => {
    console.log(`🔄 [whatsapp] change_state hotelId=${hotelId} state=${state}`);
    debugLog("[wa.lifecycle]", { event: "change_state", hotelId, state });
  });

  client.on("remote_session_saved", () => {
    console.log(`💾 [whatsapp] remote_session_saved hotelId=${hotelId}`);
    debugLog("[wa.lifecycle]", { event: "remote_session_saved", hotelId });
  });

  client.on("error", (err: unknown) => {
    const error = String((err as any)?.message || err || "");
    console.error(`⛔ [whatsapp] client error hotelId=${hotelId}:`, err);
    debugLog("[wa.lifecycle]", { event: "client_error", hotelId, error }, "error");
  });

  client.on("ready", async () => {
    console.log(`✅ [whatsapp] Bot listo para hotelId=${hotelId}`);
    debugLog("[wa.lifecycle]", { event: "ready", hotelId });
    attachWhatsAppBrowserDiagnostics(hotelId);
    await dumpWhatsAppPageState(hotelId, "ready");
    try {
      await clearQR(hotelId);
      await setWhatsAppState(hotelId, "connected");
    } catch (err) {
      console.error("⛔ [whatsapp] Error en ready (limpiar QR/estado):", err);
      debugLog("[wa.lifecycle]", { event: "ready_error", hotelId, error: String((err as any)?.message || err) }, "error");
    }
    startChannelHeartbeat("whatsapp", hotelId);
  });

  client.on("auth_failure", async (msg: string) => {
    console.error(`❌ [whatsapp] auth_failure para hotelId=${hotelId}:`, msg);
    debugLog("[wa.lifecycle]", { event: "auth_failure", hotelId, message: msg || "" }, "error");
    await setWhatsAppState(hotelId, "auth_failed");
  });

  client.on("disconnected", async (reason: string) => {
    console.warn(`❌ [whatsapp] Bot desconectado hotelId=${hotelId}: ${reason}`);
    debugLog("[wa.lifecycle]", { event: "disconnected", hotelId, reason: reason || "" }, "warn");
    await setWhatsAppState(hotelId, "disconnected");
    clearPoller(hotelId);
  });

  // ACKs salientes (telemetría de entrega)
  client.on("message_ack", (msg: Message, ack: MessageAck) => {
    console.log(
      `[whatsapp] 📬 ack hotel=${hotelId} id=${(msg as any).id._serialized} → ${ack} (0:error,1:server,2:device,3:read,4:played)`
    );
  });

  /**
   * Handler de mensaje entrante
   */
  client.on("message", async (message: Message) => {
    if ((message as any).fromMe) return;

    try {
      // Config por hotel
      const hotelConfig = await getHotelConfig(hotelId);
      const mode: "automatic" | "supervised" =
        hotelConfig?.channelConfigs?.whatsapp?.mode ?? "automatic";
      const ignoreGroups: boolean =
        hotelConfig?.channelConfigs?.whatsapp?.ignoreGroups ?? true;

      if (ignoreGroups && (message as any).from.endsWith("@g.us")) return;

      const srcMsgId = (message as any).id?._serialized || "";
      const body = (message as any).body || "";
      console.log(
        `📩 [whatsapp] IN hotel=${hotelId} msg=${srcMsgId} from=${(message as any).from} len=${body.length} "${preview(body)}"`
      );
      if (!srcMsgId) return;

      // Idempotencia 1/2: Redis (usando el cliente compartido de lib/services/redis)
      const firstTime = await shouldIngestWaMessageOnce(hotelId, srcMsgId);
      if (!firstTime) {
        console.log(`[whatsapp] 🔁 dedupe Redis → ignorado ${srcMsgId}`);
        return;
      }

      if (!hotelPhone) {
        console.warn(`⚠️ [whatsapp] hotelPhone no definido para hotelId=${hotelId}. Evito respuesta.`);
      }

      const senderJid = normalizePhone((message as any).from);

      // Parseo canal → evento unificado
      const parsed = await parseWhatsAppToChannelMessage({
        message: message as any,
        hotelId,
        guestId: senderJid,
      });

      const resolvedIdentity = await resolveGuestIdentity({
        hotelId,
        channel: "whatsapp",
        rawGuestId: senderJid,
      });
      const canonicalGuestId =
        String(resolvedIdentity?.guestId || "").trim() || parsed.guestId || senderJid;

      const rawEvent: ChannelMessage & Record<string, any> = {
        ...parsed,
        channel: "whatsapp",
        hotelId,
        guestId: canonicalGuestId,
        sender: parsed.sender || senderJid,
        messageId: parsed.messageId || srcMsgId,
        content: parsed.content ?? body,
        timestamp:
          parsed.timestamp ||
          ((message as any).timestamp
            ? new Date((message as any).timestamp * 1000).toISOString()
            : new Date().toISOString()),
        conversationId:
          parsed.conversationId || `${hotelId}-whatsapp-${parsed.guestId || senderJid}`,
        // 👈 sin status en inbound
      };


      // Idempotencia 2/2: DB (persistencia estable)
      const idempotencyKey = `${hotelId}:whatsapp:${srcMsgId}`;
      const saved = await saveMessageIdempotent(rawEvent, { idempotencyKey } as any);
      if ((saved as any)?.deduped) {
        console.log(`[whatsapp] 🔁 dedupe DB → ya existía ${srcMsgId}`);
      } else {
        console.log(`[whatsapp] 💾 guardado ${srcMsgId} conv=${rawEvent.conversationId}`);
      }

      // Handler universal (IA + supervisado)
// arma el UniversalEvent desde rawEvent/source
      const evt = {
      hotelId,
      conversationId: rawEvent.conversationId!,
      channel: "whatsapp" as const,
      guestId: canonicalGuestId,
      from: "guest" as const,
      content: rawEvent.content || body,
      sourceMsgId: srcMsgId, // id del proveedor → dedupe
      timestamp: (message as any).timestamp
        ? (message as any).timestamp * 1000
        : Date.now(),
      meta: {
        senderJid,
        guestAlias: resolvedIdentity?.guestAlias,
      },
    };

    await universalChannelEventHandler(evt, {
      mode,
      sendReply: async (reply: string) => {
        if (!reply) return;
        const sent = await client.sendMessage(senderJid, reply);
        console.log(
          `[whatsapp] 📤 reply hotel=${hotelId} → ${senderJid} (msgId=${(sent as any).id._serialized}, size=${reply.length})`
        );
      },
    });

    } catch (error) {
      console.error("⛔ [whatsapp] Error procesando mensaje:", error);
      try {
        await (message as any).reply("⚠️ Hubo un error procesando tu solicitud.");
      } catch {}
    }
  });

  // Poller supervisado (approved responses)
  ensureSinglePoller(hotelId, () =>
    setInterval(async () => {
      try {
        const messages = await getMessages(hotelId, "whatsapp", 50);
        for (const msg of messages) {
          const shouldSend =
            msg.status === "sent" &&
            !!msg.approvedResponse &&
            msg.sender === "assistant" &&
            !msg.deliveredAt;
          if (!shouldSend) continue;

          const guestJid = msg.guestId;
          if (!guestJid) {
            console.warn("[whatsapp] guestId ausente para mensaje", msg.messageId);
            continue;
          }

          console.log(
            `[whatsapp] Enviando approvedResponse → guest=${guestJid} msgId=${msg.messageId}`
          );

          try {
            await client.sendMessage(guestJid, msg.approvedResponse!);
            await updateMessageInAstra(hotelId, msg.messageId, {
              deliveredAt: new Date().toISOString(),
              deliveryError: undefined,
              deliveryAttempts: (msg.deliveryAttempts || 0) + 1,
            });
            console.log(`[whatsapp] OK entregado msgId=${msg.messageId}`);
          } catch (error) {
            const attempts = (msg.deliveryAttempts || 0) + 1;
            const hardFail = attempts >= 5;
            await updateMessageInAstra(hotelId, msg.messageId, {
              deliveryError: String(error),
              deliveryAttempts: attempts,
              status: hardFail ? "rejected" : "sent",
            });
            console.error(
              `[whatsapp] ❌ Error entregando msgId=${msg.messageId} guest=${guestJid} (intent ${attempts}):`,
              error
            );
          }
        }
      } catch (err) {
        console.error("[whatsapp] Error en poller de aprobados:", err);
      }
    }, 5000)
  );

  try {
    const init = (client as any).initialize?.();
    if (init && typeof init.then === "function") {
      init.then(() => {
        attachWhatsAppBrowserDiagnostics(hotelId);
        void dumpWhatsAppPageState(hotelId, "initialize_resolved");
      }).catch((err: unknown) => {
        const error = String((err as any)?.message || err || "");
        console.error("⛔ [whatsapp] Error async en initialize():", err);
        debugLog("[wa.lifecycle]", { event: "initialize_failed_async", hotelId, error }, "error");
      });
    }
  } catch (err) {
    console.error("⛔ [whatsapp] Error en initialize():", err);
    debugLog(
      "[wa.lifecycle]",
      { event: "initialize_failed_sync", hotelId, error: String((err as any)?.message || err || "") },
      "error"
    );
  }
}
