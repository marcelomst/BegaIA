// Path: /root/begasist/lib/services/channelManager.ts

import soap from "soap";
import type { ChannelManagerConfig } from "@/types/channel";
import type { ChannelManagerEventDTO } from "@/types/externalDTOs";
import { parseChannelManagerEvents, parseCMMessageToChannelMessage } from "@/lib/parsers/channelManagerParser";
import { handleChannelManagerEvent as handleCMEvent } from "@/lib/handlers/channelManagerHandler";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { getChannelManagerPollingState } from "./channelManagerPollingState";
import { redis } from "@/lib/services/redis";

let client: soap.Client | null = null;

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

  // 2) Setup cliente SOAP si corresponde
  if (!endpointUrl || !username || !password || !requestorId) {
    console.log(`[CM] ⚙️ Dev mode: sin SOAP (endpointUrl/creds faltantes), solo cola Redis`);
    client = null;
  } else {
    try {
      client = await soap.createClientAsync(endpointUrl);
      client.setSecurity(new soap.WSSecurity(username, password));
    } catch (err) {
      console.error(`⛔ [CM] Error creando cliente SOAP:`, err);
      client = null;
    }
  }

  // 3) Loop de polling unificado (Redis primero, luego SOAP)
  async function poll() {
    const enabled = await getChannelManagerPollingState(hotelId);
    if (!enabled) {
      console.log(`⏸️ [CM] Polling pausado para hotel ${hotelId}`);
      return setTimeout(poll, pollingInterval);
    }
    console.log(`⏸️ [CM] Polling procesando para hotel: ${hotelId}`);

    // --- a) Procesar eventos simulados en Redis ---
    const redisKey = `cm_events:${hotelId}`;
    try {
      const raws = await redis.lrange(redisKey, 0, -1);
      if (raws.length) {
        await redis.del(redisKey);
        console.log(`[CM Bot] 📥 Procesando ${raws.length} eventos simulados`);
        for (const raw of raws) {
          const evt = JSON.parse(raw) as ChannelManagerEventDTO;
          await handleCMEvent(evt, hotelId); // Toda la lógica modularizada
        }
      }
    } catch (e) {
      console.error(`[CM Bot] ❌ Error procesando Redis queue (${redisKey}):`, e);
    }

    // --- b) Procesar eventos SOAP reales (si hay cliente SOAP) ---
    if (client) {
      try {
        const [rawResponse] = await client.GetEventsAsync({
          RequestorID: { ID: requestorId },
        });
        const events: ChannelManagerEventDTO[] = parseChannelManagerEvents(rawResponse as string);
        if (events.length) {
          console.log(`📡 [CM] Procesando ${events.length} eventos SOAP para hotel ${hotelId}`);
          for (const evt of events) {
            await handleCMEvent(evt, hotelId);

            // Si es un mensaje y está en modo automático, responder vía SOAP
            if (
              (evt.eventType === "guest_message" || evt.eventType === "guest_review") &&
              (mode ?? "automatic") === "automatic"
            ) {
              const dto = parseCMMessageToChannelMessage(evt.payload as any);
              // El handler debe permitir devolver la respuesta IA sugerida
              const reply = await handleCMEvent(evt, hotelId);
              if (reply && typeof reply === "string" && reply.trim()) {
                try {
                  await client.SendMessageAsync({
                    RequestorID: { ID: requestorId },
                    Message: { ...dto, content: reply },
                  });
                  console.log(`📤 [CM] Respuesta enviada al CM`);
                } catch (e) {
                  console.error(`⛔ [CM] Error enviando respuesta:`, e);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(`⛔ [CM] Error en polling SOAP para hotel ${hotelId}:`, err);
      }
    }

    // 4) Siguiente iteración
    setTimeout(poll, pollingInterval);
  }

  // 5) Iniciar loop
  poll();
}
