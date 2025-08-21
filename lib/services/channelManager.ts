// Path: /root/begasist/lib/services/channelManager.ts
import soap from "soap";
import type { ChannelManagerConfig } from "@/types/channel";
import type { ChannelManagerEventDTO } from "@/types/externalDTOs";
import { parseChannelManagerEvents, parseCMMessageToChannelMessage } from "@/lib/parsers/channelManagerParser";
import { handleChannelManagerEvent as handleCMEvent } from "@/lib/handlers/channelManagerHandler";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { getChannelManagerPollingState } from "./channelManagerPollingState";
import { redis } from "@/lib/services/redis";

/**
 * Inicia el bot de Channel Manager para el hotel indicado.
 * Usa el handler global (handleChannelManagerEvent) para toda la lógica.
 */
export async function startChannelManagerBot(hotelId: string) {
  console.log(`🔄 [CM] Iniciando Channel Manager Bot para hotel ${hotelId}...`);

  // 1) Cargar configuración del hotel
  const hotelConfig = await getHotelConfig(hotelId);
  if (!hotelConfig) {
    console.error(`❌ Configuración no encontrada para hotel ${hotelId}`);
    return;
  }

  const cmConf = hotelConfig.channelConfigs?.channelManager as ChannelManagerConfig;
  if (!cmConf?.enabled) {
    console.log(`⚠️ [CM] Channel Manager deshabilitado para hotel ${hotelId}`);
    return;
  }

  const {
    endpointUrl,
    username,
    password,
    requestorId,
    pollingInterval = 15000,
    mode,
  } = cmConf;

  // 2) Cliente SOAP en scope LOCAL (evita pisarse entre hoteles)
  let client: soap.Client | null = null;
  if (!endpointUrl || !username || !password || !requestorId) {
    console.log(`[CM] ⚙️ Dev mode: sin SOAP (endpointUrl/creds faltantes), solo cola Redis`);
  } else {
    try {
      client = await soap.createClientAsync(endpointUrl);
      // Evitamos tipos estrictos del paquete `soap` con cast a any (sin @ts-expect-error)
      (client as any).setSecurity(new (soap as any).WSSecurity(username, password));
      console.log(`[CM] SOAP client listo para hotel ${hotelId}`);
    } catch (err) {
      console.error(`⛔ [CM] Error creando cliente SOAP:`, err);
      client = null;
    }
  }

  // 3) Loop de polling con jitter y backoff ante errores SOAP
  let timer: NodeJS.Timeout | null = null;
  let soapBackoffMs = pollingInterval;

  const scheduleNext = (delay: number) => {
    const jitter = Math.floor(Math.random() * 500); // 0–500ms
    timer = setTimeout(poll, Math.max(500, delay) + jitter);
  };

  // 🔁 Consumidor robusto de Redis: RPOP uno por uno, DLQ si falla
  async function drainRedisQueue() {
    const key = `cm_events:${hotelId}`;
    const dlq = `cm_events:dead:${hotelId}`;
    let processed = 0;

    for (let i = 0; i < 200; i++) { // límite por iteración
      
      const raw = await redis.rpop(key);
      if (!raw) {
        console.log(`[CM Bot] 💤 Cola vacía, esperando eventos...`);
        break;
      }

      try {
        if (processed === 0) {
          console.log(`[CM Bot] 📥 1er evento bruto (${raw.length} bytes):`, raw.slice(0, 200) + (raw.length > 200 ? "..." : ""));
        }
        const evt = JSON.parse(raw) as ChannelManagerEventDTO;
        const iaReply = await handleCMEvent(evt, hotelId); // ✅ una sola llamada
        if (iaReply) {
          console.log(`[CM Bot] 💬 IA reply (${evt.eventType}):`, iaReply.slice(0, 120));
        }
        processed++;
      } catch (e: any) {
        console.error(`[CM Bot] ❌ JSON inválido, moviendo a DLQ (${dlq}):`, e?.message || e);
        await redis.lpush(dlq, raw);
      }
    }

    if (processed > 0) {
      console.log(`[CM Bot] ✅ Procesados ${processed} evento(s) de ${key}`);
    }
  }

  const poll = async () => {
    try {
      
// ❤️ heartbeat SIEMPRE al inicio
    const hbKey = `bot:cm:${hotelId}:heartbeat`;
    let res: string | null = null;
    try {
      res = await redis.setex(hbKey, 300, Date.now().toString()); // 5 min en dev para observar
      const ttl = await redis.ttl(hbKey);
      console.log(`[CM] ❤️ heartbeat set=${res} key=${hbKey} ttl=${ttl}s`);
    } catch (e) {
      console.error(`[CM] ❤️ heartbeat FAILED`, e);
    }

      const enabled = await getChannelManagerPollingState(hotelId);
      if (!enabled) {
        console.log(`⏸️ [CM] Polling pausado para hotel ${hotelId}`);
        return scheduleNext(pollingInterval);
      }
      console.log(`▶️ [CM] Polling para hotel ${hotelId}`);

      // --- a) Procesar eventos simulados en Redis ---
      console.log(`[CM] Revisando cola Redis para hotel ${hotelId}...`);
      await drainRedisQueue();
      console.log(`[CM] Cola Redis drenada para hotel ${hotelId}`);
      // --- b) Procesar eventos SOAP reales (si hay cliente SOAP) ---
      if (client) {
        try {
          const [rawResponse] = await (client as any).GetEventsAsync({
            RequestorID: { ID: requestorId },
          });

          const events: ChannelManagerEventDTO[] = parseChannelManagerEvents(rawResponse as string);
          if (events.length) {
            console.log(`📡 [CM] Procesando ${events.length} eventos SOAP para hotel ${hotelId}`);
          }

          for (const evt of events) {
            const iaReply = await handleCMEvent(evt, hotelId); // ✅ una sola llamada

            // Si es mensaje/review y estamos en modo automático, responder vía SOAP
            const isMsg = evt.eventType === "guest_message" || evt.eventType === "guest_review";
            if (isMsg && (mode ?? "automatic") === "automatic" && iaReply && iaReply.trim()) {
              try {
                const dto = parseCMMessageToChannelMessage(evt.payload as any);
                await (client as any).SendMessageAsync({
                  RequestorID: { ID: requestorId },
                  Message: { ...dto, content: iaReply },
                });
                console.log(`📤 [CM] Respuesta enviada al CM (hotel ${hotelId})`);
              } catch (e) {
                console.error(`⛔ [CM] Error enviando respuesta SOAP:`, e);
              }
            }
          }

          // reset backoff si hubo éxito
          soapBackoffMs = pollingInterval;
        } catch (err) {
          console.error(`⛔ [CM] Error en polling SOAP para hotel ${hotelId}:`, err);
          // Backoff exponencial suave: ×1.5 hasta 2min
          soapBackoffMs = Math.min(Math.floor(soapBackoffMs * 1.5), 120_000);
        }
      }

      scheduleNext(client ? soapBackoffMs : pollingInterval);
    } catch (e) {
      console.error(`⛔ [CM] Error inesperado en loop (hotel ${hotelId}):`, e);
      scheduleNext(pollingInterval);
    }
  };


  // 4) Iniciar loop
  poll();

  // (Opcional) devolver una función de stop si te sirve en tests
  return {
    stop: () => {
      if (timer) clearTimeout(timer);
    },
  };
}
