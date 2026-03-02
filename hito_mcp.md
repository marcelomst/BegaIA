# HITO_MCP — Control Arquitectónico MCP & Widget

Este archivo define el estado real del sistema y evita mezclar hitos.
Regla: 1 commit = 1 hito. No mezclar capas.

---

# Estado Actual Consolidado

## MCP Core (estable)

- ChannelManagerAdapter funcionando
- reservationsService funcionando
- create / update / cancel operativos
- Multi-hotel isolation validado
- Golden transcripts verdes
- tests:
  - e2e.reservation.golden-transcripts.spec.ts ✅
  - e2e.reservation.flow.spec.ts ✅
  - graph.reservation.verify_and_snapshot.spec.ts ✅
  - reservations.mcp.multi-hotel-isolation.spec.ts ✅

MCP se considera congelado salvo hito explícito HCM-\*.

### HCM-1 — InMemory CM Adapter (aislamiento por hotelId)

Estado: CERRADO  
Commit: 1bcb3be  

Descripción:
- Se reemplazó store global por Map<hotelId, Map<reservationId, Reservation>>.
- Se agregó getStore(hotelId) con normalización.
- Todas las operaciones ahora resuelven store por hotelId.
- No afecta CM real; aplica solo al simulador inMemory (dev/test).

Tests ejecutados (PASS):
- test/unit/channelManagerAdapter.registry.spec.ts
- test/integration/reservations.mcp.channel-manager.spec.ts
- test/integration/reservations.mcp.multi-hotel-isolation.spec.ts

### HCM-2 — Estabilización del puerto ChannelManagerAdapter (factory inMemory única)

Estado: CERRADO  
Commit: f06a1f7  

Descripción:
- Se eliminó la selección de provider por CM_PROVIDER.
- Se removieron stubs no implementados (`redis`, `real`) del factory.
- Se mantuvo el puerto `ChannelManagerAdapter` intacto.
- Se conservó el registry por hotelId para aislamiento multitenant en dev/test.
- `getCMAdapter(hotelId)` ahora retorna directamente el adapter inMemory.

Resultado arquitectónico:
- El sistema queda estabilizado en una única implementación concreta (Quickstart).
- Se elimina abstracción prematura.
- El puerto queda listo para futura implementación de un adapter real en un hito independiente.

Tests ejecutados (PASS):
- test/unit/channelManagerAdapter.registry.spec.ts
- test/integration/reservations.mcp.channel-manager.spec.ts
- test/integration/reservations.mcp.multi-hotel-isolation.spec.ts

### DIAG-PMS-REAL-1 — Estado integración PMS/CM real

Estado: COMPLETADO
Fecha: 2026-02-25
Evidencia:
- Archivos clave inspeccionados: `lib/mcp/channelManagerAdapter.ts`, `lib/mcp/reservationsService.ts`, `app/api/mcp/route.ts`, `app/api/mcp/availability/route.ts`, `app/api/mcp/reservations/{create,update,cancel}/route.ts`, `lib/adapters/beds24.ts`, `lib/adapters/beds24_v2.ts`.
- Provider detectado: `inmemory` por default via `CM_PROVIDER`; `redis` y `real` existen solo como stubs con `throw`.
Resultado:
- Operaciones reales confirmadas (CM/PMS real): ninguna en MCP de reservas (`availability/create/update/cancel/get/list` usan `getCMAdapter(...)` y hoy caen en `InMemoryCMAdapter` salvo que `CM_PROVIDER` se cambie, pero `real/redis` no están implementados).
- Bloqueantes: `CM_PROVIDER=real`/`redis` no implementados en factory; no existe adapter real que implemente `ChannelManagerAdapter`; no hay wiring MCP↔Beds24 adapters; config real CM (`CM_API_BASE`/`CM_API_KEY`) solo aparece en comentarios.
Recomendación:
- Próximo hito: HPM-1 / HCM-real-1 (implementar adapter real `ChannelManagerAdapter` + wiring en `getCMAdapter` + configuración/env + tests de integración).

### PIPE-WEB-1 — Validación E2E Web + MCP (Quickstart inMemory)

Estado: CERRADO  
Fecha: 2026-02-25  

