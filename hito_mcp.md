# Begasist Architecture Evolution Log

Este documento registra la evolución arquitectónica del sistema Begasist.

Cada entrada documenta un **hito técnico significativo del proyecto**, incluyendo:

- contexto del cambio
- componentes afectados
- resultado arquitectónico
- commit asociado

Su objetivo es mantener trazabilidad entre:

- código
- commits
- documentación
- decisiones arquitectónicas

Este archivo no reemplaza la documentación estable ubicada en:

`docs/architecture/`

sino que cumple una función complementaria: registrar la **secuencia cronológica de evolución del sistema**.

Las descripciones arquitectónicas consolidadas deben mantenerse en:

`docs/architecture/`

mientras que este archivo conserva el **historial narrado de cómo evolucionó la arquitectura**.

# HITO_MCP — Control Arquitectónico MCP & Widget

Este archivo define el estado real del sistema y evita mezclar hitos.
Regla: 1 commit = 1 hito. No mezclar capas.

---

# Estado Actual Consolidado

### FIX-PIPELINE-RISK-POLICY-1A

Estado: COMPLETADO  
Fecha: 2026-03-06

Descripción:

Se corrigió la política de riesgo D1 para preservar decisiones previas válidas
del supervisor.
A partir de este ajuste, `riskPolicy` deja de comportarse como autoridad
principal y pasa a actuar únicamente como capa de promoción para casos LOW en
modo supervisado.

Regla resultante:

- pending + LOW -> sent
- pending + HIGH -> pending
- sent -> sent

Nota:

Los fallos observados en tests Twilio corresponden a deuda independiente del
pipeline y no están relacionados con este fix.

### FIX-TEST-TWILIO-ROUTING-BASELINE-1

Estado: COMPLETADO  
Fecha: 2026-03-06

Descripción:

Se alineó el spec del webhook Twilio con el contrato actual de routing
multihotel.
Los tests dejaron de depender de fallback por variables de entorno y pasaron a
modelar explícitamente la resolución `To -> hotelId` mediante
`resolveHotelIdByTwilioTo`.

También se documentó/controló el pending-ack en ciertos tests cuando
interfería con la cobertura buscada (`WA_PENDING_ACK_ENABLED=0` en esos casos).

Este hito no modificó lógica productiva: solo restauró la baseline de testing y
confirmó la arquitectura SaaS multihotel del canal Twilio.

### DOC-ASTRA-PERSISTENCE-POLICY-1

Estado: COMPLETADO  
Fecha: 2026-03-06

Descripción:

Se documentó la política técnica vigente de persistencia Astra en Begasist con
separación explícita de dos capas:

- Capa operacional SaaS (global, multihotel, aislada lógicamente por
  `hotelId`), con preferencia por **Tables (CQL)** para entidades estables.
- Capa KB/retrieval (colecciones vectoriales por hotel).

También se dejó explícito que la partición física de KB (múltiples keyspaces o
clusters) no queda fijada todavía y se posterga hasta presión real de escala.

Caso `guest_aliases`:

- Clasificado como entidad operacional SaaS.
- Recomendación de implementación: **Table (CQL)** por estructura estable y
  lookup natural `hotelId + alias`.

### DOC-ASTRA-GUEST-ALIASES-TABLE-ADAPTER-1

Estado: COMPLETADO  
Fecha: 2026-03-06
Commit: 5de9e9b

Descripción:

Se documentó el cambio de persistencia de `guest_aliases` desde Astra Data API
(Collection) hacia Cassandra CQL Table.

La tabla:

hotel_data.guest_aliases

se define con:

PRIMARY KEY ((hotelId), alias)

El acceso a datos se refactorizó para usar el cliente Cassandra mediante
`getCassandraClient()` en lugar de `getAstraDB().collection(...)`.

El contrato público de las funciones `getGuestIdByAlias` y `ensureGuestAlias`
se preserva.

Este cambio alinea la arquitectura SaaS multihotel con la infraestructura
física de Astra y evita dependencia en índices automáticos de Data API.

### DOC-CONVERSATION-BINDING-GUEST-IDENTITY-1

Estado: COMPLETADO  
Fecha: 2026-03-06  
Commit: be5803a

Descripción:

Se documentó la introducción del binding de conversaciones por identidad de
huésped (`guestId`).

El pipeline ahora resuelve la conversación con la prioridad:

1. `conversationId` explícito
2. conversación activa por `(hotelId + guestId)`
3. nueva conversación

Esto permite reutilizar conversaciones entre distintos canales del mismo huésped
y prepara la arquitectura para un Inbox Unificado Multicanal.

### DOC-FEAT-ADMIN-INBOX-UNIFIED-1

Estado: COMPLETADO  
Fecha: 2026-03-06  
Commit: 76dbaf9

Descripción:

Se documentó la incorporación del Inbox Admin Unificado por identidad de
huésped (`guestId`).

La capa admin ahora puede consultar conversaciones por:

- `conversationId`
- `guestId`
- listados generales por hotel/canal

Esto materializa en la interfaz administrativa la arquitectura transversal ya
construida en backend:

canal -> alias -> guest_aliases -> guestId -> conversación -> inbox admin

El hito mantiene compatibilidad con consultas previas y prepara la base para un
Inbox Multicanal más potente.

### FEAT-ADMIN-GUEST-PROFILE-1

Estado: COMPLETADO  
Fecha: 2026-03-07  
Commit: 9365911

Descripción:

Se agregó soporte admin para perfil operativo de huésped centrado en `guestId`,
reusando identidad transversal (`guest_aliases`) y conversaciones unificadas.

Componentes implementados:

- Endpoint: `GET /api/admin/guest-profile` en
  `app/api/admin/guest-profile/route.ts`
- Integración UI en `components/admin/ChannelInbox.tsx` para visualizar:
  `aliases`, `channels`, `conversationCount`, `lastActivityAt`, `mode`
- Helper DB `getGuestAliasesByGuestId(...)` en `lib/db/guestAliases.ts`
- Test de integración: `test/integration/api_admin_guest_profile.test.ts`
- Ajuste de mock para Cassandra: `test/mocks/astra.ts`

Validación:

- `pnpm run ts-check` -> PASS
- `pnpm exec vitest run` -> PASS

Deuda técnica registrada:

El reverse lookup `guestId -> aliases` usa temporalmente `ALLOW FILTERING` en
`guest_aliases`. No bloquea el hito; se sugiere tratar en un hito futuro
`FIX-GUEST-ALIASES-REVERSE-LOOKUP-1` con tabla secundaria o índice
materializado.

### FIX-GUEST-ALIASES-REVERSE-LOOKUP-1

Estado: COMPLETADO  
Fecha: 2026-03-07  
Commit: 897c8b6

Descripción:

Elimina el uso de `ALLOW FILTERING` para el reverse lookup de aliases por
`guestId` introduciendo una tabla Cassandra optimizada
`guest_aliases_by_guest`.

Componentes implementados:

- Proyección Cassandra `guest_aliases_by_guest`
- Sincronización desde `ensureGuestAlias(...)`
- Helper actualizado en `lib/db/guestAliases.ts`
- Test de integración:
  `test/integration/db_guest_aliases_reverse_lookup.test.ts`

Validación:

- `pnpm run ts-check` -> PASS
- `pnpm exec vitest run` -> PASS

Resultado arquitectónico:

El sistema ahora soporta eficientemente:

`alias -> guestId`
`guestId -> aliases`

sin usar `ALLOW FILTERING`.

### FIX-WEB-GUEST-ID-1

Estado: COMPLETADO  
Fecha: 2026-03-07  
Commit: 6fa9941

Descripción:

Persistencia de `guestId` único para canal web.

Se elimina el uso del placeholder `web-guest` y se introduce
`guest-${uuid}` persistente en `localStorage` para cada navegador.

Componentes implementados:

- `utils/guestSession.ts`
- `components/admin/ChatPage.tsx`
- `app/api/chat/route.ts`
- `test/frontend/chatPage.lang.spec.tsx`

Validación:

- `pnpm run ts-check` -> PASS
- `pnpm exec vitest run` -> PASS

Resultado arquitectónico:

Cada navegador web posee ahora identidad independiente,
evitando colisión de conversaciones y habilitando identidad
transversal consistente en el sistema.

### MAINT-RESET-OPERATIVE-DATA-1

Estado: COMPLETADO  
Fecha: 2026-03-09  
Commit: a98d746

Descripción:

Extensión del script de reset operativo para incluir
las tablas de identidad transversal:

- guest_aliases
- guest_aliases_by_guest

Componentes modificados:

- `scripts/wipe-conversations-and-messages.ts`

Resultado operacional:

El reset ahora limpia completamente el estado de pruebas del sistema:

`messages`
`conversations`
`guests`
`conv_state`
`guest_aliases`
`guest_aliases_by_guest`

permitiendo reiniciar pruebas E2E limpias del flujo:

`Web -> guestId persistente`
`WhatsApp -> alias telefónico`
`Admin -> inbox / guests / conversaciones`

### UI-ADMIN-01

Estado: COMPLETADO  
Fecha: 2026-03-09  
Commit: 7eb7bd0

Descripción:

Normalización inicial de navegación del Admin Panel.

Se reorganiza el panel administrativo por dominios funcionales:
Inbox, Guests, Channels, Knowledge, Hotels, Users y Tools.

Se introduce dominio explícito Guests y separación conceptual entre
operación conversacional (Inbox) y modelo guest-centric (Guests).

Componentes implementados:

- `app/admin/layout.tsx`
- `app/admin/inbox/page.tsx`
- `app/admin/guests/page.tsx`
- `components/admin/ChannelInbox.tsx`
- `lib/auth/roles.ts`

Resultado arquitectónico:

La navegación administrativa pasa a reflejar dominios funcionales
alineados con la arquitectura SaaS multicanal y multihotel del sistema.

### FIX-UI-ADMIN-01A

Estado: COMPLETADO  
Fecha: 2026-03-09  
Commit: 7eb7bd0

Descripción:

Corrección semántica de Inbox/Guests.

Se elimina el hardcode a WhatsApp y se introduce diferenciación mínima
de vistas mediante `viewMode` en `ChannelInbox`.

Resultado arquitectónico:

Las vistas `/admin/inbox` y `/admin/guests` dejan de estar acopladas
a un canal específico y pasan a expresar semánticas distintas dentro
del modelo guest-centric del sistema.

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

**Nota sobre subjects no estándar (HITO-DOC-AUDIT-STD-1):**

- Algunos commits asociados a hitos existen, pero su subject no comienza con `HITO- / FEAT- / FIX- / DOC-` (ej: `docs(wa): register ...`).
- Por eso no aparecen en auditorías basadas en `git log --grep="HITO-" --grep="FEAT-" --grep="FIX-" --grep="DOC-"`.
- No se reescribe historia: se documenta la excepción y se retoma disciplina estándar para los próximos hitos.

### AUDIT-SUBJECT-STD-2 — Nota permanente sobre subjects no estándar

Estado: COMPLETADO  
Fecha: 2026-03-04

Descripción:

- Existen commits históricos relevantes con subject convencional (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`) y variantes legacy (`feat(wa): ...`, `HCM-1: ...`).
- Esos commits pueden no aparecer en auditorías por grep basadas en prefijos estrictos (`HITO-`, `FEAT-`, `FIX-`, `REF-`, `DOC-`, `CHORE-`).
- Esta bitácora usa `Commit: <hash>` como fuente de verdad y no reescribe historia.

Objetivo:

Mantener trazabilidad documental completa sin perder disciplina de auditoría; hacia adelante se retoman subjects con prefijo estricto.

### AUDIT-DOC-RECURSION-1 — Política: commits editoriales no se registran como hitos

Estado: COMPLETADO  
Fecha: 2026-03-05

Descripción:

- Los commits `DOC-HITO-MCP-UPDATE-*` corresponden a mantenimiento editorial de este documento (`hito_mcp.md`).
- Para evitar recursión (“documentar que se documentó”), NO se registran como entradas/hitos dentro de la misma bitácora.
- En auditorías automáticas (grep por `^DOC-`), estos commits pueden aparecer como presentes en Git pero ausentes en headings del documento.

Objetivo:

Mantener la bitácora enfocada en hitos funcionales del sistema, preservando trazabilidad sin ruido editorial.

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

### DOC-WA-TWILIO-1 — Registro documental de FEAT-WA-TWILIO-1

Estado: COMPLETADO  
Commit: d5c8c98

Descripción:

- Se registró formalmente en `hito_mcp.md` la implementación inicial de inbound Twilio.
- Se dejó explícita la desviación de disciplina (commit mezclado) y su decisión de no reescribir historia.

### FIX-WA-TWILIO-MW-1 — Allowlist webhook Twilio en middleware

Estado: COMPLETADO  
Commit: a4f3a96

Descripción:

- Se habilitó `/api/webhooks/whatsapp/twilio` como ruta pública en middleware.
- Se evitó redirección a `/auth/login` para webhook machine-to-machine.

### HITO-ADMIN-WA-CONFIG-1 — UI Admin WhatsApp Twilio creds (hotel_config)

Estado: COMPLETADO  
Commits: 0d6847f, 606ac1e

Descripción:

- Se extendió UI Admin para editar `channelConfigs.whatsapp` con campos Twilio (DB-first).
- Persistencia de `provider`, `twilioAccountSid`, `twilioAuthToken`, `twilioWhatsAppNumber`.
- `606ac1e` agrega follow-up de validaciones obligatorias (sender/SID/token).

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

### DOC-WA-TWILIO-DEV-TUNNEL-1 — Registro documental túnel Cloudflare DEV

Estado: COMPLETADO  
Commit: a455ac7

Descripción:

- Se documentó el estado del túnel DEV operativo para webhook Twilio.
- Alias/continuidad: esta entrada corresponde al mismo frente documental que `WA-TUNNEL-DEV-1`.

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

### FIX-SUP-WA-1A — Ajuste TypeScript en endpoint de pendientes

Estado: COMPLETADO  
Commit: a184514

Descripción:

- Se corrigió el acceso tipado a `createdAt` en `app/api/messages/pending/route.ts`.
- El endpoint recibía una unión `ChannelMessage | MessageDoc` y TypeScript no garantizaba `createdAt` en ambos tipos.
- Se aplicó narrowing seguro (`"createdAt" in m`) y se reutilizó ese valor en `baseTs` y en la respuesta.

Validación:

- `pnpm run ts-check` ✅

### FEAT-WA-TWILIO-5 — Dedupe inbound Twilio por sourceMsgId

Estado: COMPLETADO  
Commit: ed9d109  
Fecha: 2026-03-04

Descripción:

- Se implementó deduplicación de inbound Twilio por `sourceMsgId`.
- Se evita reprocesar mensajes repetidos del proveedor en el webhook oficial.

Objetivo:

Reducir duplicados operativos en WhatsApp Twilio y mantener consistencia del flujo inbound.

### FIX-TEST-RECOTIZACION-1 — Estabilización de tests de integración

Estado: COMPLETADO  
Commit: bedcbe8  
Fecha: 2026-03-04

Descripción:

- Se estabilizaron tests de integración asociados a recotización.
- Se corrigieron condiciones que generaban fallas intermitentes en la suite.

Objetivo:

Mejorar confiabilidad de validación automática y reducir falsos negativos en CI/local.

### FIX-RES-AVAIL-ERROR-1 — Evitar CTA CONFIRMAR cuando availability requiere handoff

Estado: COMPLETADO  
Commit: 5763291  
Fecha: 2026-03-04

Descripción:

- Se evitó sugerir CTA `CONFIRMAR` en escenarios donde disponibilidad requiere handoff.
- Se alinea la salida de reservas con el estado operativo real del flujo.

Objetivo:

Evitar respuestas engañosas en disponibilidad y reforzar control operativo en reservas.

### REF-WA-TWILIO-1 — Eliminación de fallback env en routing Twilio

Estado: COMPLETADO  
Commit: bb8747a  
Fecha: 2026-03-04

Descripción:

- Se eliminó fallback basado en variables de entorno en el webhook de WhatsApp Twilio.
- La resolución de hotel ahora se realiza exclusivamente mediante:
  `resolveHotelIdByTwilioTo({ to })`.
- Si el número Twilio no está mapeado a un hotel, el sistema registra:
  `WA_TWILIO_UNMAPPED_TO`
  y retorna `200 OK` sin procesar el mensaje.

Objetivo:

Garantizar comportamiento correcto en arquitectura SaaS multihotel evitando dependencias en configuración local `.env`.

### FIX-WA-TWILIO-ROUTING-2 — Mapping robusto To → hotelId (Twilio WhatsApp)

Estado: COMPLETADO  
Commit: f2c1a4a  
Fecha: 2026-03-04

Descripción:

- Se corrigió la resolución de hotelId en routing Twilio contemplando campos reales:
  `twilioWhatsAppNumber`, `twilioFrom`, `celNumber`.

Objetivo:

Evitar fallos de mapeo y asegurar enrutamiento correcto multihotel para números Twilio.

### FIX-PIPELINE-STATUS-1 — Status real persistido en handleChannelMessage

Estado: COMPLETADO  
Commit: 8d0652c  
Fecha: 2026-03-04

Descripción:

- `handleChannelMessage` ahora devuelve el status real persistido (`outputStatus`), evitando desalineación UI vs canal.

Objetivo:

Alinear la experiencia del usuario y la lógica de entrega con el estado real persistido del mensaje.

### REF-PIPELINE-DELIVERY-1 — Capa de policy centralizada para entrega de respuestas

Estado: COMPLETADO  
Commit: 984a9fa  
Fecha: 2026-03-04

Descripción:

- Se introdujo `lib/pipeline/deliveryPolicy.ts` como función/política central.
- Se aplicó en entrypoints:
  - `app/api/chat/route.ts`
  - `app/api/webhooks/whatsapp/twilio/route.ts`
- La policy decide consistentemente si:
  - enviar respuesta final
  - o devolver acuse de pendiente (pending ack), según `status/response/lang`.

Objetivo:

Centralizar la decisión de entrega y evitar lógica duplicada/inconsistente entre canales.

### FEAT-PIPELINE-RISK-POLICY-1 — Risk policy D1 (LOW autosend en supervised)

Estado: COMPLETADO  
Commit: f1eff71  
Fecha: 2026-03-05

Descripción:

- Se agregó `lib/pipeline/riskPolicy.ts` (LOW/HIGH).
- Integración en `lib/handlers/messageHandler.ts` para definir `finalStatus`.
- En supervised: LOW → autosend; HIGH → pending.
- Log de auditoría: `[PIPELINE_AUTO_APPROVED_BY_POLICY]` con hotelId/channel/guestId/category/salesStage/riskLevel/reason/finalStatus.
- Golden test: `test/golden/riskPolicy.golden.spec.ts`.

Objetivo:

Aplicar política operativa de riesgo para habilitar autosend seguro en modo supervisado sin tocar endpoints.

### CHORE-DEV-TUNNEL-1 — Script dev:tunnel

Estado: COMPLETADO  
Commit: 3a174ea  
Fecha: 2026-03-04

Descripción:

- Se agregó script `dev:tunnel` en `package.json`.

Objetivo:

Mejorar el flujo operativo de desarrollo al levantar tunnel de forma consistente.

### FEAT-GUEST-ALIASES-1 — Colección guest_aliases + helpers

Estado: COMPLETADO  
Commit: 4470a8a  
Fecha: 2026-03-04

Descripción:

- Nueva colección `guest_aliases`.
- Helpers DB: `getGuestIdByAlias`, `ensureGuestAlias`.
- Base para identidad transversal cross-channel (persona/guestId canónico).

Objetivo:

Unificar identidad del huésped entre canales (WhatsApp/Web/Email/CM) mediante aliases.

### REF-PIPELINE-GUEST-RESOLUTION-1 — Resolución canónica de guestId en pipeline

Estado: COMPLETADO  
Commit: 2bda5c7  
Fecha: 2026-03-04

Descripción:

- Se agregó `resolveGuestIdentity` e integración en `handleChannelMessage`.
- El pipeline resuelve `guestId` canónico vía `guest_aliases`.

Objetivo:

Asegurar que cada mensaje se asocie a una persona/guestId transversal independientemente del canal.

### FIX-GUEST-IDENTITY-NORMALIZATION-1 — Hardening de normalización de aliases

Estado: COMPLETADO  
Commit: 2bda5c7  
Fecha: 2026-03-04

Nota:
Este hito quedó incluido en el mismo commit que `REF-PIPELINE-GUEST-RESOLUTION-1` (2bda5c7).

Descripción:

- Hardening de normalización de alias (ej: WhatsApp variantes, email lowercase).
- Golden test: `guestIdentity.golden.spec.ts`.

Objetivo:

Evitar duplicación de identidad por variantes de alias y mantener invariantes estables.

### FIX-GUEST-ALIASES-COMPAT-1 — Compat lazy con guests legacy (backfill)

Estado: COMPLETADO  
Commit: 757ba9d  
Fecha: 2026-03-04

Descripción:

- Compatibilidad lazy con guests legacy.
- Backfill alias → guestId legacy al vuelo.
- Golden test: `guestAliasesCompat.golden.spec.ts`.

Objetivo:

Mantener compatibilidad con datos legacy sin romper identidad transversal.

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
   Estado:COMPLETADO
   COMMIT:ed9d109

Nota de auditoría (HITO-DOC-AUDIT-1):

- `FEAT-WA-TWILIO-2`, `FEAT-WA-TWILIO-3` y `SUP-WA-1` figuran en este documento, pero no se detectaron por subject en el log filtrado (`HITO/FEAT/FIX/DOC`).
- Se mantienen como estado actual y queda pendiente verificación explícita de commit/hash en próxima pasada documental.

### HITO-ADMIN-WA-UX-1 — Claridad UX WhatsApp config (Twilio vs legacy)

Estado: COMPLETADO  
Commit: 9febf0d

Descripción:

- Se clarificaron labels y ayudas de campo para configuración WhatsApp Twilio.
- Se ocultaron campos legacy por defecto en modo Twilio, manteniéndolos en bloque opcional.
- Se reforzó validación visual para evitar confusión entre número personal y sender oficial Twilio.

### DOC-DOCS-LEGACY-1 — Reorganización estructural de documentación

Estado: COMPLETADO  
Commit: dc13bea  
Fecha: 2026-03-04

Descripción:

- Se movieron documentos históricos a `docs/_legacy/`.
- Se creó una jerarquía clara de documentación:
  - `docs/architecture/`
  - `docs/product/`
  - `docs/development/`
- Se agregó documentación conceptual del modelo **Concierge Digital**.
- Se eliminaron artefactos Windows `:Zone.Identifier`.

Objetivo:

Mejorar la navegabilidad de la documentación y separar claramente documentación activa vs documentación histórica.

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

### PEND-ARCH-SYSTEM-OVERVIEW-01

Estado: PENDIENTE

Descripción:

Crear documento de visión global de arquitectura del sistema Begasist.

Archivo objetivo:

`docs/architecture/system_overview.md`

Objetivo del documento:

Proveer una vista unificada del sistema que integre los principales dominios ya documentados en `docs/architecture`.

Componentes a representar:

- Channels (Web, WhatsApp, Email, Channel Manager)
- Channel adapters
- Message Pipeline
- Guest Identity
- Conversation Binding
- Persistence (Astra / Cassandra)
- Decision Layer
- Admin Panel

El documento debe funcionar como **vista arquitectónica global del sistema**, complementando la documentación por dominios ya existente.

Referencias existentes:

- `docs/architecture/channel_architecture.md`
- `docs/architecture/message_pipeline.md`
- `docs/architecture/guest_identity_model.md`
- `docs/architecture/admin_panel.md`
- `docs/architecture/astra_persistence_policy.md`

Este pendiente se implementará cuando la arquitectura del sistema esté suficientemente estabilizada.

### UI-GUESTS-01

Estado: COMPLETADO  
Fecha: 2026-03-09  
Commit: 3f5fa52fa837964e7d0918293953c2d302c43fdd

Descripción:

Se implementa el dominio **Guests** como módulo funcional real del Admin Panel.

La vista `/admin/guests` deja de ser una variación del inbox y pasa a ofrecer:

- listado real de huéspedes
- aliases multicanal
- canales detectados
- conversaciones asociadas
- perfil básico
- merge manual de identidad

Impacto arquitectónico:

Begasist avanza desde un panel centrado en conversaciones/canales hacia un
modelo **guest-centric explícito**.

### Detalles técnicos relevantes

Se agregan endpoints admin para:

- listado guest-centric
- merge manual de guests

Se incorpora helper de backend que actualiza:

- `guest_aliases`
- `guest_aliases_by_guest`
- `conversations`
- `messages`
- `guests`

Validación:

`pnpm run ts-check -> PASS`
`test/integration/api_admin_guests_merge.test.ts -> PASS`

### FIX-UI-GUESTS-01A

Estado: COMPLETADO  
Fecha: 2026-03-09  
Commit: 81e18fb7dab30febddaac3fba0ca4f5bce4f0c06

Descripción:

Se estabiliza el comportamiento de guests absorbidos tras merge manual.

Correcciones:

- detección robusta de guests absorbidos (`merged` o `merged-into:*`)
- exclusión del listado operativo normal
- exclusión de candidatos de merge

El endpoint `/api/admin/guests` permite opcionalmente incluir absorbidos mediante:

`includeAbsorbed=1`

Impacto:

Se elimina el riesgo de re-merge y se alinea la UI con la política operativa del sistema.

### DOC-ARCH-SYSTEM-DIAGRAMS-01

Estado: COMPLETADO  
Fecha: 2026-03-10  
Commit: 70627c3233d907c0a082886d4d2d5201dce20bef

Descripción:

Se reorganiza la visualización arquitectónica de Begasist en un esquema por
capas, separando un diagrama L1 de overview del sistema y subdiagramas por
dominio.

Componentes incorporados:

- `docs/architecture/system_overview.mmd`
- `docs/architecture/channel_flow_overview.mmd`
- `docs/architecture/message_pipeline_detail.mmd`
- `docs/architecture/guest_identity_detail.mmd`
- `docs/architecture/admin_panel_relation.mmd`
- assets renderizados en `svg`
- assets fallback en `png`
- navegación visual desde `docs/architecture/README.md`
- script reutilizable `scripts/render-mermaid.sh`
- scripts de render en `package.json`

Resultado arquitectónico:

La documentación visual deja de concentrarse en un único diagrama saturado y
pasa a organizarse como:

- L1: visión global del sistema
- L2: detalle por canales
- L2: detalle del message pipeline
- L2: detalle de guest identity
- L2: relación del Admin Panel con los dominios operativos

Esto mejora legibilidad, mantenibilidad y navegación de la arquitectura
documentada.

### UI-GUESTS-02

Estado: COMPLETADO  
Fecha: 2026-03-10  
Commit: c3e85ea34154bd20f9c99182a73f484d5471de58

Descripción:

Se implementa navegación cruzada desde el dominio Guests hacia Inbox.

Dentro del perfil de huésped, las conversaciones asociadas permiten abrir el
thread operativo mediante la acción **"Abrir en Inbox"**.

La navegación utiliza deep-link hacia:

`/admin/inbox?guestId=<guestId>&conversationId=<conversationId>`

Inbox acepta estos parámetros y realiza selección inicial automática de la
conversación correspondiente.

Impacto UX:

Se completa la continuidad entre identidad de huésped y operación
conversacional.

Guests permanece como dominio de identidad mientras Inbox continúa siendo el
espacio operativo para gestionar conversaciones.

### UI-GUESTS-03A

Estado: COMPLETADO  
Fecha: 2026-03-10  
Commit: 028a1342904d85a26c5ebf9cb30df480ab405d87

Descripción:

Se incorpora una política compartida de identidad visible legible para
huéspedes en el Admin Panel.

La representación visual del guest pasa a priorizar:

- guest.name
- alias humanizado
- fallback "Guest <id corto>"

El guestId se mantiene como dato secundario.

Impacto:

Mejora la operación humana en Guests e Inbox y prepara el terreno para la
detección de posibles duplicados.

### UI-GUESTS-03B

Estado: COMPLETADO  
Fecha: 2026-03-10  
Commit: 028a1342904d85a26c5ebf9cb30df480ab405d87

Descripción:

Se agrega una capa de sugerencias heurísticas de posibles merges en el módulo
Guests.

La UI muestra candidatos sugeridos junto con:

- score
- severidad
- señales explicables

Acciones disponibles:

- Revisar
- Preparar merge
- Ignorar por ahora

El merge continúa siendo manual y explícito.

Impacto:

Begasist pasa de permitir merges manuales a ayudar activamente a descubrir qué
guests podrían representar a la misma persona.

### FIX-WEB-IDENTITY-01

Estado: COMPLETADO  
Fecha: 2026-03-11  
Commit: 6270ccfa59baf156ac73f08b0424957705e6006e

Descripción:

Se estabiliza la identidad web del widget embebible mediante persistencia de
`guestId` en `localStorage`.

Antes de este cambio el widget solo persistía `conversationId`, por lo que una
misma sesión web podía generar múltiples aliases `web:guest-*` y fragmentar la
identidad del huésped.

La corrección incorpora persistencia namespaced por hotel con la clave:

`begai:guestId:<hotelId>`

El widget ahora:

- genera `guest-${uuid}` si no existe
- reutiliza el `guestId` si ya está persistido
- lo envía en cada `POST /api/chat`
- permite que backend resuelva el alias `web:<guestId>`

Validación técnica:

- reset backend con `scripts/wipe-conversations-and-messages.ts`
- limpieza manual de `localStorage`
- prueba manual del widget con persistencia confirmada entre mensajes y recarga

Impacto arquitectónico:

La identidad web del widget queda alineada con el modelo guest-centric
multicanal ya existente en WhatsApp y en el ChatPage interno, mejorando
continuidad conversacional, calidad de Guests y base para CRM/timeline
multicanal futuro.

### UI-INBOX-01

Estado: COMPLETADO  
Fecha: 2026-03-11  
Commit: 3847642

Descripción:

Se refina la experiencia operativa del módulo Inbox para recepción hotelera.

Antes de este cambio el Inbox mostraba demasiada telemetría técnica y la
jerarquía visual entre huésped, conversación activa, canal y pendientes no era
lo suficientemente clara para operación diaria.

La corrección reorganiza el Inbox para destacar:

- conversación activa
- canal activo
- estado del thread
- última actividad
- número de threads del huésped
- resumen compacto del huésped actual
- visibilidad de pendientes

Archivos modificados:

- `components/admin/ChannelInbox.tsx`
- `components/admin/ConversationsTabs.tsx`

Impacto:

Inbox pasa a comportarse más claramente como bandeja operativa multicanal para
recepción, sin modificar backend, contratos API ni modelo de datos.

### UX-GUESTS-01

Estado: COMPLETADO  
Fecha: 2026-03-11  
Commit: 84691ad

Descripción:

Se ajusta el lenguaje visible del módulo Guests para reemplazar terminología
técnica por lenguaje operativo orientado a recepción hotelera.

La UI pasa a usar expresiones como:

- `Huéspedes`
- `Unificar huéspedes`
- `Identidades del huésped`
- `Canales de contacto`
- `Conversaciones`
- `Huésped principal` / `Huésped secundario`

El cambio afecta títulos, labels, placeholders, confirmaciones, botones y
textos explicativos del módulo.

Archivo modificado:

- `app/admin/guests/page.tsx`

Impacto:

Mejora la comprensión y usabilidad del dominio Guests para recepción sin
modificar backend, modelo de datos ni lógica de unificación.

### DOC-AGENTS-WORKFLOW-01

Estado: COMPLETADO  
Fecha: 2026-03-12

Descripción:

Se incorpora un documento operativo para definir el flujo de trabajo entre los
agentes usados en Begasist.

Archivo incorporado:

- `docs/agents_workflow.md`

Contenido principal:

- chats fijos por agente
- orden recomendado entre Arquitectura, Repo Guardian, Técnico, Marcelo y HDOC
- reglas de disciplina (`1 commit = 1 hito`, `CODE -> COMMIT -> HASH -> DOC`)
- plantilla de handoff entre agentes

Impacto:

Se formaliza la coordinación multiagente del proyecto sin cargar esa lógica
dentro de `config.toml`, manteniendo separadas:
- definición de agentes
- flujo operativo entre agentes

### DOC-ARCH-DEBT-THREAD-DOMAIN-VNEXT-LOG-01

Estado: COMPLETADO  
Fecha: 2026-03-12  
Commit: d271a43a17236753eb545eab446be7f7600f0217

Descripción:

Se registra en la bitácora arquitectónica la deuda aprobada para `VNEXT` que
introduce `Thread` como entidad de dominio superior a `Conversation`.

La decisión deja explícito que el modelo actual se mantiene en:

`Guest -> Conversation -> Channel`

y que el modelo objetivo para una gran versión sería:

`Guest -> Thread -> Conversation -> Channel`

Archivos documentales afectados:

- `docs/architecture/thread_domain_vnext_debt.md`
- `docs/architecture/README.md`
- `docs/README.md`

Impacto:

Queda trazada en la secuencia histórica del proyecto la decisión de postergar
este cambio de dominio y se evita introducir `thread` como contrato backend
antes de una revisión arquitectónica mayor.

### DOC-UI-INBOX-LABELS-01

Estado: COMPLETADO  
Fecha: 2026-03-12  
Commit: 6a9ae0b

Descripción:

Se documenta el ajuste textual del módulo `Inbox` para alinear la UI visible
con el modelo actual del sistema, donde la unidad persistida y contada sigue
siendo `Conversation`.

El cambio reemplaza labels ambiguos vinculados a `thread` por lenguaje
operativo basado en conversaciones, incluyendo:

- `Threads` -> `Conversaciones`
- `conv.` -> `conversaciones`
- `thread(s) del huésped` -> `conversacion(es) del huésped`

Archivos afectados:

- `components/admin/ChannelInbox.tsx`
- `docs/architecture/admin_panel.md`

Impacto:

Se evita presentar `Thread` como entidad activa en la UI actual y queda
alineada la documentación con la deuda arquitectónica `VNEXT` ya registrada.

### DOC-UI-INBOX-LABELS-01A

Estado: COMPLETADO  
Fecha: 2026-03-12  
Commit: d8230cc434208e6706bfc7f2425eadf03f6ff9ef

Descripción:

Se documenta un ajuste textual adicional del módulo `Inbox` para mantener la
UI alineada con el modelo actual basado en conversaciones, sin introducir
semántica de `thread` como entidad activa.

El cambio aplica una abreviación visual y corrige labels operativos, incluyendo:

- `Conversaciones` -> `Conv.` por restricción visual
- `thread activo` -> `conversacion activa`
- `thread(s) activos` -> `conversaciones activas`

Archivos afectados:

- `components/admin/ChannelInbox.tsx`
- `components/admin/ConversationsTabs.tsx`

Impacto:

Se preserva consistencia semántica entre la UI actual, el modelo persistido por
`Conversation` y la deuda arquitectónica `Thread` reservada para `VNEXT`.

### DOC-FIX-EMAIL-PIPELINE-IDENTITY-01

Estado: COMPLETADO  
Fecha: 2026-03-12  
Commit: 72f999d97607360db90605adf88296eeb1ef6c30

Descripción:

Se registra el fix del canal Email para que la entrada converja por el camino
canónico `handleChannelMessage(...)`, preserve el remitente real como identidad
operativa y no trate el `conversationId` derivado por el parser como verdad de
dominio.

Cambios funcionales documentados:

- Email entra por `handleChannelMessage(...)`
- se preserva el remitente real como alias/identidad operativa
- el binding conversacional vuelve a quedar gobernado por el pipeline
- la idempotencia pasa a resolverse con scope `hotelId + originalMessageId`

Archivos afectados:

- `lib/services/email.ts`
- `lib/pipeline/handleChannelMessage.ts`
- `test/unit/email.pipelineIdentity.spec.ts`

Validación:

- `pnpm exec vitest run test/unit/email.pipelineIdentity.spec.ts test/golden/guestIdentity.golden.spec.ts test/integration/guestConversationBinding.spec.ts test/integration/api_admin_conversations.test.ts test/integration/api_admin_guest_profile.test.ts test/integration/api_messages_by-conversation.test.ts test/unit/email.resolveCredentials.spec.ts`

Impacto:

Se alinea el canal Email con la arquitectura multicanal vigente: transporte
separado del dominio, identidad canónica por `guestId` y binding de
conversaciones resuelto por el pipeline central.

### DOC-FIX-EMAIL-POLLING-SHUTDOWN-01

Estado: COMPLETADO  
Fecha: 2026-03-12  
Commit: 1b6a0621f5996b05f11e8f8146215a0f119fb72c

Descripción:

Se registra el hardening operativo del canal Email para evitar múltiples
runtimes por `hotelId`, detener efectivamente el proceso cuando el polling se
apaga y consolidar un marcado durable de correos ya procesados.

Alcance documentado:

- guard de unicidad por `hotelId`
- lock Redis para evitar runtimes duplicados
- stop efectivo del runtime cuando polling pasa a `false`
- corte entre mensajes si el polling se apaga durante el batch
- marcado IMAP durable con `\\Seen` y `RAGBOT_PROCESSED`

Archivos afectados:

- `lib/services/email.ts`
- `test/unit/email.pollingShutdown.spec.ts`

Validación:

- `pnpm exec vitest run test/unit/email.pollingShutdown.spec.ts test/unit/email.pipelineIdentity.spec.ts test/golden/guestIdentity.golden.spec.ts test/unit/email.resolveCredentials.spec.ts`

Impacto:

Se reduce el riesgo de duplicación de procesamiento y se refuerza la operación
single-runtime por hotel en el canal Email, sin alterar UI, Inbox/Admin ni
supervisión manual.

### DOC-ADR-EMAIL-TRANSPORT-TARGET-01

Estado: COMPLETADO  
Fecha: 2026-03-13  
Commit: d3765ad

Descripción:

Se registra el ADR que define la arquitectura objetivo del transporte Email en
producción, preservando el pipeline conversacional central y separando
explícitamente transporte, normalización, control técnico y dominio.

Puntos centrales documentados:

- `email` unificado en dominio
- transporte Email especializado
- polling IMAP relegado a transición o fallback
- separación de identidades técnicas
- entidad técnica intermedia `EmailInboundRecord`
- consideración de convivencia con infraestructura legacy y primer hotel

Archivos afectados:

- `docs/architecture/adr_email_transport_target.md`
- `docs/architecture/README.md`
- `docs/README.md`

Impacto:

Queda trazada en la bitácora la dirección arquitectónica del canal Email para
producción sin modificar aún la implementación técnica del transporte.

### DOC-FIX-EMAIL-LEGACY-CONTAINMENT-01

Estado: COMPLETADO  
Fecha: 2026-03-13  
Commit: cbe94bfc5ca2689819648fe7ec971278eb60a632

Descripción:

Se registra la contención táctica del runtime Email legacy para transición y
fallback, agregando guardas operativas para reducir riesgo de procesamiento no
controlado sobre inbox real sin alterar el modelo conversacional central.

Alcance documentado:

- `safe mode`
- lookback temporal
- máximo de mensajes por batch
- `allowed senders`
- observabilidad por UID, flags, remitente y `messageId`
- guard de proceso único
- shutdown efectivo
- marcado durable `\\Seen` + `RAGBOT_PROCESSED`

Validación:

- `pnpm run ts-check` PASS
- `pnpm exec vitest run test/unit/email.pollingShutdown.spec.ts test/unit/email.pipelineIdentity.spec.ts test/unit/email.resolveCredentials.spec.ts` PASS
- prueba real inbound controlada PASS parcial:
  - arranque PASS
  - contención legacy PASS
  - procesamiento inbound PASS
  - salida SMTP FAIL por `EAUTH 535`

Archivos afectados:

- `lib/services/email.ts`
- `test/unit/email.pollingShutdown.spec.ts`

Impacto:

Se mejora la contención operativa del canal Email legacy como mecanismo de
transición/fallback. La autenticación SMTP fallida (`EAUTH 535`) queda
explícitamente fuera del objetivo principal de este hito.

Política operativa del legacy email:

- uso permitido:
  - pruebas controladas
  - pilotos con remitentes seleccionados
  - onboarding inicial de hotel
  - operación de bajo volumen bajo monitoreo activo
- uso no permitido:
  - asumirlo como arquitectura objetivo del canal email
  - escalarlo como base estructural definitiva
  - agregarle capacidades estratégicas de largo plazo fuera de contención táctica

Condición:

- su uso debe mantenerse acotado, observable y reversible

### DOC-FIX-EMAIL-SMTP-CREDS-01

Estado: COMPLETADO  
Fecha: 2026-03-13  
Commit: 751995c43a4b854148ea2f091f803a8242a514ac

Descripción:

Se registra el fix mínimo que alinea SMTP con la credencial efectiva usada por
IMAP cuando el runtime Email legacy entra por fallback con `EMAIL_PASS`.

Contexto documentado:

- IMAP podía autenticar por fallback con `EMAIL_PASS`
- SMTP seguía usando la credencial inline original
- eso generaba `EAUTH 535` en outbound aunque el inbound funcionara

Alcance del fix:

- se introduce credencial efectiva de runtime para Email legacy
- si IMAP entra con fallback, SMTP se reconstruye con la misma password efectiva
- se agrega prueba unitaria específica del caso

Validación:

- `pnpm run ts-check` PASS
- `pnpm exec vitest run test/unit/email.smtpAuthFallback.spec.ts test/unit/email.pollingShutdown.spec.ts test/unit/email.resolveCredentials.spec.ts` PASS
- prueba real controlada PASS:
  - inbound email OK
  - no generó guest nuevo
  - reutilizó guest existente
  - reutilizó conversación existente
  - reply outbound enviado correctamente
  - desapareció `EAUTH 535`

Archivos afectados:

- `lib/services/email.ts`
- `test/unit/email.smtpAuthFallback.spec.ts`

Impacto:

Se corrige una desalineación táctica SMTP/IMAP del runtime Email legacy sin
rediseñar el transporte Email ni alterar la dirección arquitectónica ya fijada
en el ADR correspondiente.

### DOC-FIX-WIDGET-FIRST-RESPONSE-01

Estado: COMPLETADO  
Fecha: 2026-03-13  
Commit: 1323293

Descripción:

Se registra el ajuste de routing/clasificación que corrige la primera respuesta
del widget para que consultas hoteleras básicas de disponibilidad no caigan
erróneamente en contexto de eventos.

Caso reportado:

- entrada: `Quiero consultar disponibilidad para este fin de semana`
- resultado post-fix: `¿Cuál es tu nombre y cuántos huéspedes se alojarán?`

Archivos afectados:

- `lib/agents/classifyNode.ts`
- `lib/agents/graph.ts`
- `lib/agents/helpers.ts`
- `test/unit/graph.routingDebug.test.ts`
- `test/unit/classifyNode.reservationPriority.spec.ts`

Validación:

- `pnpm exec vitest run test/api.chat.route.spec.ts test/integration/api_chat.test.ts test/frontend/chatPage.lang.spec.tsx test/frontend/chatPage.faq.spec.tsx test/frontend/chatPage.quickActions.spec.tsx test/availability.unified.flow.spec.ts test/unit/retrieval.intentGuards.test.ts test/unit/graph.routingDebug.test.ts test/unit/events.followupRouting.test.ts test/unit/classifyNode.reservationPriority.spec.ts` PASS
- `pnpm run ts-check` PASS

Impacto:

Se reduce una clasificación inicial incorrecta en el widget y se refuerza la
prioridad del flujo de disponibilidad/reserva por encima del contexto de
eventos en consultas hoteleras básicas.

### DOC-FIX-RESERVATION-FIRST-TURN-ASK-01

Estado: COMPLETADO  
Fecha: 2026-03-14  
Commit: 8814a49e5d326efc1b2e555f1a632c525d988a96

Descripción:

Se registra el ajuste de `reservation_flow` para que pricing y disponibilidad
no queden bloqueados por `guestName` en el primer turno.

El gating previo a cotización/disponibilidad pasa a usar solo slots
transaccionales:

- `roomType`
- `checkIn`
- `checkOut`
- `numGuests`

Además, el flujo evita asks combinados pobres y fuerza la pregunta canónica del
slot transaccional faltante.

Validación:

- `pnpm exec vitest run test/graph.reservation.persist.spec.ts test/availability.unified.flow.spec.ts test/freezer/e2e.reservation.flow.spec.ts` PASS
- `pnpm run ts-check` PASS

Validación manual:

- `Quisiera saber tarifas para una habitación doble` -> `¿Cuál es la fecha de check-in?`
- `Quiero consultar disponibilidad para este fin de semana` -> `¿Cuál es el tipo de habitación?`

Archivos afectados:

- `lib/agents/nodes/reservation.ts`
- `test/graph.reservation.persist.spec.ts`

Impacto:

Se mejora el primer ask del flujo de reservas para consultas de pricing y
disponibilidad, priorizando datos transaccionales antes de pedir identidad del
huésped.

### DOC-FIX-PRICING-ROUTING-01

Estado: COMPLETADO  
Fecha: 2026-03-14  
Commit: ef2cb0e

Descripción:

Se registra el ajuste de routing para que intents transaccionales de pricing no
caigan en `pricing_info` ni en bypass de KB, sino que entren al flujo de
reserva.

Cambios documentados:

- `pricing_request` pasa a mapearse a `reservation`
- se detecta pricing transaccional con señales de tarifa + habitación/reserva
- se evita el fast-path de KB en esos casos

Archivos afectados:

- `lib/agents/orchestratorAgent.ts`
- `lib/handlers/messageHandler.ts`

Impacto:

Las consultas de tarifas orientadas a cotización/reserva quedan alineadas con
el flujo transaccional correcto en lugar de tratarse como información general.

### DOC-DEBUG-FORCED-LLM-CLASSIFIER-01

Estado: COMPLETADO  
Fecha: 2026-03-14  
Commit: c02ba5a

Descripción:

Se registra la incorporación de una rama forzada de clasificación por LLM
controlada mediante `FORCE_LLM_CLASSIFIER`, con trazas específicas para auditar
attempt, result, fallback y guardrails preemptados.

Archivos afectados:

- `lib/agents/graph.ts`
- `test/unit/graph.routingDebug.test.ts`

Impacto:

Se mejora la capacidad de diagnóstico del routing conversacional al permitir
forzar la clasificación LLM y observar con mayor detalle su interacción con las
guardrails heurísticas.

### DOC-DEBUG-RUNTIME-LOG-MIRROR-01

Estado: COMPLETADO  
Fecha: 2026-03-14  
Commit: 9f53908

Descripción:

Se registra el ajuste de observabilidad runtime que centraliza escritura en
`log.txt` y espeja salida de consola en los entrypoints operativos.

Cambios documentados:

- serialización más robusta de objetos y errores
- mirror de `console.log/info/warn/error` a archivo
- activación del writer en entrypoints principales

Archivos afectados:

- `lib/utils/debugLog.ts`
- `lib/entrypoints/all.ts`
- `lib/entrypoints/channelBot.ts`
- `lib/entrypoints/email.ts`
- `lib/entrypoints/whatsapp.ts`

Impacto:

Se refuerza la trazabilidad operativa del runtime sin alterar contratos
funcionales del sistema.

### DOC-HITO-PIPELINE-01-ROUTING-OBSERVABILITY-BASELINE

Estado: COMPLETADO  
Fecha: 2026-03-16  
Commit: 903f87ea29e351bcca1254f5c60efe9987b3b55d

Descripción:

Se registra el baseline de observabilidad del routing del pipeline mediante una
línea homogénea `[routing][decision]` en `messageHandler.ts`.

Campos normalizados:

- `decision_layer`
- `route_source`
- `route_match`
- `early_return`
- `used_llm_classifier`
- `classifier_source`
- `final_category`
- `final_promptKey`

Cobertura documentada del baseline:

- fast-path de saludo de test
- fast-path KB seguro
- billing forzado
- billing deterministic fallback
- salida del `agentGraph`
- postprocess fallback cuando hay `finalText` sin `route_source` del grafo

Validación:

- `pnpm exec vitest run test/unit/messageHandler.routing_observability.spec.ts test/unit/graph.routingDebug.test.ts test/unit/messageHandler.pricing_kb_bypass.spec.ts test/api.chat.route.spec.ts test/integration/api_chat.test.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.routing_observability.spec.ts`

Impacto:

Queda trazabilidad consistente del routing del pipeline sin introducir un
cambio funcional de negocio; este hito establece baseline de observabilidad.

### DOC-HITO-PIPELINE-02-HEURISTIC-INVENTORY-CONVERGENCE

Estado: COMPLETADO  
Fecha: 2026-03-16  
Commit: 7be2e2f0eb0411f1f0a2c1970f60595f2b4a91ec

Descripción:

Se registra la convergencia interna del inventario heurístico textual del
routing conversacional mediante un módulo compartido reutilizado por
`graph.ts` y `classifyNode.ts`.

Alcance documentado:

- se crea `lib/agents/classify/routingText.ts` como fuente compartida
- `graph.ts` y `classifyNode.ts` consumen esa fuente común
- se reduce duplicación textual sin cambiar policy ni orden de decisión
- no se alteran umbrales ni escalado a LLM
- `helpers.ts` queda intacto para no ampliar alcance
- `keywords.ts` se mantiene como fuente explícita de regex rápidas por dominio

Validación:

- `pnpm exec vitest run test/unit/graph.routingDebug.test.ts test/unit/classifyNode.reservationPriority.spec.ts test/availability.unified.flow.spec.ts test/api.chat.route.spec.ts test/integration/api_chat.test.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/agents/classify/routingText.ts`
- `lib/agents/classifyNode.ts`
- `lib/agents/graph.ts`

Impacto:

Se mejora mantenibilidad del routing heurístico al converger lógica textual
duplicada en una única fuente compartida, sin introducir cambio funcional.

### DOC-HITO-PIPELINE-03-BODYLLM-FASTPATH-BOUNDARIES

Estado: COMPLETADO  
Fecha: 2026-03-16  
Commit: 5baf491f0ec2172450cb8633b4b50186c47e1b48

Descripción:

Se registra la delimitación interna de `bodyLLM` para hacer explícitas las
fronteras entre fast-paths transaccionales previos, shortcut de test, KB /
billing determinista, graph path y fallback/enrichment estructurado post-graph.

Cambios internos documentados:

- `BodyLLMState` explícito para aislar estado mutable
- helper `tryBodyLLMTestGreetingFastpath`
- helper `tryBodyLLMStructuredEnrichment`
- helper `tryBodyLLMStructuredFallback`

Validación:

- `pnpm exec vitest run test/unit/messageHandler.routing_observability.spec.ts test/unit/messageHandler.pricing_kb_bypass.spec.ts test/api.chat.route.spec.ts test/integration/api_chat.test.ts test/availability.unified.flow.spec.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Impacto:

Se explicitan fronteras internas y baseline de organización dentro de
`bodyLLM` sin introducir cambio funcional de policy ni de routing externo.

### DOC-HITO-PIPELINE-04-DECISION-POLICY-EXTRACTION

Estado: COMPLETADO  
Fecha: 2026-03-16  
Commit: 875be4879b40803306f3dd4c0eea7e9b0fa44c0a

Descripción:

Se registra la extracción de la policy real de decisión desde `classifyNode(...)`
en `graph.ts` hacia un módulo dedicado.

Estado resultante:

- `graph.ts` queda como capa de orquestación/ejecución
- lectura de `convState`
- llamada a `evaluateGraphRoutingPolicy(...)`

La policy extraída conserva:

- guardrails por estado
- heurísticas tempranas
- snapshot/verify
- refuerzos por slots
- `FORCE_LLM_CLASSIFIER`
- fallback a `heuristicClassify(...)`
- selección de `category`, `desiredAction` y `promptKey`

Validación:

- `pnpm exec vitest run test/unit/graph.routingDebug.test.ts test/unit/classifyNode.reservationPriority.spec.ts test/availability.unified.flow.spec.ts test/api.chat.route.spec.ts test/integration/api_chat.test.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/agents/classify/policy.ts`
- `lib/agents/graph.ts`

Impacto:

Se desacopla la policy de decisión del nodo del grafo para mejorar legibilidad y
evolución interna, sin introducir cambio funcional de comportamiento.

### DOC-HITO-PIPELINE-05-LLM-ESCALATION-POLICY

Estado: COMPLETADO  
Fecha: 2026-03-16  
Commit: eb61c68f5f8ee016e1e9b405b3a5df3d9a0a0fc0

Descripción:

Se registra la explicitación de la policy de escalado a classifier/LLM dentro
del routing, extrayendo la decisión a `decideLlmEscalationPolicy(...)` y
agregando trazabilidad homogénea del ciclo de escalado.

Señales explicitadas:

- `FORCE_LLM_CLASSIFIER`
- `LOW_HEURISTIC_CONFIDENCE`
- `NONE`

Campos explicitados:

- `should_escalate`
- `classifier_source`
- `escalation_signal`
- `escalation_reason`
- `heuristic_confidence`
- `heuristic_category`

Cobertura documentada:

- decisión
- attempt
- result
- fallback

Validación:

- `pnpm exec vitest run test/unit/policy.llmEscalation.spec.ts test/unit/graph.routingDebug.test.ts test/unit/classifyNode.reservationPriority.spec.ts test/availability.unified.flow.spec.ts test/api.chat.route.spec.ts test/integration/api_chat.test.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/agents/classify/policy.ts`
- `test/unit/policy.llmEscalation.spec.ts`

Impacto:

Se vuelve explícita la policy de escalado a classifier/LLM como cambio
controlado de routing interno, sin alterar contratos públicos.

### DOC-HITO-PIPELINE-06-CLASSIFIER-VS-HEURISTIC-RATIONALIZATION

Estado: COMPLETADO  
Fecha: 2026-03-16  
Commit: b475f2c34a5a1b1eb3ff01213c5c1f0a46529dc8

Descripción:

Se registra la racionalización del contrato entre heurística y classifier
dentro del routing.

La policy pasa a distinguir explícitamente:

- `heuristicRole = strong_signal | proposal`
- `classifierRole = forced | correction_or_confirmation | not_used`

Se mantienen intactos los guardrails duros previos.

Cambio controlado documentado:

- se agrega un caso mínimo adicional de escalado cuando la heurística queda en
  `retrieval_based` + `ambiguity_policy` con confianza media (`< 0.9`)

Contrato explícito resultante:

- heurística fuerte cierra
- heurística ambigua propone
- classifier confirma o corrige

Validación:

- `pnpm exec vitest run test/unit/policy.llmEscalation.spec.ts test/unit/graph.routingDebug.test.ts test/unit/classifyNode.reservationPriority.spec.ts test/availability.unified.flow.spec.ts test/api.chat.route.spec.ts test/integration/api_chat.test.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/agents/classify/policy.ts`
- `test/unit/policy.llmEscalation.spec.ts`

Impacto:

Queda explícito el contrato entre heurística y classifier como cambio
controlado de policy interna, sin rediseñar el router ni alterar contratos
públicos.

### DOC-HITO-PIPELINE-07-PROMPT-SELECTION-DECOUPLING

Estado: COMPLETADO  
Fecha: 2026-03-16  
Commit: e6eb3b4f2bc53b62e868e2201611fd75373c6e9b

Descripción:

Se registra el desacople parcial entre clasificación/intención y resolución de
`promptKey` dentro de la policy de routing.

La resolución se extrae a `resolvePromptKey(...)` y se incorpora
`buildRoutingPayload(...)` para ensamblar el resultado final sin mezclar tanto
la clasificación con la selección de `promptKey`.

Alcance interno documentado:

- heurística genérica
- classifier forzado
- classifier por escalado normal

Se mantienen intactos:

- contratos públicos
- forma final del payload
- guardrails duros con `promptKey` explícito

Validación:

- `pnpm exec vitest run test/unit/policy.llmEscalation.spec.ts test/unit/graph.routingDebug.test.ts test/unit/classifyNode.reservationPriority.spec.ts test/availability.unified.flow.spec.ts test/api.chat.route.spec.ts test/integration/api_chat.test.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/agents/classify/policy.ts`
- `test/unit/policy.llmEscalation.spec.ts`

Impacto:

Se desacopla internamente la resolución de `promptKey` de la policy sin cambiar
contratos públicos, payload final ni comportamiento funcional observable.

### DOC-HITO-PIPELINE-08-ADR-PIPELINE-RUNTIME-TARGET

Estado: COMPLETADO  
Fecha: 2026-03-16  
Commit técnico asociado: no aplica

Descripción:

Se registra el ADR de cierre de la serie `PIPELINE-SIGNAL-ARCH`, preservando
como contenido central la decisión arquitectónica validada sobre el runtime
principal del pipeline conversacional.

Decisión documentada:

- `messageHandler` permanece como runtime principal vigente
- `mhFlowGraph` no se adopta todavía como runtime operativo principal
- `mhFlowGraph` queda como candidato condicionado para una migración gradual
  futura

Serie cerrada por este ADR:

- `HITO-PIPELINE-01 / ROUTING-OBSERVABILITY-BASELINE`
- `HITO-PIPELINE-02 / HEURISTIC-INVENTORY-CONVERGENCE`
- `HITO-PIPELINE-03 / BODYLLM-FASTPATH-BOUNDARIES`
- `HITO-PIPELINE-04 / DECISION-POLICY-EXTRACTION`
- `HITO-PIPELINE-05 / LLM-ESCALATION-POLICY`
- `HITO-PIPELINE-06 / CLASSIFIER-VS-HEURISTIC-RATIONALIZATION`
- `HITO-PIPELINE-07 / PROMPT-SELECTION-DECOUPLING`

Archivos afectados:

- `docs/architecture/adr_pipeline_runtime_target.md`
- `docs/architecture/README.md`
- `docs/README.md`

Impacto:

Queda formalmente cerrada la serie `PIPELINE-SIGNAL-ARCH` mediante un ADR que
fija a `messageHandler` como runtime principal vigente y deja a
`mhFlowGraph` como candidato condicionado, sin asociar este hito a un commit
técnico nuevo.

### DOC-FIX-RESERVATION-CONFIRM-BEFORE-NAME-01

Estado: COMPLETADO  
Fecha: 2026-03-17  
Commit: f3e79cbf91cbd3003e6d3bfa4403078716cc9a61

Descripción:

Se registra el fix del flujo de reserva para impedir que agregue la CTA de
confirmación `CONFIRMAR` antes de completar `guestName`, preservando la
posibilidad de cotizar o consultar disponibilidad antes de capturar el nombre.

Reglas corregidas:

- `CONFIRMAR` solo se agrega si el snapshot ya tiene `guestName` válido
- si falta `guestName`, el flujo puede cotizar y pedir nombre, pero no ofrecer
  confirmación
- cuando el usuario responde el nombre en el turno siguiente, ese `guestName`
  se incorpora antes del branch de quote

Drift observado:

- `test/e2e.reservation.golden-transcripts.spec.ts`
- caso `T2: missing name -> follow-up -> confirm`

Validación:

- `pnpm exec vitest run test/e2e.reservation.golden-transcripts.spec.ts test/graph.reservation.persist.spec.ts test/e2e.reservation.flow.spec.ts test/availability.unified.flow.spec.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/agents/nodes/reservation.ts`
- `test/e2e.reservation.golden-transcripts.spec.ts`
- `test/graph.reservation.persist.spec.ts`

Impacto:

Se evita ofrecer confirmación prematura antes de completar `guestName` sin
mezclar este fix con la hipótesis separada de contaminación global de tests.

### DOC-FIX-TEST-ENV-LEAK-ROUTING-01

Estado: COMPLETADO  
Fecha: 2026-03-17  
Commit: 6954e9d7d724ef11788b730ee93f8a09edec9132

Descripción:

Se registra un hygiene fix acotado para restaurar flags de entorno de routing
que quedaban activados entre suites de tests.

Causa parcial corregida:

- suites de routing que seteaban `DEBUG_ROUTING`
- suites de routing que seteaban `FORCE_LLM_CLASSIFIER`
- ausencia de restauración explícita al terminar

Qué corrigió:

- eliminó leak real de env entre suites
- mejoró el aislamiento del bloque afectado
- el bloque de 3 tests antes fallido pasó aislado

Qué no corrigió completamente:

- la batería completa siguió mostrando 2 timeouts residuales
- esa investigación queda separada en `FIX-TEST-DEBUGLOG-CONSOLE-WRAP-ONCE-01`

Validación:

- `pnpm exec vitest run test/unit/graph.routingDebug.test.ts test/unit/events.followupRouting.test.ts test/api.chat.route.spec.ts test/integration/api_chat.test.ts test/integration/guestConversationBinding.spec.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `test/unit/graph.routingDebug.test.ts`
- `test/unit/events.followupRouting.test.ts`

Impacto:

Queda documentado como hygiene fix acotado con mejora verificada y causa
parcial corregida, sin narrarlo como resolución total del incidente global de
timeouts.

### DOC-FIX-TEST-DEBUGLOG-CONSOLE-WRAP-ONCE-01

Estado: COMPLETADO  
Fecha: 2026-03-17  
Commit: 21d8644c47e8bb7126ad3032bc61c49433446233

Descripción:

Se registra el fix de test hygiene que corrige el rewrap múltiple de
`console.log/info/warn/error` desde `lib/utils/debugLog.ts` durante corridas
amplias con reimports y `vi.resetModules()`.

Fix aplicado:

- `lib/utils/debugLog.ts` instala hooks de `console.*` una sola vez por proceso
- se evita rewrap en reimports y `resetModules`
- se evita repetir `TRACE module loaded` como instalación múltiple
- se agrega cobertura mínima del comportamiento `wrap once`
- `test/api.chat.route.spec.ts` usa `POST` estático en casos 400 rápidos y deja
  import fresco solo para el caso 500 que relee env

Validación:

- `pnpm exec vitest run test/api.chat.route.spec.ts test/integration/api_chat.test.ts test/integration/guestConversationBinding.spec.ts test/unit/debugLog.wrapOnce.spec.ts` PASS
- `pnpm run ts-check` PASS
- `pnpm run test:run` PASS

Resultado global final:

- `117/117` archivos en PASS
- `339/339` tests en PASS

Archivos afectados:

- `lib/utils/debugLog.ts`
- `test/api.chat.route.spec.ts`
- `test/unit/debugLog.wrapOnce.spec.ts`

Impacto:

Queda cerrado el residual de timeouts por test hygiene sin introducir cambios
funcionales en el producto.

### DOC-FIX-CM-INMEMORY-DEMO-CREDIBILITY-01

Estado: COMPLETADO  
Fecha: 2026-03-17  
Commit: da341789d94f96d62f6bd84bd314352c72f22165

Descripción:

Se registra una mejora de credibilidad demo del Channel Manager in-memory en
disponibilidad y cotización, sin modificar la arquitectura MCP ni convertir el
adapter en un PMS real.

Cambios documentados:

- catálogo demo explícito con `basePrice`, `stock` y `maxGuests`
- `searchAvailability(...)` filtra por capacidad según `guests`
- `searchAvailability(...)` descuenta stock por reservas superpuestas del mismo
  `roomType`
- `searchAvailability(...)` aplica una regla simple de presión por estadías
  largas
- `searchAvailability(...)` ajusta tarifa por temporada alta y fin de semana
- `createReservation(...)` alinea `pricePerNight` con la misma regla simple del
  quote

Validación:

- `pnpm exec vitest run test/unit/channelManagerAdapter.registry.spec.ts test/integration/reservations.mcp.channel-manager.spec.ts test/availability.unified.flow.spec.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/mcp/channelManagerAdapter.ts`
- `test/unit/channelManagerAdapter.registry.spec.ts`

Impacto:

Se mejora la credibilidad del modo demo in-memory para disponibilidad y quote
sin cambiar la arquitectura MCP ni presentar el adapter como PMS real.

### DOC-RESERVATION-WIDGET-DEMO-FLOW-STABILIZATION-01-A

Estado: COMPLETADO  
Fecha: 2026-03-17  
Commit: f8f2ecd3183c270ce9a777206840ce7fe6ca8d15

Descripción:

Se registra el bloque A de estabilización del flujo demo de reserva en
widget/web chat, centrado en continuidad conversacional y cierre real de la
reserva desde una intención natural hasta la confirmación efectiva.

Cobertura consolidada:

- coherencia mínima de fechas
- bypass de KB para `roomType`, huéspedes y `guestName` en follow-ups
  transaccionales
- guard de check-in pasado en el path real
- limpieza de contaminación por fecha inválida previa
- continuidad de afirmativos (`si`, `sí`, `ok`, `dale`) para verificación
- prevención de falso positivo de `guestName = "Si"`
- continuidad del follow-up de nombre completo
- cierre real al responder `CONFIRMAR`

Validación:

- múltiples suites unitarias focalizadas por hito
- `pnpm run ts-check` PASS
- validación manual real del widget con cierre completo de reserva PASS

Resultado funcional final validado:

- el flujo llega hasta `✅ ¡Reserva confirmada! ...` en widget/web chat

Archivos afectados:

- `lib/agents/helpers.ts`
- `lib/agents/nodes/reservation.ts`
- `lib/db/convState.ts`
- `lib/handlers/messageHandler.ts`
- `lib/handlers/pipeline/availability.ts`
- `lib/handlers/pipeline/dateConsolidation.ts`
- `test/e2e.reservation.flow.spec.ts`
- `test/graph.reservation.persist.spec.ts`
- `test/unit/helpers.looksLikeName.spec.ts`
- `test/unit/messageHandler.availability_affirm_ack.test.ts`
- `test/unit/messageHandler.past_checkin_guard.test.ts`
- `test/unit/messageHandler.pricing_kb_bypass.spec.ts`
- `test/unit/messageHandler.reservation_confirm_followup.spec.ts`

Impacto:

Queda estabilizada la continuidad conversacional necesaria para llegar al cierre
real de reserva en widget/web chat, sin incluir el ajuste separado del código
humano del Channel Manager demo.

### DOC-FIX-CONVSTATE-CONVERSATIONSTAGE-AND-RESERVATION-INTENT-NORMALIZATION-01-B1

Estado: COMPLETADO  
Fecha: 2026-03-18  
Commit: 4cbeda95dd1d145414d93d40d882beab61b09c55

Descripción:

Se registra el bloque 1 del fix que endurece el runtime actual introduciendo
`conversationStage` en `conv_state` de forma compatible con `salesStage` y
centralizando una capa determinista de normalización de intents de reserva.

Cambios documentados:

- `convState.ts`
  - tipo `ConversationStage`
  - campo `conversationStage`
  - `deriveConversationStage(...)`
  - `upsertConvState(...)` deriva y persiste `conversationStage` cuando
    corresponde
- `availability.ts`
  - `normalizeReservationIntent(...)`
  - tipos `ReservationIntentKind` y `ReservationIntentNormalization`
  - `isPureConfirm(...)` pasa a usar normalización centralizada
- `messageHandler.ts`
  - guard de `isReservationConfirmFollowup`
  - ampliación de `hasReservationContext` para evitar que follow-ups cortos de
    confirmación caigan en KB fast-path

Casos cubiertos:

- `confirmar`
- `comfirmar`
- `confimar`
- `dale`
- `ok hacelo`
- `sí, adelante`
- `yes confirm`

Falsos positivos evitados:

- `no confirmes todavía`
- `quiero confirmar si tienen lugar`
- `antes de confirmar, ¿me recordás el precio?`

Validación:

- `pnpm exec vitest run test/unit/messageHandler.reservation_confirm_followup.spec.ts test/unit/availability.reservationIntentNormalization.spec.ts test/unit/convState.conversationStage.spec.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/db/convState.ts`
- `lib/handlers/messageHandler.ts`
- `lib/handlers/pipeline/availability.ts`
- `test/unit/availability.reservationIntentNormalization.spec.ts`
- `test/unit/convState.conversationStage.spec.ts`
- `test/unit/messageHandler.reservation_confirm_followup.spec.ts`

Impacto:

Se endurece el runtime actual de forma incremental y compatible, sin reemplazar
`messageHandler` ni introducir una state machine nueva.

### DOC-FIX-RESERVATION-INTENT-NORMALIZATION-MODIFY-CANCEL-01

Estado: COMPLETADO  
Fecha: 2026-03-18  
Commit: e3d4c71c33a0d8b3f0f61c3456d34e7131227308

Descripción:

Se registra la extensión del bloque previo `4cbeda9` para ampliar la
normalización determinista de intents de reserva a `modify` y `cancel`,
distinguiendo mejor entre intents ejecutables y consultas/no ejecutables
relacionadas.

Cambios documentados:

- `availability.ts`
  - `normalizeReservationIntent(...)` ahora clasifica `modify` y `cancel`
  - evita falsos positivos como:
    - `quiero saber si puedo cancelar`
    - `antes de cancelar, ¿me recordás la política?`
    - `si cancelo, me cobran?`
    - `quiero modificar si hay lugar`
- `messageHandler.ts`
  - conecta esa normalización a puntos reales del runtime:
    - `computeInModifyMode(...)`
    - `mentionsModify`
    - `wantsCancel`

Compatibilidad:

- no se tocaron `reservation.ts`, `dateConsolidation.ts` ni `policy.ts`
- no se tocaron contratos externos
- no se abrió refactor grande
- el cambio es incremental y compatible sobre el runtime vigente

Nota sobre tests:

- además de los tests nucleares, entran ajustes incidentales en mocks de
  suites de `messageHandler` porque `availability` incorpora el nuevo export
  `normalizeReservationIntent(...)`

Validación:

- `pnpm exec vitest run test/unit/availability.reservationIntentNormalization.spec.ts test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts test/unit/messageHandler.routing_observability.spec.ts test/unit/messageHandler.pricing_kb_bypass.spec.ts test/unit/messageHandler.rich.test.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/handlers/pipeline/availability.ts`
- `lib/handlers/messageHandler.ts`
- `test/unit/availability.reservationIntentNormalization.spec.ts`
- `test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts`
- `test/unit/messageHandler.routing_observability.spec.ts`
- `test/unit/messageHandler.pricing_kb_bypass.spec.ts`
- `test/unit/messageHandler.rich.test.ts`

Impacto:

Se extiende el endurecimiento iniciado en `4cbeda9` con un cambio técnico nuevo
y acotado, sin alterar contratos externos ni abrir un refactor mayor del
runtime vigente.

### DOC-FIX-RESERVATION-INTENT-NORMALIZATION-DETECTINTENT-01

Estado: COMPLETADO  
Fecha: 2026-03-18  
Commit: 6e6a9f3371e7706858e414cf7781fa0d6a52d1d2

Descripción:

Se registra la integración de `normalizeReservationIntent(...)` en un tercer
punto controlado del runtime: `detectIntent(...)`.

Cambio documentado:

- `detectIntent(...)` ahora consulta `normalizeReservationIntent(userText || "")`
- si el intent normalizado es `modify`, devuelve `modify` explícitamente antes
  de caer en regex legacy

Decisión de alcance:

- no se integró `cancel` en `detectIntent(...)`
- motivo: `detectIntent(...)` hoy devuelve solo `reservation | modify | ambiguous`
- `cancel` sigue gobernado por su branch explícita endurecida en el hito
  anterior

Nota de trazabilidad:

- este hito hace una integración incremental mínima
- no reescribe `detectIntent(...)`
- no toca `reservation.ts`, `dateConsolidation.ts`, `policy.ts` ni contratos
  externos
- persiste una semántica legacy previa donde `detectIntent(...)` todavía
  contiene regex histórica que menciona cancelación dentro de `asksModify`,
  pero este hito no la introduce ni la amplía

Validación:

- `pnpm exec vitest run test/unit/availability.reservationIntentNormalization.spec.ts test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts test/unit/messageHandler.routing_observability.spec.ts test/unit/messageHandler.pricing_kb_bypass.spec.ts test/unit/messageHandler.rich.test.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts`

Impacto:

Se integra `modify` por normalización determinista dentro de `detectIntent(...)`
sin convertir este hito en una reescritura completa del detector.

### DOC-FIX-RESERVATION-INTENT-NORMALIZATION-WANTSGENERICMODIFY-01

Estado: COMPLETADO  
Fecha: 2026-03-18  
Commit: a6bc7cc7ec022c76c9ad358c05f821cb8cd93806

Descripción:

Se registra la integración de la normalización determinista de intents de
reserva en `wantsGenericModify(...)` para endurecer modificación genérica sin
abrir un refactor grande.

Cambios documentados:

- `messageHandler.ts`
  - `wantsGenericModify(...)` ahora usa `normalizeReservationIntent(...)`
  - retorna positivo para `modify` ejecutable
  - agrega guard negativa para bloquear consultas exploratorias o no
    ejecutables antes del regex legacy
- `availability.ts`
  - se endurece `isModifyInquiry` para tratar como no ejecutables frases como:
    - `quiero saber si puedo modificar`
    - `antes de modificar...`
    - `si modifico, me cobran?`
    - `quiero cambiar si hay lugar`
- `test`
  - se agrega cobertura negativa para verificar que esos casos no activan menú
    genérico de modificación

Compatibilidad:

- no se tocaron más branches
- no se refactorizó el runtime
- no se tocaron contratos externos
- el cambio es incremental y compatible sobre la línea previa de normalización
  determinista

Validación:

- `pnpm exec vitest run test/unit/availability.reservationIntentNormalization.spec.ts test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts test/unit/messageHandler.pricing_kb_bypass.spec.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `lib/handlers/pipeline/availability.ts`
- `test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts`

Impacto:

El cambio queda limitado a `wantsGenericModify(...)` y al endurecimiento mínimo
necesario del normalizador, sin extenderse a un refactor mayor del runtime.

### DOC-FIX-RESERVATION-INTENT-NORMALIZATION-MODIFY-FASTPATH2-01

Estado: COMPLETADO  
Fecha: 2026-03-18  
Commit: 4f88e099f4878c1e4ecae24468b1eb760c762ddb

Descripción:

Se registra el endurecimiento del `Fast-path 2` de modificación en
`messageHandler.ts` para hacerlo depender más explícitamente de intent
ejecutable de modificación y menos de señales blandas legacy.

Cambios documentados:

- se recorta la rama legacy del `Fast-path 2`
- antes abría menú por una condición blanda:
  - `hasConfirmed && mentionsReservation && (looksGreeting || ...)`
- ahora ese acceso blando solo queda permitido como follow-up de modificación ya
  abierto:
  - `hasConfirmed && isModifyFollowupContext && mentionsReservation && looksGreeting`
- el menú de modificación pasa a depender principalmente de `genericModify`,
  que ya reutiliza `normalizeReservationIntent(...)`
- además se endurece el fallback inglés de `wantsGenericModify(...)` para
  aceptar mejor casos como `modify booking` y `edit booking`

Compatibilidad:

- no se tocaron `detectIntent(...)`, `reservation.ts`, `dateConsolidation.ts`,
  `policy.ts`, MCP/CM ni canales
- no se abrió refactor grande
- el cambio es incremental y compatible sobre el runtime vigente

Validación:

- `pnpm exec vitest run test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts test/unit/availability.reservationIntentNormalization.spec.ts test/unit/messageHandler.pricing_kb_bypass.spec.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts`

Impacto:

El cambio queda limitado al `Fast-path 2` de modificación y al ajuste mínimo
necesario de `wantsGenericModify(...)`, sin abrir un refactor mayor del
runtime.

### DOC-FIX-POSTBOOKING-RESERVATION-SNAPSHOT-QUERY-01

Estado: COMPLETADO  
Fecha: 2026-03-18  
Commit: af05297869346a80dc99555a4349e4139f6f323f

Descripción:

Se registra la incorporación de una ruta determinista y temprana para consultas
de snapshot sobre una reserva ya creada, usando el estado persistido y evitando
KB o LLM.

Hueco funcional cubierto:

- `cuál es mi reserva`
- `me recordás la reserva`
- `qué fechas reservé`
- `cuántos huéspedes puse`

Cambios documentados:

- `messageHandler.ts`
  - se agrega `detectReservationSnapshotQuery(...)`
  - se agrega `buildReservationSnapshotAnswer(...)`
  - en la misma frontera temprana donde ya se resuelve check-in/check-out
    post-booking:
    - se detectan consultas de snapshot
    - se usa `reservationSlots + lastReservation`
    - se responde sin pasar por KB/LLM
    - se limpia `graphResult/rich`
- `test`
  - se agrega cobertura para snapshot completo, fechas y huéspedes
  - se verifica que no caiga en respuesta de KB

Compatibilidad:

- no se tocaron otros branches del runtime
- no se tocaron contratos externos
- no se abrió refactor
- el cambio queda acotado al path post-booking con reserva confirmada

Validación:

- `pnpm exec vitest run test/unit/messageHandler.postbooking_reservation_snapshot.spec.ts test/unit/messageHandler.postbooking_checkin_context.spec.ts test/unit/messageHandler.pricing_kb_bypass.spec.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.postbooking_reservation_snapshot.spec.ts`

Impacto:

Se agrega una intercepción temprana determinista para snapshot post-booking sin
alterar el resto del flujo KB/LLM.

### DOC-FIX-CANCEL-RESERVATION-MULTITURN-CONTINUITY-01

Estado: COMPLETADO  
Fecha: 2026-03-18  
Commit: 66f22aee6eb2c443ec736e0910e2ce73044f2c54

Descripción:

Se registra el soporte explícito para continuidad multi-turno del flujo de
cancelación de reserva, preservando también el caso compacto donde el usuario
manda código y confirmación en el mismo turno.

Secuencia soportada:

1. intención de cancelar
2. pedido de código
3. usuario manda código
4. bot pide `CONFIRMAR`
5. usuario confirma
6. se ejecuta cancelación

Cambios documentados:

- `messageHandler.ts`
  - se ajusta la branch de cancelación para soportar continuidad multi-turno
  - se captura código
  - se persiste estado pendiente
  - se confirma en turno posterior
  - se limpia estado luego de cancelar
  - se preserva el caso compacto `cancelar RES123456 confirmar`
- `convState.ts`
  - se agrega `pendingCancellation`
  - se habilita persistencia explícita de `desiredAction`
- `test`
  - cubre secuencia multi-turno completa
  - cubre caso compacto
  - cubre negativos básicos

Compatibilidad:

- no se tocaron `reservations.ts`, MCP ni adapter
- no se abrió refactor grande del runtime
- el cambio es incremental y acotado al lifecycle de cancelación

Validación:

- `pnpm exec vitest run test/unit/messageHandler.cancel_multiturn_continuity.spec.ts test/unit/availability.reservationIntentNormalization.spec.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/db/convState.ts`
- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.cancel_multiturn_continuity.spec.ts`

Impacto:

Se agrega continuidad multi-turno mínima al flujo de cancelación sin rediseñar
el lifecycle general de reservas.

### DOC-FIX-RESERVATION-AVAILABILITY-ENTRY-DETECTINTENT-01

Estado: COMPLETADO  
Fecha: 2026-03-18  
Commit: 9f541c451f451a3d796d2a4eb60264c85a6070d0

Descripción:

Se registra el endurecimiento de `detectIntent(...)` para que availability
queries básicas entren al flujo de reserva desde el primer turno.

Casos cubiertos:

- `tienen disponibilidad`
- `hay disponibilidad`
- `tienen disponibilidad para este fin de semana`
- `availability for this weekend`
- `quiero saber si tienen disponibilidad`

Cambios documentados:

- `messageHandler.ts`
  - `detectIntent(...)` reconoce availability queries básicas como
    `reservation`
  - se preservan los intents ya existentes de `reservar` y `book`
  - no se tocan `availability.ts`, `reservation.ts`, `policy.ts` ni el resto
    del routing
- `test`
  - cubre positivos de availability entry
  - preserva positivos legacy de reserva
  - cubre negativos para no sobreactivar `reservation`

Compatibilidad:

- el cambio es mínimo y acotado al entrypoint
- no abre refactor grande
- no toca contratos externos

Validación:

- `pnpm exec vitest run test/unit/messageHandler.availability_entry_detectIntent.spec.ts test/unit/messageHandler.routing_observability.spec.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.availability_entry_detectIntent.spec.ts`

Impacto:

Se endurece el entrypoint de reserva sin reescribir el detector completo.

### DOC-FIX-RESERVATION-VERIFY-PENDING-SNAPSHOT-CONTINUITY-01

Estado: COMPLETADO  
Fecha: 2026-03-18  
Commit: 6fb113006b713ce292c3b95ce91eeb9892767e74

Descripción:

Se registra la persistencia mínima y explícita del snapshot de fechas y del
estado `verify pending` para que el ack afirmativo posterior no dependa solo de
`lcHistory` y no se pierdan slots en turnos siguientes.

Problema cubierto:

- luego del mensaje `Anoté nuevas fechas: ... ¿Deseás que verifique disponibilidad...?`
- el `si` posterior podía no cotizar claramente
- y el turno siguiente de huéspedes podía volver a pedir fechas

Cambios documentados:

- `convState.ts`
  - se agrega `pendingAvailabilityVerification`
- `messageHandler.ts`
  - cuando se emite el prompt de verify con fechas consolidadas, ahora
    persiste:
    - `reservationSlots.checkIn/checkOut`
    - `pendingAvailabilityVerification`
  - el `si` posterior puede apoyarse en ese estado y no solo en `lcHistory`
  - se ajusta el guard temprano de `isPureConfirm(...)` para no interceptar ese
    `si` antes de cotizar
  - después de cotizar, el flag `pendingAvailabilityVerification` se limpia
- `test`
  - cubre persistencia del snapshot
  - cubre cotización en el `si`
  - cubre continuidad correcta en el turno de huéspedes sin volver a pedir
    fechas

Compatibilidad:

- no se tocaron `reservation.ts`, `policy.ts`, MCP/CM ni otros canales
- el cambio es incremental y acotado al runtime vigente
- no abre refactor grande

Validación:

- `pnpm exec vitest run test/unit/messageHandler.verify_pending_snapshot_continuity.spec.ts` PASS
- `pnpm run ts-check` PASS

Archivos afectados:

- `lib/db/convState.ts`
- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.verify_pending_snapshot_continuity.spec.ts`

Impacto:

Se persiste estado mínimo para continuidad transaccional sin rediseñar el flujo
completo.

### FIX-RESERVATION-CONFIRMED-SNAPSHOT-PERSISTENCE-01

Estado: COMPLETADO  
Fecha: 2026-03-20  
Commit: b93633066d3dd79eb0392457f8bd3adfdc277fd6

Descripcion:

Se deja de limpiar `reservationSlots` al confirmar una reserva para preservar
el snapshot confirmado y sostener continuidad transaccional post-booking.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reservation_confirm_followup.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/messageHandler.reservation_confirm_followup.spec.ts` PASS

Impacto:

La reserva confirmada conserva su contexto operativo inmediato despues del
confirm.

### FIX-AVAILABILITY-LATE-CHECKOUT-POST-BOOKING-INQUIRY-01

Estado: COMPLETADO  
Fecha: 2026-03-20  
Commit: edc134fb19b6748a8222d79b4c21b7a646489827

Descripcion:

Se endurece la deteccion de consultas de horario post-booking para reconocer
variantes de `late checkout`, `late check out`, `check-out tardio` y
`salida tardia` como inquiry contextual y no como nuevo flujo transaccional.

Archivos afectados:

- `lib/handlers/pipeline/availability.ts`

Validacion:

- cobertura especifica agregada luego en `4fcaf52`
- `pnpm exec vitest run test/unit/messageHandler.postbooking_checkin_context.spec.ts` PASS

Impacto:

El runtime interpreta mejor consultas operativas posteriores a una reserva ya
confirmada.

### FIX-RESERVATION-BLOCK-CONFIRM-OUTSIDE-QUOTED-FLOW-01

Estado: COMPLETADO  
Fecha: 2026-03-20  
Commit: d05048579dc04fd3c4cba32ea98d10c1bc047647

Descripcion:

Se bloquea la confirmacion ejecutable fuera de un flujo efectivamente cotizado
introduciendo estado minimo explicito en `reservationState.ts`.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `lib/handlers/pipeline/reservationState.ts`
- `test/unit/messageHandler.reservation_confirm_followup.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/messageHandler.reservation_confirm_followup.spec.ts` PASS

Impacto:

Se reduce el riesgo de ejecutar confirmaciones fuera de contexto.

### FIX-AVAILABILITY-PARTIAL-DATE-YEAR-INFERENCE-01

Estado: COMPLETADO  
Fecha: 2026-03-20  
Commit: b8a969258c3a0ed53f88cb451444a192a962f7be

Descripcion:

El parser liviano de availability pasa a inferir anio en fechas parciales y
mejora soporte para nombres de mes y rangos simples.

Archivos afectados:

- `lib/handlers/pipeline/availability.ts`
- `test/unit/availability.date_year_inference.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/availability.date_year_inference.spec.ts` PASS

Impacto:

Se mejora la interpretacion determinista de fechas incompletas sin abrir un
refactor mayor del parser.

### FIX-RESERVATION-ACCEPT-COFIRMAR-TYPO-01

Estado: COMPLETADO  
Fecha: 2026-03-20  
Commit: fd8aa5a72355e007d67a381e84cb2f0f94524b96

Descripcion:

Se acepta `cofirmar` como variante valida de confirmacion ejecutable dentro del
flujo de reserva.

Archivos afectados:

- `lib/handlers/pipeline/availability.ts`
- `test/unit/messageHandler.reservation_confirm_followup.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/messageHandler.reservation_confirm_followup.spec.ts` PASS

Impacto:

Se absorbe un typo frecuente sin ampliar el contrato semantico del flujo.

### FIX-RESERVATION-GUEST-COUNT-FOLLOWUP-01

Estado: COMPLETADO  
Fecha: 2026-03-20  
Commit: dec2429a9490ceef8753fd36ed46566eb40fb1c0

Descripcion:

Se reconocen follow-ups numericos de cantidad de huespedes despues de prompts
del tipo `numero de huespedes`, evitando desvio a KB o fallback no transaccional.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.pricing_kb_bypass.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/messageHandler.pricing_kb_bypass.spec.ts` PASS

Impacto:

El flujo de reserva sostiene mejor continuidad cuando el usuario responde solo
con un numero.

### TEST-RESERVATION-POST-BOOKING-LATE-CHECKOUT-COVERAGE-01

Estado: COMPLETADO  
Fecha: 2026-03-20  
Commit: 4fcaf52da2f1e322fe34413db76a98b62b3ed585

Descripcion:

Se agrega cobertura puntual para consultas de `late checkout` en contexto
post-booking.

Archivos afectados:

- `test/unit/messageHandler.postbooking_checkin_context.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/messageHandler.postbooking_checkin_context.spec.ts` PASS

Impacto:

Queda fijada una regression guard para el routing contextual de horarios
posteriores a la reserva.

### FIX-DEBUG-LOG-PATH-PROJECT-ROOT-01

Estado: COMPLETADO  
Fecha: 2026-03-20  
Commit: c4825fb43506c4785dd3b87fcc0f01880f6d69b1

Descripcion:

`debugLog` pasa a resolver `log.txt` desde `BEGASIST_ROOT` o `INIT_CWD` antes
de usar `process.cwd()`.

Archivos afectados:

- `lib/utils/debugLog.ts`

Impacto:

Se estabiliza la ubicacion del log al ejecutar el proyecto desde shells o
wrappers con cwd distinto.

### DOC-ARCH-OPERATING-MODEL-AND-CHAT-CONVENTIONS-01

Estado: COMPLETADO  
Fecha: 2026-03-20  
Commit: 3d296c013ac66b6c4ec3b586b731efab65904766

Descripcion:

Se agrega documentacion operativa para alinear modelo de trabajo, convenciones
de chats y mapeo base entre agentes y dominios del proyecto.

Archivos afectados:

- `docs/architecture/channel_map.md`
- `docs/architecture/chat_naming_standard.md`
- `docs/architecture/prompts_new_chats.md`
- `docs/architecture/system_operating_model.md`

Impacto:

Queda explicitado el modelo operativo documental y la convencion de chats para
trabajo trazable entre arquitectura, ejecucion tecnica y disciplina Git.

### LOGGING-RUNTIME-DEBUGLOG-CENTRAL-01

Estado: COMPLETADO  
Fecha: 2026-03-20  
Commit: f6e751d3746a5a6bcc17f244886d5c3c65ccc1be

Descripcion:

Se centraliza la instalacion temprana del hook de logging del runtime Node para
que `debugLog` intercepte tambien `console.debug` y la auditoria use el canal
centralizado.

Archivos afectados:

- `instrumentation.ts`
- `lib/utils/debugLog.ts`
- `lib/audit/log.ts`
- `test/unit/debugLog.wrapOnce.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/debugLog.wrapOnce.spec.ts` PASS

Impacto:

- el hook central de logging queda instalado al iniciar runtime Node
- `console.debug` queda espejado por `debugLog`
- `dbg()` de auditoria usa el canal centralizado
- no se abre refactor masivo de `console.*`

### DOC-ARCH-CHAT-MAP-AND-COMMIT-GRANULARITY-RULES-01

Estado: COMPLETADO  
Fecha: 2026-03-20  
Commit: c0bbfa5773ae548818374a4779d012fa9452a97f

Descripcion:

Se documenta el mapa operativo base de chats/agentes y se refuerza la regla de
granularidad de commits dentro de la documentacion operativa de arquitectura.

Archivos afectados:

- `docs/architecture/channel_map.md`
- `docs/architecture/system_operating_model.md`

Impacto:

- se explicitan nombres reales de chats/agentes
- se documenta control de granularidad de commits
- se refuerza la regla `1 hito = 1 commit`

### LOGGING-RUNTIME-NORMALIZATION-01

Estado: COMPLETADO  
Fecha: 2026-03-20  
Commit: b8af149f0b67a21fb5e56f8b3b6a41fac501a856

Descripcion:

Se normaliza la emision de logs del runtime principal para reducir bypasses
semanticos y hacer mas consistente el uso de la capa central de logging en
`/api/chat` y `messageHandler`.

Archivos afectados:

- `app/api/chat/route.ts`
- `lib/handlers/messageHandler.ts`

Validacion:

- no hubo suite nueva especifica informada para este commit
- auditoria de repo: hito unico, granularidad correcta, commit aislado y
  coherente

Impacto:

- mayor consistencia operativa de logging en runtime principal
- menor bypass directo por `console.*` en trazas de `/api/chat` y
  `messageHandler`
- mejor alineacion con la capa central de observabilidad ya existente
- sin cambios funcionales en contratos publicos ni logica de negocio

### FIX-RESERVATION-CONFIRMO-INTENT-01

Estado: COMPLETADO  
Fecha: 2026-03-20  
Commit: 8c2638ae7db0c00b45ec0747eb497a0dfc946b77

Descripcion:

Se amplía la normalización de intención de confirmación en reservas para
aceptar también la variante textual `confirmo`, incluyendo el caso
conversacional `si, confirmo`, sin alterar contratos públicos ni flujos de
negocio fuera del reconocimiento de intent.

Archivos afectados:

- `lib/handlers/pipeline/availability.ts`
- `test/unit/messageHandler.reservation_confirm_followup.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/messageHandler.reservation_confirm_followup.spec.ts` PASS
- `Test Files  1 passed (1)`
- `Tests  9 passed (9)`

Impacto:

- mejora tolerancia del runtime frente a variantes naturales de confirmación
- reduce falsos negativos en follow-up de cierre de reserva
- mantiene compatibilidad con el flujo de confirmación existente
- no cambia contratos públicos ni lógica transaccional fuera del
  reconocimiento de intent

### PIPELINE-LATE-CHECKOUT-SEMANTICS-01

Estado: COMPLETADO  
Fecha: 2026-03-20  
Commit: bcc6cdaf920ad385651973e5f3a644138482debf

Descripcion:

Se separa semánticamente la consulta de `late check-out` respecto del
`check-out` estándar para evitar que ambas converjan en la misma respuesta
operativa dentro del runtime principal.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `lib/handlers/pipeline/availability.ts`
- `test/unit/messageHandler.postbooking_checkout_semantics.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/messageHandler.postbooking_checkout_semantics.spec.ts` PASS
- `Test Files  1 passed (1)`
- `Tests  4 passed (4)`

Impacto:

- checkout estándar y late checkout dejan de colapsar semánticamente
- mejora la precisión de respuesta en contexto post-booking
- evita respuestas engañosas de horario fijo para consultas sujetas a
  disponibilidad
- no altera contratos públicos ni abre refactor grande del pipeline

### LOGGING-RUNTIME-DEBUG-DIRECTORY-01

Estado: COMPLETADO  
Fecha: 2026-03-20  
Commit: 869c6e378e730651dbf48b0d5ba5a3be5c2a476b

Descripcion:

Se mueve la escritura del log runtime a `debug/log.txt` y se deja la carpeta
`debug/` fuera de Git para mantener visibilidad operativa sin riesgo de commit
accidental.

Archivos afectados:

- `.gitignore`
- `lib/utils/debugLog.ts`

Validacion:

- `pnpm exec tsc --noEmit --pretty false` PASS

Impacto:

- el log runtime queda en una ruta mas visible y ordenada
- `debug/` permanece ignorado por Git
- se mantiene el comportamiento del logger sin cambiar contratos publicos

### HITO-PIPELINE-STABLE-INTENTS-01

Estado: COMPLETADO  
Fecha: 2026-03-21  
Commit: 17be472d9dbe35d3de7869f1280d4167a8cbbaf8

Descripcion:

Se introduce una guardia determinista para FAQ estables de check-in/check-out
por encima del flujo semántico principal, evitando que contexto transaccional,
`conv_state` o dependencia innecesaria del LLM/graph secuestren consultas
simples y deterministas.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `lib/handlers/pipeline/stableIntentsGuard.ts`
- `test/unit/stableIntentsGuard.spec.ts`
- `test/unit/messageHandler.stable_intents_guard.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/stableIntentsGuard.spec.ts test/unit/messageHandler.stable_intents_guard.spec.ts` PASS
- `Test Files  2 passed (2)`
- `Tests  8 passed (8)`

Impacto:

- FAQ estables de check-in/check-out dejan de depender innecesariamente del
  graph/LLM
- el contexto transaccional deja de secuestrar esas consultas simples
- mejora robustez frente a typo liviano como `check iin`
- se mantiene un alcance conservador sin refactor grande del pipeline

Observaciones menores:

- `conversationId` se pasa al guard pero hoy no participa del matching
- la guardia quedó insertada en `bodyLLM` y no en `preLLM`
- estas observaciones no bloquean el hito

### HITO-PIPELINE-STABLE-INTENTS-02

Estado: COMPLETADO  
Fecha: 2026-03-21  
Commit: 58a4468e980ddc252cfb6ccb45adf7972c1e0266

Descripcion:

Se extiende `stable_intents_guard` para cubrir FAQ estables de amenities
(`faq_breakfast_hours`, `faq_wifi`, `faq_parking`) manteniendo precedencia por
encima de `conv_state` y separación respecto al flujo semántico principal.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `lib/handlers/pipeline/stableIntentsGuard.ts`
- `test/unit/stableIntentsGuard.spec.ts`
- `test/unit/messageHandler.stable_intents_guard.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/stableIntentsGuard.spec.ts test/unit/messageHandler.stable_intents_guard.spec.ts` PASS
- `Test Files  2 passed (2)`
- `Tests  14 passed (14)`

Impacto:

- nuevas FAQ estables dejan de depender del graph/LLM
- se mantiene precedencia sobre contexto transaccional activo
- se reduce fragilidad de routing en preguntas frecuentes de amenities
- se conserva un alcance conservador y auditable sin refactor de arquitectura

Observaciones menores:

- los nuevos intents colapsan en la categoría `amenities_info`
- el filtro conservador sigue basado en regex manuales
- estas observaciones no bloquean el hito

### DOC-ADR-PIPELINE-SEMANTIC-CONTROL-01

Estado: COMPLETADO  
Fecha: 2026-03-21  
Commit: f601ce8d9f0497af84d8b630a5a0a068e52f1e8c

Descripcion:

Se documenta formalmente la decisión arquitectónica para el control semántico
del pipeline, separando FAQ estables deterministas de intents transaccionales
dependientes de `conv_state`, contexto conversacional y LLM/graph.

Archivo afectado:

- `docs/architecture/ADR-PIPELINE-SEMANTIC-CONTROL-01.md`

Validacion:

- no corresponde validación automática de tests por tratarse de documentación
  arquitectónica pura
- auditoría de repo: working tree aislado, un único hito documental, sin
  mezcla con código ni otros concerns

Impacto:

- deja trazabilidad explícita de la decisión arquitectónica
- reduce ambigüedad para futuros cambios del pipeline
- mejora gobernanza técnica del dominio semántico
- sirve como base de referencia para auditoría y cierre de hitos relacionados

### REF-PIPELINE-STABLE-INTENTS-GOVERNANCE-01

Estado: COMPLETADO  
Fecha: 2026-03-21  
Commit: b3b67168927eb1af107d09e5d0bf7c7d82fe0bf3

Descripcion:

Se introduce gobernanza por hotel para `stable_intents_guard`, moviendo la
activación/configuración operativa a
`hotelConfig.semanticPolicy.stableIntents` sin alterar la precedencia actual
del guard ni reabrir la arquitectura base del patrón determinista.

Archivos afectados:

- `lib/config/hotelConfig.server.ts`
- `lib/handlers/pipeline/stableIntentsGuard.ts`
- `types/channel.ts`
- `test/unit/stableIntentsGuard.spec.ts`
- `test/unit/messageHandler.stable_intents_guard.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/stableIntentsGuard.spec.ts test/unit/messageHandler.stable_intents_guard.spec.ts` PASS
- `Test Files  2 passed (2)`
- `Tests  18 passed (18)`

Impacto:

- los stable intents pasan a tener gobernanza operativa por hotel
- se mantiene el patrón determinista ya introducido en hitos anteriores
- no se altera la precedencia del guard
- no se reabre graph, transporte ni telemetría
- se preserva compatibilidad hacia atrás cuando no existe configuración
  específica

Observaciones menores:

- `responseSource` queda modelado como metadata de gobernanza, pero no se usa
  todavía para resolver dinámicamente la respuesta
- `stableIntents` queda tipado como `Record<string, ...>` y no como conjunto
  cerrado de keys
- estas observaciones no bloquean el hito

### FEAT-PIPELINE-ROUTING-TELEMETRY-01

Estado: COMPLETADO  
Fecha: 2026-03-21  
Commit: a3875d53203836123b15a6b21ccedced51113560

Descripcion:

Se introduce telemetría compacta de routing para el pipeline conversacional,
especialmente alrededor de `stable_intents_guard`, reutilizando la
infraestructura existente de `debugLog` sin crear un sistema paralelo de
logging ni modificar contratos del pipeline.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `lib/handlers/pipeline/stableIntentsGuard.ts`
- `test/unit/stableIntentsGuard.spec.ts`
- `test/unit/messageHandler.routing_observability.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/stableIntentsGuard.spec.ts test/unit/messageHandler.routing_observability.spec.ts` PASS
- `Test Files  2 passed (2)`
- `Tests  13 passed (13)`

Impacto:

- mejora observabilidad del routing sin abrir infraestructura nueva
- hace visible cuándo `stable_intents_guard` sirve, bloquea por policy o no
  matchea
- mantiene coherencia con el sistema actual de logging basado en `debugLog`
- no modifica transporte, persistencia ni arquitectura del pipeline

Observaciones menores:

- `stableIntentsGuard` queda algo más acoplado a observabilidad porque devuelve
  metadata adicional
- el cambio sigue siendo razonable y contenido dentro del objetivo del hito
- no bloquea el cierre

### FIX-PIPELINE-ROUTING-NAMING-01

Estado: COMPLETADO  
Fecha: 2026-03-21  
Commit: 26ac6e56479cb4c6d4c7877b9824823b05f93234

Descripcion:

Se corrige una inconsistencia puntual de naming en la telemetría de routing del
pipeline renombrando `final_promptKey` a `final_prompt_key`, sin alterar lógica
funcional, contratos ni eventos emitidos.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.routing_observability.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/messageHandler.routing_observability.spec.ts` PASS
- `Test Files  1 passed (1)`
- `Tests  5 passed (5)`
- `pnpm tsc --noEmit` PASS

Impacto:

- unifica naming del payload de observabilidad de routing
- reduce inconsistencia entre convenciones de claves
- no altera decisiones del pipeline
- no toca `debugLog.ts`
- no introduce infraestructura nueva ni persistencia

### FIX-PIPELINE-FALLBACK-ROUTING-01

Estado: COMPLETADO  
Fecha: 2026-03-23  
Commit: 30156437a73d28e955f34f295346fdb41d955869

Descripcion:

Se corrige un bug de routing donde consultas hoteleras de parking con
temporalidad suave podían caer incorrectamente en `tourist_events`, manteniendo
el dominio hotelero cuando la intención real es amenity/parking y no agenda de
eventos.

Archivos afectados:

- `lib/agents/classify/policy.ts`
- `lib/handlers/pipeline/stableIntentsGuard.ts`
- `test/unit/stableIntentsGuard.spec.ts`
- `test/unit/messageHandler.stable_intents_guard.spec.ts`
- `test/unit/events.followupRouting.test.ts`

Validacion:

- `pnpm exec vitest run test/unit/stableIntentsGuard.spec.ts test/unit/messageHandler.stable_intents_guard.spec.ts test/unit/events.followupRouting.test.ts` PASS
- `Test Files  3 passed (3)`
- `Tests  31 passed (31)`

Impacto:

- corrige secuestro semántico de parking hacia `tourist_events`
- mantiene el dominio hotelero cuando el usuario consulta amenities con
  temporalidad suave
- evita falsos positivos de routing por heurística temporal
- no altera contratos públicos ni introduce infraestructura nueva

### FEAT-PIPELINE-SEMANTIC-INTENTS-EXTENSION-01

Estado: COMPLETADO  
Fecha: 2026-03-23  
Commit: 03128e3949b5325b295247850dad6465bd0d7522

Descripcion:

Se extiende la resolución semántica de `stable_intents_guard` para cubrir gaps
reales en FAQ estables del hotel, agregando intents mínimos para desayuno
incluido, tipo de desayuno y wifi contextual para trabajo, sin abrir refactor
grande ni delegar al graph.

Archivos afectados:

- `lib/handlers/pipeline/stableIntentsGuard.ts`
- `test/unit/stableIntentsGuard.spec.ts`
- `test/unit/messageHandler.stable_intents_guard.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/stableIntentsGuard.spec.ts test/unit/messageHandler.stable_intents_guard.spec.ts` PASS
- `Test Files  2 passed (2)`
- `Tests  24 passed (24)`

Impacto:

- mejora resolución semántica de FAQ estables del hotel
- evita colapsos entre horario, inclusión y modalidad del desayuno
- separa wifi básico de wifi contextual para trabajo
- mantiene el guard como capa determinista previa al flujo semántico principal
- no altera guest state, multi-reservation, UI ni arquitectura general

### FEAT-PIPELINE-GUEST-STATE-01

Estado: COMPLETADO  
Fecha: 2026-03-23  
Commit: fc800c5f16b74833c1a72c287b0cc541dc7350eb

Descripcion:

Se introduce una señal contextual mínima de `guestState` para matizar
respuestas del `stableIntentsGuard`, preservando backward compatibility,
precedencia actual del guard y routing principal sin cambios.

Archivos afectados:

- `lib/db/convState.ts`
- `lib/handlers/messageHandler.ts`
- `lib/handlers/pipeline/stableIntentsGuard.ts`
- `test/unit/convState.conversationStage.spec.ts`
- `test/unit/messageHandler.stable_intents_guard.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/convState.conversationStage.spec.ts test/unit/stableIntentsGuard.spec.ts test/unit/messageHandler.stable_intents_guard.spec.ts` PASS
- `Test Files  3 passed (3)`
- `Tests  31 passed (31)`

Impacto:

- introduce contexto mínimo de huésped sin volverlo controlador principal
- mejora framing/respuesta en intents estables según estado conversacional
- preserva compatibilidad hacia atrás cuando no existe señal suficiente
- no altera contratos públicos, UI, multi-reservation ni arquitectura general

### REF-PIPELINE-GUEST-STATE-EXPANSION-01

Estado: COMPLETADO  
Fecha: 2026-03-23  
Commit: 93313c52a9609fb3b27f3a838475cdee003916ee

Descripcion:

Se expande el uso de `guestState` como señal contextual secundaria para
matizar respuestas de `parking` y `late check-out`, sin alterar routing, sin
convertirlo en controlador principal y sin refactor estructural.

Archivos afectados:

- `lib/handlers/pipeline/stableIntentsGuard.ts`
- `lib/handlers/pipeline/availability.ts`
- `lib/handlers/messageHandler.ts`
- `test/unit/stableIntentsGuard.spec.ts`
- `test/unit/messageHandler.stable_intents_guard.spec.ts`
- `test/unit/messageHandler.postbooking_checkout_semantics.spec.ts`
- `test/unit/messageHandler.postbooking_checkin_context.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/convState.conversationStage.spec.ts test/unit/stableIntentsGuard.spec.ts test/unit/messageHandler.stable_intents_guard.spec.ts test/unit/messageHandler.postbooking_checkout_semantics.spec.ts test/unit/messageHandler.postbooking_checkin_context.spec.ts test/unit/events.followupRouting.test.ts` PASS
- `Test Files  6 passed (6)`
- `Tests  53 passed (53)`

Impacto:

- `guest_state` gana utilidad real sin volverse controlador del pipeline
- mejora framing de respuestas en parking y late check-out según contexto del
  huésped
- corrige inconsistencia interna entre ramas reales de `late check-out`
- preserva backward compatibility y arquitectura general

### FEAT-PIPELINE-EARLY-CHECKIN-SEMANTICS-01

Estado: COMPLETADO  
Fecha: 2026-03-23  
Commit: cabb9ca8f41f134114c839df159891c951f69b6d

Descripcion:

Se agrega resolución semántica y contextual para consultas de early check-in,
entrada anticipada y equipaje, sin prometer disponibilidad real, sin colapsar
a horario normal de check-in y sin abrir refactor grande del pipeline.

Archivos afectados:

- `lib/handlers/pipeline/availability.ts`
- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.stable_intents_guard.spec.ts`
- `test/unit/messageHandler.postbooking_checkin_context.spec.ts`
- `test/unit/stableIntentsGuard.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/messageHandler.stable_intents_guard.spec.ts test/unit/messageHandler.postbooking_checkin_context.spec.ts test/unit/messageHandler.postbooking_checkout_semantics.spec.ts test/unit/stableIntentsGuard.spec.ts test/unit/events.followupRouting.test.ts` PASS
- `Test Files  5 passed (5)`
- `Tests  54 passed (54)`

Impacto:

- agrega dominio semántico útil para early check-in sin crear un stable intent
  inapropiado
- mejora framing contextual de llegada anticipada y equipaje
- evita colapso con horario normal de check-in
- preserva arquitectura actual del pipeline y contratos públicos
- mantiene compatibilidad con el patrón ya validado para `late check-out`

Nota:

- el ajuste en fixtures/mocks de tests no tuvo impacto funcional sobre runtime
  ni contratos del producto

### FEAT-PIPELINE-MULTI-RESERVATION-01

Estado: COMPLETADO  
Fecha: 2026-03-23  
Commit: 46578063b5d210a6816a89c207910f641e37440f

Descripcion:

Se habilita soporte para múltiples reservas dentro de una misma conversación,
preservando la reserva anterior en historial y abriendo un nuevo draft activo
sin romper modify/cancel ni rediseñar el dominio completo.

Archivos afectados:

- `lib/db/convState.ts`
- `lib/handlers/messageHandler.ts`
- `lib/handlers/pipeline/reservationState.ts`
- `test/unit/messageHandler.multi_reservation.spec.ts`
- `test/unit/messageHandler.reservation_confirm_followup.spec.ts`
- `test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts`
- `test/unit/messageHandler.cancel_multiturn_continuity.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/messageHandler.multi_reservation.spec.ts test/unit/messageHandler.reservation_confirm_followup.spec.ts test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts test/unit/messageHandler.cancel_multiturn_continuity.spec.ts test/unit/messageHandler.stable_intents_guard.spec.ts test/unit/messageHandler.postbooking_checkin_context.spec.ts test/unit/messageHandler.postbooking_checkout_semantics.spec.ts test/unit/stableIntentsGuard.spec.ts test/unit/events.followupRouting.test.ts` PASS
- `Test Files  9 passed (9)`
- `Tests  83 passed (83)`

Impacto:

- permite múltiples reservas en una misma conversación
- preserva la reserva anterior explícitamente
- no rompe flujos de modify/cancel
- mantiene `messageHandler` como runtime principal
- evita rediseño grande del dominio

### DOC-ARCH-CHANNEL-MAP-RENAMING-01

Estado: COMPLETADO  
Fecha: 2026-03-23  
Commit: 8e25ff4af7de2c5e5f96a08da151616133c599e3

Descripcion:

Se ajusta la etiqueta visible asociada a `arquitecto_sistema` en el mapa
operativo de chats/agentes, pasando de `Reportar hallazgos de arquitectura` a
`Adopta rol arquitecto sistema`.

Archivo afectado:

- `docs/architecture/channel_map.md`

Validacion:

- no corresponde validación automática por tratarse de documentación mínima

Impacto:

- mejora alineación del naming operativo del chat `arquitecto_sistema`
- mantiene actualizado el mapa documental de agentes/chats
- no tiene impacto en runtime

### REF-PIPELINE-ACTIVE-DRAFT-CONTEXT-01

Estado: COMPLETADO  
Fecha: 2026-03-23  
Commit: 2de1a8dc5a57a8bec721a45a5f0c65ddc8dcc409

Descripcion:

Se introduce una noción explícita de `activeReservationContext` para separar
historial, última reserva y foco conversacional activo, reduciendo ambigüedad
del motor de estado sin rediseñar el dominio completo.

Archivos afectados:

- `lib/db/convState.ts`
- `lib/handlers/messageHandler.ts`
- `lib/handlers/pipeline/reservationState.ts`
- `test/unit/convState.conversationStage.spec.ts`
- `test/unit/messageHandler.multi_reservation.spec.ts`
- `test/unit/messageHandler.reservation_confirm_followup.spec.ts`
- `test/unit/messageHandler.cancel_multiturn_continuity.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/convState.conversationStage.spec.ts test/unit/messageHandler.multi_reservation.spec.ts test/unit/messageHandler.reservation_confirm_followup.spec.ts test/unit/messageHandler.cancel_multiturn_continuity.spec.ts test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts test/unit/messageHandler.stable_intents_guard.spec.ts test/unit/messageHandler.postbooking_checkin_context.spec.ts test/unit/messageHandler.postbooking_checkout_semantics.spec.ts test/unit/stableIntentsGuard.spec.ts test/unit/events.followupRouting.test.ts` PASS
- `Test Files  10 passed (10)`
- `Tests  90 passed (90)`

Impacto:

- separa explícitamente historial, última reserva y foco conversacional activo
- prepara mejor el sistema para futuras referencias a reservas múltiples
- reduce ambigüedad del motor de estado sin rediseñar el dominio completo
- preserva compatibilidad con el pipeline actual

### FEAT-PIPELINE-REFERENCE-RESOLUTION-01

Estado: COMPLETADO  
Fecha: 2026-03-23  
Commit: 967be9a8a9151155aaf6e5dfaf4c584ba2c92747

Descripcion:

Se introduce una capa mínima, conservadora y trazable de resolución de
referencias conversacionales sobre reservas múltiples, aprovechando contexto
activo e historial para evitar pedir código innecesariamente cuando la
referencia ya es resoluble.

Archivos afectados:

- `lib/db/convState.ts`
- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/messageHandler.reference_resolution.spec.ts test/unit/messageHandler.multi_reservation.spec.ts test/unit/messageHandler.reservation_confirm_followup.spec.ts test/unit/messageHandler.cancel_multiturn_continuity.spec.ts test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts test/unit/convState.conversationStage.spec.ts test/unit/messageHandler.stable_intents_guard.spec.ts test/unit/messageHandler.postbooking_checkin_context.spec.ts test/unit/messageHandler.postbooking_checkout_semantics.spec.ts test/unit/stableIntentsGuard.spec.ts test/unit/events.followupRouting.test.ts` PASS
- `Test Files  11 passed (11)`
- `Tests  94 passed (94)`
- `0 FAIL`

Impacto:

- mejora resolución conversacional sobre reservas múltiples
- reduce pedidos innecesarios de código de reserva
- aprovecha correctamente contexto activo, historial mínimo y última reserva
- mantiene trazabilidad y conservadurismo
- no abre NLP general ni refactor estructural

### DOC-PIPELINE-ARCHITECTURE-CONSOLIDATION-01

Estado: COMPLETADO  
Fecha: 2026-03-23  
Commit: 53bc0bc0808dd5f70e772eb8a2dd612f5b821ed4

Descripcion:

Se consolida la documentación viva del pipeline conversacional y
`message_pipeline.md` pasa a ser la fuente principal del runtime actual,
alineando `docs/architecture` con el sistema real.

Archivos afectados:

- `docs/architecture/message_pipeline.md`
- `docs/architecture/README.md`

Validacion:

- no corresponde validación automática por tratarse de documentación de arquitectura

Impacto:

- se consolida documentación viva del pipeline conversacional
- `message_pipeline.md` pasa a ser la fuente principal del runtime actual
- se documenta explícitamente `messageHandler` como runtime central
- se documentan `stableIntentsGuard`, `guestState`, `reservationHistory` y `activeReservationContext`
- se documenta soporte de múltiples reservas y resolución de referencias
- se alinea la documentación con el sistema real y se eliminan desfasajes con la implementación

### FIX-TEST-SUITE-STABILIZATION-01

Estado: COMPLETADO  
Fecha: 2026-03-24  
Commit: ad23fec6d5e8654cb7dff1acd35d35095b210fb1

Descripcion:

Se estabiliza la suite frente al drift acumulado entre runtime actual, mocks,
setups multi-turn, expectativas envejecidas y sensibilidad temporal, incluyendo
correcciones puntuales de runtime detectadas durante el saneamiento.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `lib/handlers/pipeline/availability.ts`
- `test/availability.unified.flow.spec.ts`
- `test/e2e.modify_single_date_followup.spec.ts`
- `test/frontend/chatPage.lang.spec.tsx`
- `test/graph.reservation.persist.spec.ts`
- `test/unit/messageHandler.autosend.snapshot_verify.test.ts`
- `test/unit/messageHandler.availability_affirm_ack.test.ts`
- `test/unit/messageHandler.confirm_both_dates_no_handoff.test.ts`
- `test/unit/messageHandler.date_year_inheritance.heuristic.test.ts`
- `test/unit/messageHandler.date_year_inheritance.test.ts`
- `test/unit/messageHandler.followup_status_verify.test.ts`
- `test/unit/messageHandler.inreso_followup.test.ts`
- `test/unit/messageHandler.modify_checkin_and_dates_prompt.test.ts`
- `test/unit/messageHandler.modify_dates_prompts.locales.test.ts`
- `test/unit/messageHandler.modify_single_date_followup.test.ts`
- `test/unit/messageHandler.new_dates_prompt.test.ts`
- `test/unit/messageHandler.past_checkin_guard.test.ts`
- `test/unit/messageHandler.postbooking_reservation_snapshot.spec.ts`
- `test/unit/messageHandler.pricing_kb_bypass.spec.ts`
- `test/unit/messageHandler.rich.test.ts`
- `test/unit/messageHandler.routing_observability.spec.ts`
- `test/unit/messageHandler.vamos_a_ingresar_followup.test.ts`
- `test/unit/messageHandler.verify_pending_snapshot_continuity.spec.ts`

Validacion:

- `pnpm exec vitest run ...` sobre 22 suites del bloque afectado PASS
- `Test Files  22 passed (22)`
- `Tests  62 passed (62)`
- `0 files failed`
- `0 tests failed`

Impacto:

- deja la suite alineada con el runtime actual
- reduce falsos negativos por drift de mocks, fechas y timers
- estabiliza escenarios multi-turn y follow-ups sensibles
- corrige dos bugs reales de runtime detectados durante el saneamiento
- mejora confiabilidad de validación antes de futuros hitos

### FEAT-PIPELINE-ORDINAL-REFERENCES-01

Estado: COMPLETADO  
Fecha: 2026-03-24  
Commit: 8dc6d348377903f022aab6528d0cb21cbf2f2b05

Descripcion:

Se introduce soporte inicial para referencias ordinales explícitas sobre
reservas conocidas en conversación, manteniendo resolución conservadora y sin
abrir coreferencia libre.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- `pnpm exec vitest run test/unit/messageHandler.reference_resolution.spec.ts test/unit/messageHandler.multi_reservation.spec.ts test/unit/messageHandler.cancel_multiturn_continuity.spec.ts` PASS
- `Test Files  3 passed (3)`
- `Tests  21 passed (21)`

Impacto:

- mejora navegación conversacional entre múltiples reservas ya conocidas
- reduce pedidos innecesarios de código en casos ordinales simples
- mantiene trazabilidad y resolución conservadora
- no abre NLP general ni refactor estructural

### FIX-PIPELINE-MODIFY-INTENT-NORMALIZATION-EN-01

Estado: COMPLETADO  
Fecha: 2026-03-24  
Commit: 7f91f42ce27324cdf2030af4a1f3b0f6ad786cb2

Descripcion:

Se corrige la normalización del intent `modify` para variantes en inglés dentro
de `normalizeReservationIntent()`, mejorando cobertura semántica sin cambiar
arquitectura ni contratos del pipeline.

Archivos afectados:

- `lib/handlers/pipeline/availability.ts`

Validacion:

- `pnpm exec vitest run test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts` PASS
- `Test Files  1 passed (1)`
- `Tests  12 passed (12)`

Impacto:

- mejora consistencia de clasificación del intent `modify`
- reduce falsos negativos en wording inglés
- mantiene el fix acotado a normalización semántica puntual

### FIX-PIPELINE-RESERVATION-CONFIRMATION-FLOW-01

Estado: COMPLETADO  
Fecha: 2026-03-24  
Commit: 19ff00daf14807c86ebdcc5b36f5273d9c0f64c0

Descripcion:

Se corrige el paso de confirmación en el flujo de nueva reserva para evitar la
caída en fallback cuando ya existía un draft completo y una propuesta
confirmable.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.no_context_reservation_guards.spec.ts`

Validacion:

- validación manual reportada en widget
- flujo completo de reserva funciona
- confirmación funciona correctamente
- no hay regresiones en `modify/cancel`

Impacto:

- elimina fallback incorrecto al confirmar una nueva reserva válida
- hace robusta la continuidad del draft `create`
- preserva contratos actuales del pipeline
- mejora confiabilidad del flujo de reserva sin refactor estructural

### FIX-WEB-WIDGET-CONVERSATION-ISOLATION-01

Estado: COMPLETADO  
Fecha: 2026-03-24  
Commit: af41ea00472d229581f850a5192d07b38e1935b7

Descripcion:

Se corrige el aislamiento de conversación en el canal web/widget para evitar
mezcla de mensajes entre tabs o ventanas, aislando correctamente
`conversationId` y `guestId` por scope de tab.

Archivos afectados:

- `components/admin/ChatPage.tsx`
- `lib/agents/helpers.ts`
- `public/widget/begai-chat.js`
- `utils/conversationSession.ts`
- `utils/guestSession.ts`
- `utils/webTabScope.ts`
- `test/unit/conversationSession.storage.spec.ts`
- `test/frontend/chatPage.lang.spec.tsx`
- `test/unit/inputNormalizerAgent.basic.test.ts`

Validacion:

- aislamiento por ventanas validado
- `pnpm run ts-check` PASS

Impacto:

- evita mezcla de conversaciones entre tabs/ventanas
- aísla correctamente sesión web por scope de tab
- mejora seguridad operativa del canal widget
- mantiene trazabilidad técnica del estado por ventana

### REF-PIPELINE-REFERENCE-TARGET-MODEL-01

Estado: COMPLETADO  
Fecha: 2026-03-25  
Commit: 23fe82743c61cb60358435d8524ea164cab2b03a

Descripcion:

Se introduce un modelo mínimo y explícito de target referencial para reservas,
desacoplando la resolución puntual de referencias del foco conversacional
general sin reescribir el runtime.

Archivos afectados:

- `lib/db/convState.ts`
- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- `test/unit/messageHandler.reference_resolution.spec.ts` PASS
- suites relacionadas del pipeline ya validadas previamente en verde

Impacto:

- cierra el modelo mínimo de target referencial
- separa mejor foco conversacional general de target seleccionado para operación
- mejora continuidad multi-turn entre `snapshot`, `modify` y `cancel`
- prepara el terreno para un futuro hito de lifecycle / expiration del target
- evita sobre-ingeniería y mantiene trazabilidad limpia
