¡Excelente idea! Documentar las decisiones y el razonamiento de la arquitectura ayuda un montón, sobre todo cuando el proyecto crece o hay que sumar devs nuevos.

Te armo un bloque de documentación listo para tu `README.md` o para un doc de arquitectura, en español claro y conciso. Si querés, después te lo traduzco o adapto al estilo que prefieras.

---

## Arquitectura de Recepción y Procesamiento de Mensajes Multicanal

### 🔎 **Situación Actual**

* Cada canal (Web, WhatsApp, Email, etc.) tiene un **listener** propio, implementado como *polling* periódico (intervalos de consulta) o *event listeners* según las capacidades del paquete/SDK.
* Los mensajes de cada canal se **normalizan** (parser propio) y se guardan en el modelo central `ChannelMessage`, persistiendo en memoria y en AstraDB.
* El procesamiento de respuestas puede ser inmediato (modo automático) o supervisado por recepcionista (modo supervisado).
* La arquitectura actual es **modular y desacoplada**: cada canal tiene su propio servicio, pero toda la lógica de manejo de mensajes pasa por un único handler central (`handleIncomingMessage`).

### 🤔 **Decisiones de Diseño**

* **Desacoplamiento**: El sistema no depende de la implementación interna de cada canal. El core maneja mensajes unificados, facilitando la evolución a nuevos canales o cambios internos.
* **Escalabilidad**: Se eligió no “forzar” event-driven desde el inicio para mantener la complejidad baja. Pero la estructura ya deja preparado el terreno para:

  * **Migrar a event-driven** usando un bus (ejemplo: Redis Pub/Sub) o
  * **Soportar webhooks/suscripciones** (por ejemplo, usando endpoints públicos o listeners de SDKs que lo permitan).

### 🚀 **Caminos de Escalabilidad Futura**

1. **Polling (actual)**

   * Cada canal pregunta periódicamente por mensajes nuevos (emails no leídos, mensajes nuevos de WhatsApp, etc.).
   * Ventaja: Simple de implementar y debuggear.
   * Desventaja: Latencia y consumo de recursos.

2. **Bus de eventos (ej: Redis Pub/Sub)**

   * Los servicios de canal “emiten” eventos al bus central (`hotelId:channel:message`).
   * El *orquestador* suscribe a los eventos y distribuye la lógica.
   * Permite procesamiento reactivo y desacoplado. Ideal para microservicios y escala horizontal.

3. **Webhooks/Suscripción**

   * Los canales que lo soportan (ej: WhatsApp Business API, algunos emails, Facebook, etc.) pueden invocar un endpoint nuestro cuando reciben mensajes.
   * Latencia ultra baja, menos polling, pero depende de la API/SDK.

### 🛠️ **Ejemplo de Flujo (Actual: Polling Listener por Canal)**

```mermaid
graph TD
    A[Mensaje recibido en canal] --> B[Listener de canal (polling/event)]
    B --> C[Parser unificador]
    C --> D[handleIncomingMessage (core handler)]
    D --> E[Persistencia (AstraDB / memoria)]
    D --> F[Responder (según modo)]
```

* El canal puede ser cualquier fuente: WhatsApp, Email, Web, etc.
* **El handler central nunca depende de la fuente**: siempre opera sobre el modelo `ChannelMessage`.

### 🧩 **Preparando el Proyecto para Event-driven**

* **TODO**: Centralizar la función `emitEvent(event)` para todos los canales.
* Proveer una interfaz `subscribeToMessages(hotelId, channel, callback)` para el orquestador.
* Modularizar el “listener” de cada canal para que pueda funcionar tanto en modo polling como en modo suscripción.

---

¿Te lo paso como PRÓLOGO del README, sección de *architecture.md*, o preferís otro formato? Si querés, te armo el ejemplo de “cómo sería” el handler usando Redis Pub/Sub o Webhook para algún canal.