Evidencia (tests PASS):
- test/integration/reservations.mcp.channel-manager.spec.ts
- test/integration/reservations.mcp.multi-hotel-isolation.spec.ts
- test/e2e.reservation.flow.spec.ts

Cobertura validada:
- MCP reservas inMemory: availability → create → update → get → cancel → get
- Aislamiento por hotelId (multihotel)
- Contrato WEB `/api/chat`: conversationId + messageId + status + response/suggestedReply
- Endpoints de lectura: `/api/conversations/list` y `/api/messages/by-conversation`
- MCP unificado `/api/mcp` (action=call) incluye get/list; legacy routes presentes (availability/create/update/cancel)

Fuera de alcance:
- Integración CM/PMS real (se valida Quickstart inMemory)

### PIPE-UI-RES-1 — Estabilización UX reservas WEB sobre MCP (Quickstart inMemory)

Estado: CERRADO  
Fecha: 2026-02-26  

Resumen técnico:
- Se corrigió la mezcla semántica “error availability + CTA CONFIRMAR” (no anexar confirmación cuando `needsHandoff=true`).
- Se habilitó `/api/mcp` (sin slash) en middleware para que `checkAvailabilityTool()` llegue al MCP unificado y no redirija a `/auth/login`.
- Se mejoró la UX de nombre parcial: si el usuario da solo nombre, se personaliza la respuesta y se pide solo apellido.

Referencias a commits:
- FIX-RES-AVAIL-ERROR-1
- PIPE-UI-RES-1

Tests PASS:
- test/e2e.reservation.flow.spec.ts
- test/e2e.reservation.golden-transcripts.spec.ts
- test/integration/reservations.mcp.channel-manager.spec.ts

Estado final:
- OK en WEB (MCP inMemory)

## WhatsApp Oficial (Twilio)

### FEAT-WA-TWILIO-1 — Webhook inbound Twilio (MVP hotel999)

Estado: IMPLEMENTADO (commit mezclado)  
Commit: bedcbe8  

Descripción:
- Se agregó endpoint `POST /api/webhooks/whatsapp/twilio` (inbound Twilio).
- Se parsea `application/x-www-form-urlencoded` con campos `From`, `To`, `Body`, `MessageSid`.
- Routing MVP por env:
  - `TWILIO_WA_TO_HOTEL999` → `hotelId="hotel999"`.
- Normalización a `ChannelMessage`:
  - `messageId="twilio:<MessageSid>"`
  - `channel="whatsapp"`
  - `role="user"`, `direction="in"`
  - `sourceProvider="whatsapp.twilio"`, `sourceMsgId=<MessageSid>`
  - `meta` con `{ to, from, twilio: { messageSid } }`
- Responde `200 OK` siempre; si `To` no mapea, registra `[WA_TWILIO_UNMAPPED_TO]`.

Tests ejecutados (PASS):
- test/api.webhooks.whatsapp.twilio.route.spec.ts ✅
- test/integration/recotizacion.planner_only.test.ts ✅
- pnpm test ✅ (91 passed files, 267 passed tests)

Fuera de alcance:
- No conecta aún con handler `/api/chat` (solo inbound + normalización).
- No outbound (sendText) ni credenciales Twilio.
- No validación firma Twilio.
- No routing SaaS real vía `hotel_config` (solo env MVP).

Nota de disciplina:
- Desviación detectada: `bedcbe8` mezcló `FIX-TEST-RECOTIZACION-1` + `FEAT-WA-TWILIO-1` en el mismo commit.
- Decisión: NO reescribir historia (ya pusheado). Se registra aquí y se retoma disciplina 1 commit = 1 hito a partir del próximo cambio.

### WA-TUNNEL-DEV-1 — Cloudflare Tunnel DEV (nativo)

Estado: ACTIVO (DEV)  
Fecha: 2026-02-28  

Descripción:
- Se creó túnel `begasist-dev` (UUID: c3d5dea7-fc68-4374-9211-cf7fa8c20da2).
- Se creó hostname `wa-dev.begam.uy` apuntando al túnel.
- Se utiliza config nativa:
  `/home/marcelo/begasist/.cloudflared/config.dev.native.yml`
- Ingress:
  - `wa-dev.begam.uy` → `http://localhost:3000`
- Ejecución DEV (nativo, no Docker):

  cloudflared tunnel --config /home/marcelo/begasist/.cloudflared/config.dev.native.yml run begasist-dev

