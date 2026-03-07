# BEGASIST — BLUEPRINT DE ARQUITECTURA SaaS

## Hotel Assistant Platform Architecture

Documento arquitectónico del sistema **Begasist (Hotel Assistant)**.

Este documento describe la arquitectura conceptual completa de la plataforma
como **SaaS multitenant omnicanal para hotelería**, incluyendo sus capas,
flujo operativo y principios de diseño.

---

# 1. Visión general

Begasist no es simplemente un chatbot hotelero.

Conceptualmente es:

> Plataforma SaaS multihotel de atención, operación y asistencia comercial
> para propiedades hoteleras, con identidad transversal de huésped,
> pipeline conversacional único, canales intercambiables y persistencia
> separada entre operación diaria y base de conocimiento.

La idea central del sistema es:

```

muchos hoteles
↓
muchos canales
↓
una sola lógica conversacional
↓
una sola identidad de huésped
↓
una sola capa operacional
↓
múltiples vistas administrativas

```

Esto permite escalar el sistema como **plataforma SaaS real**.

---

# 2. Capas maestras del sistema

La arquitectura general de Begasist puede representarse de la siguiente forma:

```

┌─────────────────────────────────────────────┐
│                EXPERIENCE LAYER             │
│ Web chat / Admin UI / Dashboards / Widgets  │
└─────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────┐
│                 CHANNEL LAYER               │
│ Web / Email / WhatsApp / Channel Manager    │
└─────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────┐
│                IDENTITY LAYER               │
│ guest_aliases / guests / alias resolution   │
└─────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────┐
│             CONVERSATION LAYER              │
│ conversations / binding / session state     │
└─────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────┐
│               DECISION LAYER                │
│ heuristics / classifier / LangGraph / MCP   │
└─────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────┐
│             PERSISTENCE LAYER               │
│ messages / conv_state / hotel_config / KB   │
└─────────────────────────────────────────────┘

```

Este esquema representa el **esqueleto lógico del sistema**.

---

# 3. Multi-tenant real

El principio estructural más importante del sistema es:

```

hotelId = partición lógica del sistema

```

Esto implica que casi todos los componentes del sistema operan
bajo el alcance de un `hotelId`.

Cada hotel tiene:

```

hotelId
├─ configuración del hotel
├─ canales habilitados
├─ políticas operativas
├─ branding
├─ knowledge base
├─ adapters externos
├─ usuarios internos
└─ métricas

```

Esto convierte a Begasist en:

```

una plataforma que ejecuta el mismo motor
para muchos hoteles con aislamiento lógico

```

---

# 4. Channel Layer

La capa de canales recibe mensajes desde cualquier transporte.

Canales actuales o previstos:

```

Web
Email
WhatsApp oficial
Channel Manager

```

Principio clave:

```

Canal ≠ lógica
Canal = transporte

```

Cada canal debe producir un contrato común, típicamente:

```

ChannelMessage

```

Responsabilidades de esta capa:

```

recibir mensajes
normalizar payload
identificar origen
enviar al pipeline
persistir resultados
responder por el canal correspondiente

```

Esto evita duplicación de lógica entre canales.

---

# 5. Identity Layer

Esta capa resuelve la identidad del huésped.

Flujo conceptual:

```

canal
↓
alias
↓
guest_aliases
↓
guestId

```

Ejemplo:

```

WhatsApp: +598xxxxxxxx
Email: [guest@email.com](mailto:guest@email.com)
Web: cookie/session identifier
↓
todos resuelven al mismo guestId

```

Esto permite:

```

identidad transversal del huésped

```

El sistema deja de pensar en:

```

mensaje de WhatsApp

```

y pasa a pensar en:

```

este huésped interactúa con el hotel desde este canal

```

---

# 6. Conversation Layer

Una vez resuelto el `guestId`, el sistema debe determinar
la continuidad conversacional.

Esta capa contiene:

```

conversations
conv_state
bindings
message timelines

```

Responde preguntas como:

```

¿A qué conversación pertenece este mensaje?
¿Debe continuar una conversación existente?
¿Se abre una nueva conversación?
¿Qué estado operativo se mantiene?

```

Actúa como puente entre:

```

identidad persistente del huésped

```

y

```

estado transaccional de una conversación

```

---

# 7. Decision Layer

Esta es la capa donde reside la inteligencia del sistema.

Componentes conceptuales:

```

pre-heurísticas
clasificador
LangGraph
prompts curados
retrieval
MCP reservations
fallbacks seguros
risk policy

```

Flujo ideal:

```

mensaje entrante
↓
normalización
↓
clasificación / heurísticas
↓
detección de intención
↓
decisión de ruta
├ respuesta directa
├ retrieval
├ reserva/MCP
├ supervisado
└ fallback
↓
respuesta propuesta
↓
persistencia
↓
salida al canal

```

Begasist actúa como **orquestador conversacional**, no solo
como interfaz a un modelo LLM.

---

# 8. Persistence Layer