¡Perfecto! Acá van **dos ejemplos listos para copiar/pegar** (uno para Redis Pub/Sub y otro para Webhook), pensados para tu arquitectura actual y compatibles con tu modelo `ChannelMessage` y handler centralizado.

---

## **1. Ejemplo Handler Multicanal usando Redis Pub/Sub**

**Supuesto:**
Cada servicio de canal (por ejemplo, el bot de WhatsApp, email, web, etc.) publica mensajes normalizados en un canal de Redis tipo `hotelId:channel:messages`.
El orquestador suscribe y los pasa al handler central (`handleIncomingMessage`).

```ts
// Path: /lib/orchestrator/messageBus.ts

import Redis from "ioredis";
import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import type { ChannelMessage } from "@/types/channel";

const redis = new Redis(process.env.REDIS_URL);

export function subscribeToChannelMessages(hotelId: string, channel: string) {
  const topic = `${hotelId}:${channel}:messages`;

  redis.subscribe(topic, (err, count) => {
    if (err) {
      console.error("❌ Error suscribiendo a", topic, err);
    } else {
      console.log(`🛎️ Subscrito a ${topic}`);
    }
  });

  redis.on("message", async (channel, message) => {
    try {
      const msg: ChannelMessage = JSON.parse(message);
      await handleIncomingMessage(msg, {
        // ...opciones si querés responder automáticamente
      });
      console.log("✅ Mensaje procesado via bus:", msg);
    } catch (err) {
      console.error("⛔ Error procesando mensaje desde bus:", err, message);
    }
  });
}

// --- En tu entrypoint central, lanzás todas las subs:
subscribeToChannelMessages("hotel999", "whatsapp");
subscribeToChannelMessages("hotel999", "email");
// ...
```

**Publicar desde un canal** (ejemplo WhatsApp):

```ts
// Path: /lib/services/whatsapp.ts (en lugar de llamar al handler directo)
import Redis from "ioredis";
const redis = new Redis(process.env.REDIS_URL);

// ...después de parsear a ChannelMessage:
await redis.publish(`${hotelId}:whatsapp:messages`, JSON.stringify(channelMsg));
```

---

## **2. Ejemplo Handler usando Webhook (endpoint HTTP)**

**Supuesto:**
El canal (o proveedor) puede invocar un endpoint HTTP cuando llega un mensaje.
Tu endpoint recibe el mensaje, lo normaliza, y llama al handler central.

```ts
// Path: /pages/api/hooks/whatsapp.ts (Next.js API Route)

import type { NextApiRequest, NextApiResponse } from "next";
import { parseWhatsAppToChannelMessage } from "@/lib/parsers/whatsappParser";
import { handleIncomingMessage } from "@/lib/handlers/messageHandler";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    // Tu formato de mensaje depende del proveedor
    const { hotelId, guestId, message } = req.body;
    const channelMsg = await parseWhatsAppToChannelMessage({ message, hotelId, guestId });
    await handleIncomingMessage(channelMsg, {
      // ...opciones (ej: autoReply, sendReply)
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("⛔ Error en webhook whatsapp:", err);
    res.status(500).json({ error: "Error procesando mensaje" });
  }
}
```

El canal (o bot) tiene que poder hacer POST a tu endpoint cuando reciba un mensaje.

---

## **Notas y Consejos**

* En ambos casos, **la lógica del canal solo se encarga de recibir/parsing/publicar** (en Redis, webhook, lo que sea).
* El *handler centralizado* y el modelo `ChannelMessage` **no cambian**: esto permite cambiar la arquitectura de fondo sin refactor pesado.
* Para testing, podés simular mensajes publicando en Redis o haciendo POST al endpoint con cURL o Postman.
* Cuando quieras migrar todo el sistema, solo cambiás el *entrypoint* (listener Redis/webhook) y el resto del sistema sigue igual.

¿Te gustaría un ejemplo similar para email o web? ¿O preferís el ejemplo de test automatizado de la suscripción/pubsub?