Validación:
- `curl` público devuelve `200 {"ok":true}`.
- Endpoint funcional:
  https://wa-dev.begam.uy/api/webhooks/whatsapp/twilio

Decisión arquitectónica:
- En entorno DEV se utiliza cloudflared nativo para evitar problemas de networking Docker/WSL.
- Docker tunnel queda reservado para futuros entornos server o producción.

Fuera de alcance:
- No es túnel de producción.
- No hay validación de firma Twilio.
- No hay outbound Twilio aún.

### FEAT-WA-TWILIO-2 — Inbound conectado al pipeline central

Estado: COMPLETADO  
Commit: 10cf47e  

Descripción:
- Se extrajo `handleChannelMessage` como handler central.
- `/api/chat` delega en el pipeline.
- Webhook Twilio ahora invoca el mismo handler central.
- Persistencia en `messages` vía flujo normal.
- Multi-tenant preservado por `hotelId`.
- FAST_ROUTE_MODE limitado exclusivamente a entorno test.

Impacto arquitectónico:
- Eliminación de lógica paralela entre Web y WhatsApp.
- Canal desacoplado del motor conversacional.
- Pipeline único real.

Fuera de alcance:
- No outbound.
- No validación de firma.
- No dedupe persistente.

### FEAT-WA-TWILIO-3 — Outbound automático vía API Twilio

Estado: COMPLETADO  
Commit: 9b366bf  

Descripción:
- Se implementó helper `twilioSendWhatsAppMessage`.
- Si el pipeline retorna `status="sent"` → se envía reply automático.
- Si `status="pending"` → no se envía outbound.
- No se altera respuesta HTTP del webhook (siempre 200 OK).
- Tests con mocks para sent vs pending.