Begasist separa explícitamente dos tipos de persistencia.

## Persistencia operacional SaaS

Tablas o estructuras operativas:

```

messages
guests
guest_aliases
conversations
conv_state
hotel_config

```

Estas entidades registran:

```

operación diaria
identidad de huéspedes
estado conversacional
configuración hotelera

```

Idealmente modeladas como **tablas CQL**.

---

## Persistencia de conocimiento (KB / Retrieval)

Colecciones vectoriales separadas por hotel:

```

hotel123_collection
hotel999_collection
...

```

Esto permite recuperar información semántica sobre:

```

habitaciones
servicios
políticas
información turística

```

Separar esta capa evita mezclar:

```

estado operativo
vs
conocimiento recuperable

```

---

# 9. Admin Layer

La plataforma incluye una capa administrativa para operación hotelera.

Esta capa permite visualizar:

```

canales
conversaciones
huéspedes
mensajes
estado de supervisión
respuestas sugeridas
configuración hotelera
métricas

```

Evolución natural de la interfaz admin:

```

Inbox por conversación
↓
Inbox por huésped
↓
Perfil de huésped
↓
Timeline omnicanal
↓
Vista operativa + comercial

```

Esto transforma al sistema en una **herramienta operativa para hoteles**.

---

# 10. MCP e integración operativa

Begasist no solo responde preguntas.

También ejecuta operaciones.

Ejemplos:

```

reservas
modificación de reservas
cancelaciones
availability checks
integración con channel managers
integración con PMS

```

Arquitectura conceptual:

```

LLM decide
↓
MCP ejecuta
↓
persistencia registra
↓
admin supervisa

```

El modelo no ejecuta directamente operaciones,
sino que **decide cuándo invocar capacidades operativas**.

---

# 11. Supervisión y risk policy

Para uso real en hoteles, el sistema necesita control de riesgo.

Modelo conceptual:

```

LOW risk
→ autosend

MEDIUM risk
→ depende de confidence

HIGH risk
→ revisión humana

```

Esto permite equilibrar:

```

automatización
velocidad
seguridad operativa
control humano

```

---

# 12. Flujo end-to-end del sistema

El flujo completo del sistema es:

```

[1] Mensaje entra por canal
Web / Email / WhatsApp / CM

[2] Channel Layer normaliza

[3] Identity Layer resuelve alias
alias → guestId

[4] Conversation Layer decide binding
guestId + canal → conversationId

[5] Persistence Layer guarda mensaje

[6] Decision Layer analiza
heurísticas
clasificación
LangGraph
retrieval / MCP

[7] Se genera respuesta o acción

[8] Policy Layer decide
autosend / pending / escalate

[9] Persistence Layer guarda resultado

[10] Channel Layer entrega respuesta

[11] Admin Layer permite supervisión

```

---

# 13. Definición del producto

Begasist puede definirse como:

> Plataforma SaaS de concierge operativo e inteligencia conversacional
> para hoteles, con identidad unificada de huésped, automatización
> omnicanal y supervisión humana configurable.

Arquitectónicamente:

> Un pipeline conversacional multihotel desacoplado del canal,
> centrado en guestId y respaldado por capas separadas de operación,
> decisión y conocimiento.

---

# 14. Diferencia con un chatbot simple

Un bot común:

```

mensaje
↓
LLM
↓
respuesta

```

Begasist:

```

mensaje
↓
normalización
↓
identidad
↓
binding conversacional
↓
persistencia
↓
decisión
↓
retrieval o MCP
↓
policy de riesgo
↓
respuesta o supervisión
↓
admin / trazabilidad

```

Esto lo convierte en **plataforma**, no en bot.

---

# 15. Evolución natural del sistema

Evolución esperada de la plataforma:

```

Fase 1
Omnicanal + pipeline único + guest identity

Fase 2
Inbox admin unificado + perfil de huésped

Fase 3
Risk policy madura + supervisión inteligente

Fase 4
CRM hotelero liviano

Fase 5
Integraciones PMS / Channel Manager

Fase 6
Motor comercial y analítica

```

---

# 16. Núcleo estratégico del sistema

Tres identificadores estructuran el sistema:

```

hotelId
guestId
conversationId

```

Funciones:

```

hotelId → aislamiento SaaS
guestId → identidad transversal del huésped
conversationId → trazabilidad conversacional

```

Este triángulo es el **núcleo de la arquitectura Begasist**.

---

# 17. Conclusión

Begasist es una:

> Plataforma multihotel con canales intercambiables,
> identidad transversal por huésped, conversación persistente,
> motor central de decisión, ejecución operativa vía MCP,
> supervisión humana configurable y separación explícita
> entre operación diaria y conocimiento semántico.

Esto constituye una **base sólida para un AI Concierge + plataforma operativa hotelera**.

---

# Pendiente

A) un diagrama ASCII todavía más técnico, módulo por módulo  
B) una versión “executive / inversores / partners hoteleros” del mismo blueprint

```

```
