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