Variables de entorno requeridas:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`
- opcional: `TWILIO_STATUS_CALLBACK_URL`

Impacto arquitectónico:
- Canal WhatsApp oficial funcional end-to-end.
- Primer canal productivo completo.
- Transporte sigue desacoplado de lógica de negocio.

Fuera de alcance:
- No validación de firma Twilio.
- No deduplicación persistente por `MessageSid`.
- No binding automático de conversación por número.
- Routing multi-hotel aún basado en env mapping.

### FEAT-WA-TWILIO-6 — Binding conversación por número WhatsApp

Estado: COMPLETADO  
Commit: 0bc79da  

Descripción:
- Reutiliza `conversationId` por `(hotelId + guestPhone)`.
- Busca último mensaje en `messages` para el canal "whatsapp".
- Compatibilidad con documentos antiguos usando fallback a `guestId`.
- No crea nueva colección.
- No modifica esquema base.

Impacto arquitectónico:
- Conversación persistente real por huésped.
- Historial consistente en modo supervisado.
- Multi-tenant garantizado por `hotelId`.
- Base para CRM futuro.

Fallback:
- Si falla Astra DB → log `[WA_TWILIO_BINDING_FAILED]`
- No bloquea webhook.
- Pipeline continúa normalmente.

Fuera de alcance:
- No normalización avanzada de número (Twilio ya envía E.164).
- No binding cross-channel.
- No routing dinámico multi-hotel desde `hotel_config`.

### FEAT-WA-TWILIO-7 — Routing multi-hotel dinámico desde hotel_config

Estado: COMPLETADO  
Commit: 82afda1  

Descripción:
- Resuelve `hotelId` dinámicamente a partir del campo `To` (Twilio WhatsApp).
- Consulta colección `hotel_config` como fuente de verdad.
- Lookup tolerante en `channelConfigs.whatsapp`.
- Normalización E.164 con prefijo `whatsapp:`.

Impacto arquitectónico:
- Elimina dependencia principal de mapping estático por `.env`.
- Soporte real multi-hotel en canal WhatsApp Oficial.
- Routing gobernado por configuración en DB.
- Compatible con arquitectura SaaS multi-tenant.

Optimización:
- Cache TTL in-memory (60s).

Fallback:
- Si DB no encuentra match → fallback a env.
- Si DB falla → log y continúa.
- Si no hay mapping → UNMAPPED_TO (200 OK).

Fuera de alcance:
- No routing cross-channel.
- No invalidación activa de cache (solo TTL).

### SUP-WA-1 — Supervisión avanzada v1 (WhatsApp Twilio)

Estado: COMPLETADO  
Commit: 40ad5ec  

Descripción:
- Soporte de aprobación manual con envío real por Twilio.
- Persistencia de outboundSid en meta.
- Endpoint de pendientes con cálculo de ageMinutes.
- Soporte SLA por hotel vía channelConfigs.whatsapp.slaMinutes.
- UI en ChannelInbox con badge de breach y acción “Aprobar y enviar”.

Impacto:
- Convierte el panel admin en flujo de supervisión real.
- Permite control humano con SLA por hotel.
- Base para alertas y métricas futuras.

### Estado Actual del Canal WhatsApp Oficial

Actualmente:

- Webhook inbound operativo.
- Normalización a `ChannelMessage`.
- Pipeline central invocado.
- Persistencia en AstraDB.
- Respuesta automática outbound cuando status=sent.
- Modo supervisado (pending) respetado.
- Multi-tenant por `hotelId`.

Pendientes estratégicos:

1. SEC-WA-TWILIO-4 — Validación firma `X-Twilio-Signature`.
2. FEAT-WA-TWILIO-5 — Dedupe persistente por `sourceMsgId`.

---

## Admin QA (WEB-3) — CERRADO

- Proxy /api/demo/mcp con flag
- Test unitario proxy agregado
- No se tocó widget público
- Commit aislado en main

WEB-3 = DONE.

---

## Widget Público

### WIDGET-1 — Hardening /api/chat (CERRADO)

Incluye:

- Validación inputs
- Manejo seguro de errores
- Soporte status "pending"
- Logs estructurados sin PII
- test/api.chat.route.spec.ts agregado
- Batería reservas intacta

Pendiente menor:

- Contrato definido: 500 permitido y preferible para errores internos (widget usa res.ok, ignora ok:false en 200). DIAG-HTTP-1 cerrado.

## DIAG-HTTP-1 — CERRADO

Widget usa res.ok y fallback visual en !res.ok/catch.

No consume data.ok ni data.error.

Decisión: 500 para errores internos.
WIDGET-1 = DONE.

---

# Hito Activo

## WIDGET-2C — Fix KB Template Fallback (room_info on greeting)

Problema:

- category = "retrieval_based"
- promptKey = null
- Fallback elige promptMetadata[category][0] = room_info
- Resultado: saludo dispara template de habitaciones

Objetivo:

- Ajustar selección de template:
  1. promptKey explícito
  2. resolved.router.promptKey
  3. "kb_general"
  4. metadata fallback solo como último recurso

Restricciones:

- No tocar grafo
- No tocar MCP
- No tocar Admin
- Solo knowledgeBaseAgent
- Agregar test de regresión

Estado: CERRADO (WIDGET-2C)
Implementado en commit 259ffe9 (knowledgeBaseAgent.ts): deshabilita fallback legacy promptMetadata[category][0] cuando category="retrieval_based".

Implementación realizada en:

- knowledgeBaseAgent.ts

Ajuste aplicado:

- Se deshabilitó el fallback legacy a `promptMetadata[category][0]`
  exclusivamente para `category="retrieval_based"`.

Nueva prioridad efectiva:

1. promptKey válido
2. resolved.router.promptKey
3. "kb_general"
4. metadata fallback solo para categorías no-retrieval

Test agregado:

- test/unit/kb.greetingFallback.spec.ts ✅

Validación ejecutada:

- test/api.chat.route.spec.ts ✅
- test/e2e.reservation.golden-transcripts.spec.ts ✅
- test/unit/kb.greetingFallback.spec.ts ✅

Impacto:

- "Hola" ya no dispara template room_info.
- Widget público intacto.
- MCP intacto.
- Grafo intacto.

---

# Hitos Futuros (NO INICIAR)

## WIDGET-3 — Greeting Intent (feature UX)

- Categoría greeting explícita
- Quick actions
- No iniciar hasta cerrar WIDGET-2

---

# Reglas de Disciplina

1. No mezclar MCP con Widget en el mismo commit.
2. No mezclar bugfix con feature.
3. Siempre correr batería obligatoria antes de push.
4. No tocar grafo salvo hito explícito.
5. Si aparece desviación, se registra aquí antes de implementar.
