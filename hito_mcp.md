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

- `docs/architecture/ADR-EMAIL-TRANSPORT-TARGET.md`
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

- `docs/architecture/ADR-PIPELINE-RUNTIME-TARGET.md`
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

### DOC-ADR-DOC-GOVERNANCE-01

Estado: COMPLETADO  
Fecha: 2026-03-25  
Commit: 1971dce405eb3c99ead6523d6d2f7e11fd49f8a7

Descripcion:

Se crea el ADR de gobernanza documental explícita de Begasist para separar
historia, arquitectura viva, operación, ADR y artefactos derivados, declarando
fuente de verdad por dominio e integrando la disciplina documental con Git.

Archivos afectados:

- `docs/architecture/ADR-DOC-GOVERNANCE-01.md`

Validacion:

- no corresponde validación automática por tratarse de documentación de arquitectura

Impacto:

- formaliza gobernanza documental explícita del proyecto
- separa historia, arquitectura viva, operación, ADR y artefactos derivados
- declara fuente de verdad por dominio
- introduce niveles de impacto documental
- formaliza el rol de HDOC e integra la disciplina `CODE -> COMMIT -> HASH -> PUSH -> DOC`

### FIX-PIPELINE-REFERENCE-TARGET-LIFECYCLE-01

Estado: COMPLETADO  
Fecha: 2026-03-26  
Commit: 17aa676f9a80159af4c7462a0ae82e830bab45b2

Descripcion:

Se implementa el lifecycle mínimo de `selectedReservationTarget`, definiendo
cuándo se preserva, reemplaza, limpia o ignora para evitar continuidad inválida
entre turnos sin reescribir el runtime.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- cobertura reportada en verde para reference resolution / lifecycle del target

Impacto:

- evita arrastre inválido de target referencial entre dominios
- corrige return temprano inconsistente del `stableIntentsGuard`
- deja el modelo de target más seguro para evolución futura
- mantiene intacta la continuidad útil de `snapshot`, `modify` y `cancel`

### DOC-ARCHITECTURE-DOC-GOVERNANCE-01

Estado: COMPLETADO  
Fecha: 2026-03-26  
Commit: a688cb6f5b3b28051969d6fa49bb81758e98497e

Descripcion:

Se alinea el documento de gobernanza documental con el modelo operativo vigente
de Begasist para que `HDOC` tenga reglas explícitas, trazables y utilizables
como fuente operativa.

Archivos afectados:

- `docs/architecture/ADR-DOC-GOVERNANCE-01.md`

Validacion:

- no corresponde validación automática por tratarse de documentación arquitectónica / operativa

Impacto:

- deja reglas explícitas para el cierre documental
- mejora claridad de responsabilidades entre agentes y Marcelo
- fortalece la disciplina de trazabilidad documental
- da base operativa más clara para decisiones de `HDOC`

### FIX-PIPELINE-DOMAIN-LOCK-01

Estado: COMPLETADO  
Fecha: 2026-03-27  
Commit: ecca447b6b8d2b1400696dd5749caabf50c0af72

Descripcion:

Se introduce un domain lock liviano para evitar que el pipeline salga
incorrectamente del dominio `reservation` durante follow-ups cortos
compatibles, previniendo fugas a fallback o a dominios ajenos.

Archivos afectados:

- `lib/agents/helpers.ts`
- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.domain_lock.spec.ts`

Validacion:

- validación manual reportada
- el runtime ya no fuga a fallback en follow-ups breves de `reservation`
- continuidad correcta en widget

Impacto:

- estabiliza el dominio `reservation` durante `create/modify`
- reduce fugas espurias a turismo, contacto o fallback
- mejora continuidad multi-turn sin abrir refactor grande
- mantiene escape explícito para dominios genuinamente nuevos

### FIX-PIPELINE-DATE-COHERENCE-01

Estado: COMPLETADO  
Fecha: 2026-03-27  
Commit: f6d47c2f0ecb5a91ad845ec36c2725b71a2dc0a3

Descripcion:

Se introduce validación de coherencia temporal en el pipeline de reservas para
impedir cotización, propuesta, confirmación o modificación con fechas
incoherentes antes de avanzar a pricing o confirmación.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.date_coherence.spec.ts`

Validacion:

- estado reportado: commit publicado correctamente
- validación previa del hito realizada antes del cierre técnico

Impacto:

- refuerza una invariante crítica del runtime
- evita cotización, propuesta o confirmación con fechas incoherentes
- reduce riesgo de propuestas absurdas o reservas inválidas
- mejora robustez del flujo `create/modify` sin introducir nuevo modelo de estado

Posicion evolutiva:

- deriva de manual parity con aceptación de fechas incoherentes, cotización con datos inválidos y `modify` inconsistente
- pertenece a la fase `Stabilize reservation (pre-focus governance)`
- continúa después de `FIX-PIPELINE-DOMAIN-LOCK-01`
- prepara el sistema para `FIX-PIPELINE-MODIFY-SUBSTATE-01` y luego `REF-PIPELINE-FOCUS-GOVERNANCE-01`

### FIX-PIPELINE-REFERENCE-COVERAGE-01

Estado: COMPLETADO  
Fecha: 2026-03-30  
Commit: 5a85898d1d8f024d5b2c4278a650a194ee849df9

Descripcion:

Se consolida la cobertura del Reference Engine en `reservation`, unificando
listado, snapshot, ordinales y continuidad post-snapshot sobre una base
referencial canónica y estable.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- cierre registrado contra commit publicado `5a85898`
- cobertura operativa consolidada para listing, snapshot, ordinales y continuidad post-snapshot

Impacto:

- cierra gaps importantes de reference coverage en `reservation`
- evita fallback en follow-ups ordinales válidos
- preserva estado real de reservas en snapshot y listado
- consolida `reservation` como dominio piloto robusto antes de la generalización del foco

Posicion evolutiva:

- deriva de manual parity con listados inconsistentes, ordinales incompletos, continuidad post-snapshot frágil y visualización incorrecta de canceladas
- completa la fase `Stabilize reservation (pre-focus governance)`
- queda conectado con la secuencia `FIX-PIPELINE-DOMAIN-LOCK-01` -> `FIX-PIPELINE-DATE-COHERENCE-01` -> `FIX-PIPELINE-MODIFY-SUBSTATE-01` -> `FIX-PIPELINE-REFERENCE-COVERAGE-01`
- prepara la transición hacia `REF-PIPELINE-FOCUS-CONTRACT-01`

### FIX-PIPELINE-MODIFY-SUBSTATE-01

Estado: COMPLETADO  
Fecha: 2026-03-30  
Commit: 216beb9f632d6702f9b155f6625d18b5eb96b238

Descripcion:

Se persiste explícitamente el subestado de `modify` en `conv_state`, cerrando
una desalineación contractual entre runtime, persistencia conversacional y
expectativas de tests ya integrados.

Archivos afectados:

- `lib/db/convState.ts`

Validacion:

- el cambio cierra la brecha entre modelo persistido, uso del runtime y expectativas de tests ya existentes

Impacto:

- evita desalineación entre `messageHandler` y `conv_state`
- formaliza el subestado mínimo de `modify`
- prepara continuidad consistente de modificaciones guiadas por campo activo
- mantiene el cambio acotado a estado conversacional, sin mezclarlo con UI ni con otros hitos del pipeline

### FEAT-ADMIN-CONVERSATION-ID-VISIBILITY-01

Estado: COMPLETADO  
Fecha: 2026-03-30  
Commit: 41f3165d95c9af9fb04a20977e9c8cf7e4ecf7dd

Descripcion:

Se mejora la visibilidad operativa de `conversationId` en `ChannelInbox`,
agregando render compacto y acción de copiado para facilitar inspección y
trazabilidad manual desde la interfaz admin.

Archivos afectados:

- `components/admin/ChannelInbox.tsx`

Validacion:

- cambio visible y operativo en interfaz admin, sin impacto en runtime conversacional

Impacto:

- mejora trazabilidad manual desde inbox admin
- facilita soporte e inspección operativa
- reduce fricción para copiar identifiers largos
- mantiene el cambio acotado a UI/admin

### FIX-PIPELINE-DOMAIN-LOCK-02

Estado: COMPLETADO  
Fecha: 2026-03-30  
Commit: 1d324cda4143a0b5426ff62752aa60f7f1a8c8ed

Descripcion:

Se endurece la gobernanza de dominio en `reservation` para evitar que el
runtime abandone incorrectamente el dominio activo ante inputs imperfectos
dentro de un flujo válido.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `lib/handlers/pipeline/availability.ts`
- `test/unit/messageHandler.domain_lock.spec.ts`
- `test/unit/messageHandler.no_context_reservation_guards.spec.ts`

Validacion:

- cierre registrado contra commit publicado `1d324cd`
- hito validado como refuerzo operativo del dominio `reservation` dentro del runtime actual

Impacto:

- reduce fugas espurias al fallback global
- mantiene `reservation` activo ante inputs imperfectos pero compatibles
- mejora robustez del flujo sin introducir LLM ni graph
- fortalece la gobernanza interna del dominio dentro del runtime actual

Posicion evolutiva:

- deriva de manual parity con typos de confirm, fallback incorrecto y contaminación entre snapshot, modify y fallback global
- pertenece a la fase `Stabilize reservation pipeline governance`
- continúa después de `FIX-PIPELINE-DOMAIN-LOCK-01`, `FIX-PIPELINE-DATE-COHERENCE-01`, `FIX-PIPELINE-MODIFY-SUBSTATE-01` y `FIX-PIPELINE-REFERENCE-COVERAGE-01`
- prepara la transición hacia `REF-PIPELINE-FOCUS-CONTRACT-01`

Rol arquitectonico:

- no introduce nuevo runtime
- no migra a graph
- no introduce foco global
- consolida el slice `domain governance` como responsabilidad interna del runtime

Invariante reforzada:

- el sistema no debe abandonar el dominio activo ante inputs imperfectos dentro de un flujo válido

### FIX-PIPELINE-FALLBACK-HIERARCHY-01

Estado: COMPLETADO  
Fecha: 2026-03-30  
Commit: fde92ff951ab87698e2a0e038c35175f4dc8de03

Descripcion:

Se introduce una jerarquía explícita de fallback dentro de flujos activos de
`reservation`, priorizando continuidad local antes de cualquier escape al
fallback global.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.domain_lock.spec.ts`

Validacion:

- hito registrado como consolidación operativa de la jerarquía de fallback dentro de `reservation`

Impacto:

- reduce escapes prematuros al fallback global
- mejora continuidad local de `create`, `modify`, `snapshot` y `confirm`
- evita ejecución inválida de `modify` sin dato nuevo
- fortalece robustez del runtime actual sin cambiar arquitectura

### FIX-PIPELINE-REFERENCE-RANGE-GUARDS-01

Estado: COMPLETADO  
Fecha: 2026-03-30  
Commit: cf75bba46fc39dddefc1cabf503747bc849b6e78

Descripcion:

Se introduce validación determinística de referencias ordinales fuera de rango
dentro del Reference Engine de `reservation`, evitando ejecución sobre targets
inexistentes y reforzando seguridad conversacional.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- hito registrado como refuerzo de seguridad conversacional y validación determinística del Reference Engine en `reservation`

Impacto:

- bloquea ejecución sobre referencias ordinales inexistentes
- mejora seguridad del flujo conversacional
- separa con más claridad etapas internas del Reference Engine
- reduce riesgo de actuar sobre reserva equivocada

### FIX-PIPELINE-AMBIGUITY-GATING-01

Estado: COMPLETADO  
Fecha: 2026-03-30  
Commit: ed0e6d1d2c77f70cc973667bbbd2c8c5c47510f4

Descripcion:

Se introduce ambiguity gating determinístico en `reservation`, bloqueando
ejecución cuando existen múltiples reservas accionables sin target suficiente y
completando el modelo mínimo de validación del Reference Engine.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- hito registrado como incorporación de una etapa explícita de validación de suficiencia en el pipeline de referencias de `reservation`

Impacto:

- bloquea ejecución ambigua de `modify/cancel`
- mejora seguridad conversacional
- completa el modelo interno `reference detection -> existence validation -> sufficiency validation -> target resolution -> execution`
- fortalece comportamiento determinístico del runtime antes de foco global

### FIX-PIPELINE-RESERVATION-CANONICAL-STATE-01

Estado: COMPLETADO  
Fecha: 2026-03-31  
Commit: d6be3c1e2a17f10cb768086fa20a898fa3366c66

Descripcion:

Se introduce un estado canónico de reservas como fuente única de verdad para el
dominio `reservation`, asegurando deduplicación, resolución de conflictos,
definición uniforme de accionabilidad y orden determinístico.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- hito registrado como consolidación de una fuente de verdad canónica para `reservation`

Impacto:

- reduce duplicación estructural del dominio
- evita que distintas etapas interpreten reservas distintas como válidas
- hace determinístico el orden y la accionabilidad
- fortalece la consistencia interna del pipeline
- consolida el stage implícito `canonical state build`

### DOC-ARCHITECTURE-CANONICAL-STATE-GOVERNANCE-01

Estado: COMPLETADO  
Fecha: 2026-03-31  
Commit: 4b23fd17dbdf13b7d4d73f0deaf5c3e2c9076510

Descripcion:

Se formaliza el principio de estado canónico y se alinea el roadmap
arquitectónico para que la evolución del runtime opere siempre sobre fuentes de
verdad consistentes, sin duplicación estructural ni capas paralelas no
habilitadas.

Archivos afectados:

- `docs/architecture/canonical_state_principle.md`
- `docs/architecture/roadmap.md`

Validacion:

- no corresponde validación automática; es un hito documental/arquitectónico

Impacto:

- define un principio arquitectónico estable
- alinea el roadmap con ese principio
- sirve como regla de evaluación para hitos futuros
- fortalece gobernanza arquitectónica del pipeline
- reduce riesgo de deriva estructural en `reservation`

### FIX-PIPELINE-SLOT-INGESTION-01

Estado: COMPLETADO  
Fecha: 2026-03-31  
Commit: 18e9c68ebc0c17f3b86b9e2d35e2f536ce968e95

Descripcion:

Se mejora la ingestión de slots en `reservation` para capturar múltiples inputs
útiles en un solo turno y consolidarlos antes de cualquier decisión del
runtime.

Archivos afectados:

- `lib/agents/helpers.ts`
- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.slot_ingestion.spec.ts`

Validacion:

- hito registrado como mejora del stage de ingestión del runtime

Impacto:

- mejora calidad de entrada al estado del runtime
- reduce pérdida de información entre turno y estado
- elimina repreguntas redundantes
- hace más robusto `create/modify` cuando el usuario ya trae varios datos juntos

### FIX-PIPELINE-CREATE-SEQUENCING-01

Estado: COMPLETADO  
Fecha: 2026-03-31  
Commit: 84b42680dd7bd95fc2591e8c4690da17769d55c1

Descripcion:

Se introduce gobernanza explícita del create flow en `reservation`, definiendo
una secuencia determinística de captura y persistencia previa a la decisión del
runtime.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.create_sequencing.spec.ts`

Validacion:

- hito registrado como consolidación del flujo create bajo reglas explícitas de secuenciación y completitud

Impacto:

- transforma el create flow en un flujo gobernado, no meramente reactivo
- mejora consistencia de captura de datos
- reduce repreguntas innecesarias
- evita decisiones sobre estado incompleto
- agrega el stage explícito `create sequencing`

### REF-PIPELINE-FOCUS-CONTINUATION-01

Estado: COMPLETADO  
Fecha: 2026-03-31  
Commit: 5ff3ee9e1fd894ae62af3676431b4ef5d26e1af4

Descripcion:

Se agrega continuación explícita del flujo activo tras interrupciones laterales,
preservando `conversationFocus` y reenganchando el flujo sobre estado real ya
gobernado.

Archivos afectados:

- `lib/db/convState.ts`
- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.focus_governance.spec.ts`

Validacion:

- micro-hito registrado como refinamiento estable del modelo de `focus governance`

Impacto:

- mejora continuidad conversacional del runtime
- hace útil la preservación de foco mediante reenganche explícito
- evita reinicios innecesarios de `create/modify`
- refina el slice `focus governance`
- agrega capacidad explícita de `focus continuation`

### FIX-PIPELINE-CREATE-QUOTE-GATING-01

Estado: COMPLETADO  
Fecha: 2026-03-31  
Commit: 08038b72a9e53ca76120e745859f595af7b0bc3d

Descripcion:

Se introduce quote gating explícito dentro de `reservation.create`, bloqueando
cotización, verificación de disponibilidad y respuestas comerciales mientras el
draft siga incompleto.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.create_quote_gating.spec.ts`

Validacion:

- hito registrado como refuerzo de una regla de ejecución del runtime

Impacto:

- evita ejecución comercial sobre estado incompleto
- refuerza que create sequencing gobierna antes de availability/quote
- elimina persistencia de propuestas prematuras
- mejora consistencia del runtime sobre estado canónico

### DOC-ARCHITECTURE-MANUAL-TEST-PLAN-01

Estado: COMPLETADO  
Fecha: 2026-03-31  
Commit: ab9c693ea5da34d7ad344c3a8c16496c345ece95

Descripcion:

Se versiona el plan de tests manuales usado como fuente de observación para
detectar gaps reales del runtime y para dejar trazabilidad del origen de fixes
técnicos posteriores.

Archivos afectados:

- `docs/architecture/plan_tests_manuales.md`

Validacion:

- no corresponde validación automática; es un hito documental

Impacto:

- mejora trazabilidad entre observación manual y fix técnico
- preserva contexto de origen para futuros análisis
- ayuda a justificar técnicamente hitos derivados de manual parity

### FIX-PIPELINE-CREATE-QUOTE-GATING-02

Estado: COMPLETADO  
Fecha: 2026-04-01  
Commit: 58c6fcf17d6624935c41b9c98980c560563fd4b9

Descripcion:

Se corrige `flow poisoning` dentro de `reservation.create`, evitando que
fast-paths de fechas degraden un create activo a `modify_reservation` y
reforzando la integridad del quote gating.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.create_quote_gating.spec.ts`

Validacion:

- hito registrado como corrección estructural de integridad del flujo `reservation.create`

Impacto:

- elimina contaminación entre fast-path de fechas y flujo create
- preserva autoridad del foco gobernado
- evita persistencia comercial sobre draft incompleto
- refuerza coherencia entre `create sequencing`, `quote gating` y `focus governance`

### FIX-PIPELINE-MODIFY-TARGET-CONTINUITY-01

Estado: COMPLETADO  
Fecha: 2026-04-01  
Commit: 057d4bd6f3b1761110e99d8f56a4d943df70b2c3

Descripcion:

Se preserva continuidad de target en `modify` hasta execution, evitando caída
al path de `create/proposal` y asegurando que availability y confirm operen
sobre la reserva seleccionada.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- hito registrado como refuerzo de `modify execution integrity`

Impacto:

- asegura que una vez elegido el target, toda la ejecución opere sobre esa reserva
- reduce desvíos a paths incorrectos
- refuerza consistencia de ejecución sobre estado real
- consolida `modify execution integrity` como refinamiento estable del pipeline

### FIX-API-CHAT-REQUEST-VALIDATION-01

Estado: COMPLETADO  
Fecha: 2026-04-01  
Commit: a40e3822fcd90344130f159cbe2af80ba11bcae2

Descripcion:

Se endurece la validación de entrada en `/api/chat`, rechazando requests sin
`hotelId` o sin mensaje antes de ejecutar el pipeline.

Archivos afectados:

- `app/api/chat/route.ts`
- `test/api.chat.route.spec.ts`
- `test/integration/api_chat.test.ts`
- `test/integration/guestConversationBinding.spec.ts`

Validacion:

- cobertura de route e integración ajustada para reflejar validación temprana

Impacto:

- reduce entrada inválida al runtime
- fortalece hardening del borde API
- evita trabajo innecesario con requests mal formados

### FIX-PIPELINE-CREATE-INLINE-GUEST-NAME-INGESTION-01

Estado: COMPLETADO  
Fecha: 2026-04-02  
Commit: ef508fc1e34ed9209ddd4c95774a1b31c823efda

Descripcion:

Se corrige la ingestión inline de `guestName` en turnos ricos de `create`,
evitando repreguntas innecesarias y previniendo caída errónea en confirm
prematuro.

Archivos afectados:

- `lib/agents/helpers.ts`
- `lib/handlers/messageHandler.ts`
- `test/unit/helpers.extractSlotsFromText.spec.ts`
- `test/unit/messageHandler.create_quote_gating.spec.ts`
- `test/unit/messageHandler.slot_ingestion.spec.ts`

Validacion:

- PASS reportado en tests automáticos del bloque de helpers, slot ingestion y create quote gating
- `pnpm run ts-check` PASS
- validación manual positiva para captura inline de nombre y flujo create intacto

Impacto:

- mejora el stage de `slot ingestion`
- evita repreguntas innecesarias de `guestName`
- preserva integridad del create rico en un solo turno
- elimina una fuente de confirm prematuro erróneo
- mantiene consistencia entre input rico y estado del runtime

### NIVEL-2-RESERVATION-DOMAIN-GOVERNANCE-CLOSURE-01

Estado: COMPLETADO  
Fecha: 2026-04-03  
Bloque consolidado:

- `d6be3c1` `FIX-PIPELINE-RESERVATION-CANONICAL-STATE-01`
- `4b23fd1` `DOC-ARCHITECTURE-CANONICAL-STATE-GOVERNANCE-01`
- `18e9c68` `FIX-PIPELINE-SLOT-INGESTION-01`
- `84b4268` `FIX-PIPELINE-CREATE-SEQUENCING-01`
- `08038b7` `FIX-PIPELINE-CREATE-QUOTE-GATING-01`
- `58c6fcf` `FIX-PIPELINE-CREATE-QUOTE-GATING-02`
- `d02aca6` `FIX-PIPELINE-CREATE-DRAFT-CONSISTENCY-01`
- `2d1b716` `FIX-PIPELINE-CREATE-RAW-DATE-VALIDATION-01`
- `ef508fc` `FIX-PIPELINE-CREATE-INLINE-GUEST-NAME-INGESTION-01`
- `ee90254` `FIX-PIPELINE-CREATE-EXECUTION-INTEGRITY-02`
- `f0d6ce5` `REF-PIPELINE-GUEST-COUNT-INGESTION-HARDENING-01`
- `934d3bf` `REF-PIPELINE-ROOM-TYPE-INGESTION-HARDENING-01`
- `c429454` `DOC-ARCHITECTURE-SLOT-GOVERNANCE-NUMGUESTS-01`
- `5ff3ee9` `REF-PIPELINE-FOCUS-CONTINUATION-01`
- `057d4bd` `FIX-PIPELINE-MODIFY-TARGET-CONTINUITY-01`
- `6a73422` `FIX-PIPELINE-MODIFY-SINGLE-TARGET-CONTINUITY-01`
- `d72997e` `FIX-PIPELINE-CANCEL-EXECUTION-INTEGRITY-01`

Descripcion:

Se registra el cierre de nivel para `reservation domain governance`, dejando
asentado que el dominio quedó consolidado end-to-end bajo estado canónico,
gobernanza explícita de slots y ejecución consistente sobre la fuente de verdad.

Impacto:

- consolida end-to-end el dominio `reservation`
- deja explícita la cadena gobernada por estado canónico
- fija que `execution == source of truth`
- conecta el cierre del bloque con roadmap y arquitectura estable

### REF-PIPELINE-GUEST-COUNT-INGESTION-HARDENING-01

Estado: COMPLETADO  
Fecha: 2026-04-02  
Commit: f0d6ce5440f15384829a5f17d68ca0e8c11e0bbd

Descripcion:

Se endurece la gobernanza de ingestión de `numGuests` en el pipeline de
reservas, unificando su semántica base entre helper y runtime sin introducir
capas paralelas.

Archivos afectados:

- `lib/agents/helpers.ts`
- `test/unit/helpers.extractSlotsFromText.spec.ts`
- `test/unit/messageHandler.slot_ingestion.spec.ts`

Validacion:

- PASS reportado en helpers, slot ingestion, no-context guards e integración
- `pnpm run ts-check` PASS

Impacto:

- unifica la gobernanza de `numGuests`
- reduce inconsistencia entre helper y runtime
- evita falsos positivos fuera de contexto
- preserva create/modify con una semántica base común
- mantiene la frontera helper para parsing base y runtime para follow-up contextual

### FIX-PIPELINE-CROSS-DOMAIN-INTENT-PRIORITIZATION-02

Estado: COMPLETADO  
Fecha: 2026-04-03  
Commit: c3e5e13d87f9b5bc2d6e6dc26c36d5ef8e1dc1e1

Descripcion:

Se endurece la gobernanza cross-domain del runtime, evitando degradación de
`pricing` a `reservation collecting`, relajando el carácter absoluto de
`conversationFocus` en turnos informativos puros e introduciendo salida
explícita de subflow `modify`.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.cross_domain_intent_prioritization.spec.ts`
- `test/unit/messageHandler.pricing_kb_bypass.spec.ts`

Validacion:

- `vitest` PASS
- `ts-check` PASS
- validación manual positiva en reservation+faq, pricing+policies, modify+faq y salida explícita de modify

Impacto:

- refuerza gobernanza efectiva cross-domain
- reduce secuestro conversacional por foco activo
- evita falsa activación de reservation collecting en pricing
- agrega salida explícita y segura de subflow `modify`
- preserva invariantes del runtime sin tocar arquitectura ni graph

### FIX-TEST-SUITE-INTEGRATION-STABILITY-01

Estado: COMPLETADO  
Fecha: 2026-04-01  
Commit: 2a0f12de21e581a2e19b9331bb8039f2fe3d27ad

Descripcion:

Se estabilizan tests de integración sensibles a timing y mocks en el flujo de
chat, reduciendo fragilidad y falsos negativos del entorno de validación.

Archivos afectados:

- `test/integration/recotizacion.planner_only.test.ts`
- `test/mocks/db_conversations.ts`

Validacion:

- hito registrado como estabilización de suite de integración sin cambio de runtime de producto

Impacto:

- mejora estabilidad de la suite de integración
- reduce ruido de fallas no funcionales
- deja más confiable la validación de hitos técnicos

### FIX-PIPELINE-CANCEL-EXECUTION-INTEGRITY-01

Estado: COMPLETADO  
Fecha: 2026-04-01  
Commit: d72997e2dd5576a73ee64528538ed6808907fabc

Descripcion:

Se corrige una inconsistencia crítica en cancelación para asegurar que una
cancelación confirmada impacte correctamente la fuente de verdad del estado y
los snapshots posteriores.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.cancel_multiturn_continuity.spec.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- hito registrado como refuerzo de consistencia mutativa y alineación entre ejecución y fuente de verdad canónica

Impacto:

- introduce/refuerza `cancel execution integrity`
- asegura que cancelación mutativa impacte la fuente de verdad real
- mantiene consistencia entre ejecución, respuesta, estado y snapshot posterior
- elimina duplicación estructural en cancel

### FIX-PIPELINE-CREATE-DRAFT-CONSISTENCY-01

Estado: COMPLETADO  
Fecha: 2026-04-01  
Commit: d02aca6d9f3d7f0ffd92d09f32f18b06830490d0

Descripcion:

Se introduce validación de consistencia interna del draft antes de avanzar el
flujo de create en `reservation`, bloqueando quote o execution sobre estado
incoherente y saneando conflictos cuando corresponde.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.create_quote_gating.spec.ts`

Validacion:

- hito registrado como incorporación del stage `draft consistency validation`

Impacto:

- evita decisiones sobre drafts incoherentes
- mejora calidad del estado antes de quote/execution
- preserva intención del usuario sin ejecutar sobre estado inválido
- consolida `draft consistency validation` como stage explícito del pipeline

### FIX-PIPELINE-CREATE-RAW-DATE-VALIDATION-01

Estado: COMPLETADO  
Fecha: 2026-04-02  
Commit: 2d1b71672c165fb8593e255601aa6d373ff1e4d8

Descripcion:

Se introduce validación RAW de fechas antes de cualquier normalización en
`reservation.create`, bloqueando avances sobre input temporal inválido.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.date_coherence.spec.ts`

Validacion:

- hito registrado como refuerzo estable de la regla RAW previa al avance de `create`

Impacto:

- protege invariantes de `create`
- evita autocorrección silenciosa de fechas
- asegura que execution no ocurra sobre estado inválido

### DOC-ARCHITECTURE-HITO-NAMING-GOVERNANCE-01

Estado: COMPLETADO  
Fecha: 2026-04-02  
Commit: 5d58cbad93b13303d53d449d6dfaa49fb2f473c9

Descripcion:

Se formalizan reglas estables para nombrado de hitos y evaluación canónica de
cambios técnicos dentro del modelo operativo de Begasist.

Archivos afectados:

- `docs/architecture/system_operating_model.md`

Validacion:

- no corresponde validación automática; es un hito documental/operativo

Impacto:

- fortalece gobernanza operativa de guardian + HDOC
- mejora consistencia entre auditoría, commit y documentación
- deja regla estable para futuros cierres

### FIX-TEST-SUITE-CREATE-CONFIRM-INTEGRITY-01

Estado: COMPLETADO  
Fecha: 2026-04-02  
Commit: aa38e01998fd8620f3920c8eaeb7556f8ab89d2e

Descripcion:

Se cubren salvaguardas críticas de create/confirm que ya existen en runtime
para evitar regresiones silenciosas en el flujo de confirmación.

Archivos afectados:

- `test/unit/messageHandler.reservation_confirm_followup.spec.ts`

Validacion:

- hito registrado como consolidación de validación de comportamiento ya gobernado

Impacto:

- mejora cobertura sobre integridad de confirmación en create
- reduce riesgo de regresiones silenciosas en flujo de confirmación
- refuerza validación de execution sobre estado consistente

### FIX-PIPELINE-CONTINUATION-SECONDARY-INTENT-NON-PERSISTENT-RETENTION-01

Estado: COMPLETADO  
Fecha: 2026-04-04  
Commit: 86a08c5ed9da1261c8050bf3e996f0cab8aa6b02

Descripcion:

Se elimina toda forma de retención de intención secundaria en el pipeline,
tanto explícita como implícita, restaurando gobernanza mono-dominio por turno.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.cross_domain_intent_prioritization.spec.ts`

Validacion:

- hito registrado como refuerzo estable de mono-dominio por turno sin memoria lateral

Impacto:

- restaura gobernanza estricta del pipeline
- elimina memoria lateral no autorizada
- refuerza determinismo conversacional
- asegura que la intención secundaria no se ejecuta, no se menciona y no se recuerda

### FIX-PIPELINE-DOMAIN-LOCK-FAQ-OVERRIDE-01

Estado: COMPLETADO  
Fecha: 2026-04-04  
Commit: 5bb5aea6672c181bde10ac8a6de1b48e71a827f4

Descripcion:

Se corrige una regresión donde una FAQ o policy pura rompía correctamente el
domain lock en routing, pero el runtime reinyectaba continuidad de
`reservation` en el output final.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.secondary_intent_governance_guard.spec.ts`

Validacion:

- hito registrado como refuerzo estable de pureza mono-dominio en output assembly

Impacto:

- elimina una regresión de ensamblado de respuesta
- evita contaminación conversacional desde `reservation` hacia `faq/policies`
- asegura respuesta pura del dominio dominante cuando el lock se rompe
- mantiene continuidad válida de `reservation` fuera del caso incompatible

### FIX-PIPELINE-REFERENCE-RESOLUTION-MODIFY-GUESTS-01

Estado: COMPLETADO  
Fecha: 2026-04-04  
Commit: eb202b10c6cb3f6c6bc62e1aaa4950b72bdd25fb

Descripcion:

Se corrige una regresión en `modify` donde, tras resolver target de reserva,
una intención explícita de cambiar `huéspedes`, `fechas` o `habitación` podía
ser interceptada por el branch genérico en lugar de activar el subestado
específico.

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Validacion:

- hito registrado como refuerzo estable de prioridad de intención específica en `modify`

Impacto:

- restaura determinismo del flujo `modify`
- evita regresión de routing entre branch genérico y branch específico
- preserva continuidad entre referencia resuelta y modificación concreta del campo
- mantiene continuidad de target sin introducir estado persistente nuevo

### FEAT-TEST-SUITE-PIPELINE-SECONDARY-INTENT-GOVERNANCE-GUARD-01

Estado: COMPLETADO  
Fecha: 2026-04-04  
Commit: f796ad81286873668344bd08138d3a7958d4e05f

Descripcion:

Se endurecen los guardrails de test suite para bloquear regresiones de
gobernanza del pipeline respecto de intención secundaria, cues
conversacionales, memoria lateral y reactivación implícita.

Archivos afectados:

- `test/unit/messageHandler.secondary_intent_governance_guard.spec.ts`

Validacion:

- hito registrado como guardrail ejecutable de gobernanza secundaria del pipeline

Impacto:

- fortalece la test suite como guardrail arquitectónico
- reduce riesgo de regresiones en gobernanza cross-domain
- bloquea cues, memoria lateral, reaparición implícita y mezcla de dominios

### FIX-PIPELINE-MODIFY-FLOW-DETERMINISM-01

Estado: COMPLETADO  
Fecha: 2026-04-04  
Commit: 34d56843d98c1e76de4091eee230b3088bd3fcbf

Descripcion:

Se corrige determinismo del flujo `modify`, evitando repregunta innecesaria en
subestado `guests`, aceptando input numérico corto y habilitando follow-up de
snapshot post-modify.

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Validacion:

- hito registrado como restauración del comportamiento transaccional esperado de `modify`

Impacto:

- mejora determinismo del flujo `modify`
- reduce ambigüedad operativa en subestado `guests`
- hace consistente el cierre de transacción post-modify
- evita reapertura innecesaria del menú

### FIX-PIPELINE-MODIFY-TARGET-DATA-ISOLATION-01

Estado: COMPLETADO  
Fecha: 2026-04-06  
Commit: 09f4c217188b9dad74185d562b4bccc365496030

Descripcion:

Se corrige contaminación de datos entre reservas durante `modify`, asegurando
que la ejecución y el snapshot de modificación se construyan exclusivamente
desde la reserva objetivo ya resuelta.

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Validacion:

- hito registrado como refuerzo estable de aislamiento de datos sobre target resuelto en `modify`

Impacto:

- elimina contaminación cruzada entre reservas
- refuerza aislamiento de datos en `modify`
- mejora consistencia de ejecución y persistencia
- evita que una modificación correcta por target termine con datos ajenos

### FIX-PIPELINE-MODIFY-SNAPSHOT-FOLLOWUP-ROUTING-01

Estado: COMPLETADO  
Fecha: 2026-04-06  
Commit: 54a140cfa62787ceea385c72a6154c606d52806c

Descripcion:

Se corrige el routing de follow-up post-modify para que pedidos como
`mostrame como quedó` prioricen snapshot del target activo en lugar de reabrir
guidance genérica de modificación.

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Validacion:

- hito registrado como cierre del follow-up transaccional correcto de `modify`

Impacto:

- cierra correctamente el follow-up post-modify
- mejora determinismo de routing en `modify`
- completa la experiencia transaccional del flujo
- evita que un estado ya correcto vuelva a guidance genérica

### DOC-ARCHITECTURE-ROADMAP-ALIGNMENT-01

Estado: COMPLETADO  
Fecha: 2026-04-04  
Commit: 68e98748406e9a77f35e39c60470f033dca11099

Descripcion:

Se alinea `docs/architecture/roadmap.md` con el estado real del sistema,
eliminando pendientes fantasma y corrigiendo una desalineación que ya inducía
decisiones equivocadas.

Archivos afectados:

- `docs/architecture/roadmap.md`

Validacion:

- hito registrado como corrección de gobernanza documental sobre el roadmap vigente

Impacto:

- mejora gobernanza arquitectónica
- reduce riesgo de duplicar trabajo ya hecho
- alinea roadmap con runtime real
- separa capacidades consolidadas de deuda residual explícita

### TEST-SNAPSHOT-FOLLOWUP-PRECEDENCE-GUARD-01

Estado: COMPLETADO  
Fecha: 2026-04-06  
Commit: 444022c825aee0ca3e8799d5785ead19fec88c8d

Descripcion:

Se agrega una suite de guardrails para congelar por tests la precedencia de
`snapshot follow-up` cuando existe contexto activo de reserva, evitando
degradación a guidance de `modify` o routing genérico.

Archivos afectados:

- `test/unit/messageHandler.snapshot_followup_precedence_guard.spec.ts`

Validacion:

- hito registrado como guardrail ejecutable de precedencia para snapshot follow-up
- los 9 fallos detectados en suites preexistentes no pertenecen causalmente a este hito

Impacto:

- fortalece la test suite como guardrail de precedencia
- reduce riesgo de regresión en snapshot post-modify
- deja congelado un contrato ya validado en runtime
- mejora trazabilidad entre comportamiento real y cobertura automatizada

### FIX-SNAPSHOT-FOLLOWUP-GATING-ACTION-EXCLUSION-01

Estado: COMPLETADO  
Fecha: 2026-04-07  
Commit: fce5683d6d4e633a47c5563672127c2dd80d3452

Descripcion:

Se corrige el gating de `snapshotFollowup` para evitar que follow-ups de vista
secuestren inputs con intención transaccional, restaurando la separación
correcta entre snapshot y acción.

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Validacion:

- hito registrado como fix de gating accional sobre snapshot follow-up
- los 2 fallos remanentes detectados no pertenecen causalmente a este hito

Impacto:

- corrige un bug de routing puntual y sensible
- restaura continuidad correcta en cancel y reference correction
- reduce ambigüedad entre snapshot y acción
- mantiene intacta la precedencia válida de follow-ups de vista

### FIX-MODIFY-CAPACITY-CONTRACT-TEST-ALIGNMENT-01

Estado: COMPLETADO  
Fecha: 2026-04-07  
Commit: 5b1ae5b7804c6ce551cc9f11f89e433084448fe3

Descripcion:

Se alinean tests con el contrato vigente de `modify` respecto a validación
preventiva de capacidad antes de ejecutar cambios.

Archivos afectados:

- `test/unit/messageHandler.focus_governance.spec.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- hito registrado como alineación de test suite con el contrato actual de capacidad en `modify`
- batería relevante en verde sin regresiones en snapshot, cancel y reference resolution

Impacto:

- elimina falsos negativos en suites existentes
- alinea expectativas con el comportamiento vigente
- refuerza disciplina de test suite respecto del contrato real
- evita interpretar como regresión un guard de capacidad correcto

### FIX-SNAPSHOT-TARGET-DATA-CONSISTENCY-01

Estado: COMPLETADO  
Fecha: 2026-04-07  
Commit: 3f8ec03987bc073f36a9f7a067d3c719948dc638

Descripcion:

Se corrige consistencia de snapshot posterior a cancelación, evitando mezcla de
datos entre reservas cuando el snapshot se arma después de confirmar una
cancelación.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- hito registrado como fix localizado de consistencia de snapshot post-cancel
- validación relevante en verde y corrección manual `E7` confirmada

Impacto:

- corrige mezcla de datos post-cancelación
- mejora consistencia interna del snapshot
- evita respuestas textuales incorrectas con código y atributos cruzados
- preserva integridad del dominio `reservation` sin tocar otros slices

### FIX-REFERENCE-AMBIGUOUS-ANAPHORA-GATING-01

Estado: COMPLETADO  
Fecha: 2026-04-07  
Commit: c0797154bdca9c1d5f596b1114cdd7bd45b69a8e

Descripcion:

Se corrige la resolución indebida de anáforas ambiguas como `esa` cuando no
existe selección previa válida y hay múltiples reservas candidatas.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- hito registrado como fix de gating para anáforas ambiguas sin antecedente válido
- batería relevante en verde sin romper snapshot follow-up, selección previa, candidato único, cancel ni modify

Impacto:

- corrige un bug real de reference resolution
- evita resolución errónea deíctica en escenarios ambiguos
- refuerza la regla de no inventar target
- mejora seguridad de routing transaccional en `reservation`

### DOC-ARCHITECTURE-MANUAL-STRESS-TEST-SERIES-01

Estado: COMPLETADO  
Fecha: 2026-04-08  
Commit: 2a4419f4f560c9bba8eb8349b9fc4d716f9956c4

Descripcion:

Se versiona una serie mínima de tests manuales de estrés para validar replace,
ambigüedad, arrastre de target, small talk y consistencia post-cancelación en
el dominio `reservation`.

Archivos afectados:

- `docs/architecture/plan_tests_manuales.md`

Validacion:

- hito registrado como documentación operativa de observación manual
- no corresponde validación automática; es un hito documental

Impacto:

- preserva una batería manual trazable para auditorías futuras
- mejora criterio operativo de validación de replace, ambiguity y continuity
- separa observación manual de fixes productivos
- da soporte histórico a futuras validaciones de reference lifecycle

### DOC-RESERVATION-TRUTH-HIERARCHY-AND-RUNTIME-PROJECTIONS-01

Estado: COMPLETADO  
Fecha: 2026-04-08  
Commit: 1588ef51ef6640e80566b4e0a290f69c53aa1113

Descripcion:

Se formaliza en arquitectura viva la jerarquía actual de verdad y proyección de
reservas dentro del runtime conversacional, sin refactorizar runtime.

Archivos afectados:

- `docs/architecture/message_pipeline.md`

Validacion:

- hito registrado como explicitación del modelo vigente de verdad y proyecciones
- no corresponde validación automática; es un hito documental/arquitectónico

Impacto:

- formaliza la jerarquía entre truth of record externa, proyección canónica local, punteros y helpers derivados
- deja explícito el riesgo de inconsistencia si proyecciones derivadas dominan respuestas
- mejora criterio de auditoría para futuros fixes de snapshot, modify y reference lifecycle
- no cambia comportamiento ni abre migración estructural

### DOC-ARCHITECTURE-DOC-GOVERNANCE-TAXONOMY-01

Estado: COMPLETADO  
Fecha: 2026-04-08  
Commit: 823c1a70dbe1df55bd578bd1a4891fed9ee64852

Descripcion:

Se ordena la gobernanza documental y la taxonomía de `docs/architecture/`,
normalizando naming de ADRs y reforzando la separación entre operación, ADRs,
arquitectura viva y artefactos derivados.

Archivos afectados:

- `docs/README.md`
- `docs/architecture/ADR-DOC-GOVERNANCE-01.md`
- `docs/architecture/README.md`
- `docs/architecture/ADR-EMAIL-TRANSPORT-TARGET.md`
- `docs/architecture/ADR-PIPELINE-RUNTIME-TARGET.md`
- `docs/architecture/channel_map.md`
- `docs/architecture/message_pipeline.md`
- `docs/architecture/roadmap.md`
- `docs/architecture/system_operating_model.md`
- `hito_mcp.md`

Validacion:

- hito registrado como ordenamiento de gobernanza documental y taxonomía
- no corresponde validación automática; es un hito documental/arquitectónico

Impacto:

- mejora gobernanza documental
- reduce duplicación entre documentos
- normaliza naming de ADRs
- refuerza la separación entre ADRs, operación y arquitectura viva

### FIX-SNAPSHOT-AUXILIARY-ROUTES-CANONICAL-ALIGNMENT-01

Estado: COMPLETADO  
Fecha: 2026-04-09  
Commit: 180023677027dbb0cf8f12bf53ce735e7d95821d

Descripcion:

Se corrige el fast-path auxiliar de snapshot post-booking para que priorice la
proyección canónica de reserva y no deje que `reservationSlots` domine sobre el
target real.

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Validacion:

- hito registrado como alineación del fast-path auxiliar de snapshot con la jerarquía canónica
- batería relevante en verde sin regresiones en reference resolution, snapshot follow-up ni focus governance

Impacto:

- corrige una ruta auxiliar puntual de snapshot
- reduce riesgo de inconsistencias por dominancia indebida de slots derivados
- alinea runtime con la jerarquía documental de verdad y proyección
- mejora robustez del snapshot post-booking sin tocar otros dominios

### DOC-REPO-LEGACY-DOCUMENT-ARCHIVE-01

Estado: COMPLETADO  
Fecha: 2026-04-09  
Commit: 198d7ce408563b4a9994889f22958cf92a98dbcb

Descripcion:

Se limpia la raíz del repo archivando documentación legacy en `_legacy/`, sin
mezclar runtime ni reescrituras documentales activas.

Archivos afectados:

- `_legacy/CONVENTIONAL_GIT_GUIDE.md`
- `_legacy/ESQUEMA_DE_DATOS_KB.md`
- `_legacy/KB_PIPELINE.md`
- `_legacy/MCPIntro.md`
- `_legacy/MIGRATION_CHECKLIST_system_playbook.md`
- `_legacy/NOTAS.md`
- `_legacy/README.dev.md`
- `_legacy/README_TEST.md`
- `_legacy/Whatsapp-Conversation-Flow.md`
- `_legacy/arbol.md`
- `_legacy/cache_para_hotel_phone_map.md`
- `_legacy/comandoGit.md`
- `_legacy/iteracion.md`
- `_legacy/session-notes.md`
- `_legacy/README.md`

Validacion:

- hito registrado como archivado documental legacy y repo hygiene
- no corresponde validación automática; es un hito documental

Impacto:

- mejora orden del repositorio
- reduce superficie de confusión en raíz
- preserva trazabilidad documental en `_legacy/`
- limpia la raíz sin pérdida de historial

### DOC-HISTORY-RECENT-HITO-SNAPSHOT-01

Estado: COMPLETADO  
Fecha: 2026-04-09  
Commit: 3409fcc6865a419df1f10f854b060773e29e8f4f

Descripcion:

Se versiona `hito_mcp_recent.md` como recorte operativo de historial reciente,
sin reemplazar el historial completo de `hito_mcp.md`.

Archivos afectados:

- `hito_mcp_recent.md`

Validacion:

- hito registrado como snapshot reciente de hitos para contexto operativo
- no corresponde validación automática; es un hito documental

Impacto:

- mejora disponibilidad de contexto reciente
- reduce costo de arranque en chats operativos
- conserva separación entre historial completo y snapshot reciente
- agrega un artefacto documental auxiliar sin invadir otros planos

### DOC-REPO-README-REPOSITIONING-01

Estado: COMPLETADO  
Fecha: 2026-04-09  
Commit: 990dac4887e4232da6f8b85e4422e0f147930245

Descripcion:

Se reescribe el `README.md` raíz para reposicionarlo como overview actual del
sistema Begasist, reemplazando el framing histórico del prototipo anterior.

Archivos afectados:

- `README.md`

Validacion:

- hito registrado como reposicionamiento del README raíz
- no corresponde validación automática; es un hito documental

Impacto:

- mejora la entrada principal del repositorio
- corrige desalineación entre README root y sistema actual
- reduce arrastre de framing histórico obsoleto
- presenta Begasist con una narrativa coherente con su estado vigente

### DOC-ARCHITECTURE-OPERATING-MODEL-FORMALIZATION-01

Estado: COMPLETADO  
Fecha: 2026-04-09  
Commit: 7651eeeb793a1f3c41a599d13823d514d54e0b91

Descripcion:

Se formaliza `docs/architecture/system_operating_model.md` como contrato
explícito de gobernanza operativa del sistema.

Archivos afectados:

- `docs/architecture/system_operating_model.md`

Validacion:

- hito registrado como formalización normativa del operating model
- no corresponde validación automática; es un hito documental/operativo

Impacto:

- fortalece el operating model como fuente normativa
- reduce ambigüedad interpretativa
- hace más auditable la disciplina de ejecución por hitos
- mejora consistencia entre gobernanza operativa y práctica real de cierre

### FIX-PIPELINE-AUXILIARY-REPLY-CANONICAL-ALIGNMENT-01

Estado: COMPLETADO  
Fecha: 2026-04-09  
Commit: 92a30d1f81b27b7b871ddf5a023547da01edbc8c
Clasificacion documental: SOLO_HITO

Descripcion:

Se alinea una reply auxiliar de `reservation` con la jerarquía canónica del
runtime, evitando que helpers derivados dominen sobre el target real.

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Validacion:

- hito registrado como alineación local de una reply auxiliar de `reservation`
- clasificado como `SOLO_HITO` por enforcement puntual de jerarquía ya existente
- batería relevante en verde sin regresiones en reference resolution, snapshot follow-up ni focus governance

Impacto:

- corrige una reply auxiliar puntual
- reduce riesgo de mezcla de atributos entre reservas
- fortalece consistencia entre foco activo y payload textual
- alinea implementación local con la jerarquía documentada del pipeline

### FIX-CI-CORE-PNPM-SETUP-ORDER-01

Estado: COMPLETADO  
Fecha: 2026-04-09  
Commit: c9f21e763ed4720bb065f1714afd6b164ac0b1b2
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige el workflow `ci-core` para que `pnpm` esté disponible antes de que
`actions/setup-node` inicialice el cache de dependencias.

Archivos afectados:

- `.github/workflows/ci-core.yml`

Validacion:

- hito registrado como fix de orden de setup para `pnpm` en `ci-core`
- causa raíz documentada: inicialización de cache de `pnpm` sin `pnpm`
  disponible en `PATH`
- solución aplicada: instalar/configurar `pnpm` antes de `setup-node`

Impacto:

- restaura ejecución correcta del workflow `ci-core`
- evita falla temprana en `Setup Node.js`
- mantiene el cache de `pnpm` en un orden válido
- mejora confiabilidad de CI sin expandir alcance

### FIX-PIPELINE-AUXILIARY-FALLBACK-CANONICAL-ALIGNMENT-02

Estado: COMPLETADO  
Fecha: 2026-04-09  
Commit: 9d24f1d58fa4cf5875a4571ea0c45e9ae4e5bd06
Clasificacion documental: SOLO_HITO

Descripcion:

Se alinea la ruta auxiliar `buildReservationLocalFallbackReply(...)` con la
jerarquía canónica de reservas, evitando que helpers derivados dominen sobre el
target real.

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Validacion:

- hito registrado como alineación canónica local de
  `buildReservationLocalFallbackReply(...)`
- `selectedReservationTarget` y `activeReservationContext` documentados como
  punteros hacia la proyección canónica local
- `reservationSlots`, `currSlots` y `nextSlots` quedan subordinados como
  helpers derivados/complementarios

Impacto:

- corrige una reply auxiliar local fallback
- reduce riesgo de mezcla de atributos entre reservas
- fortalece consistencia entre foco activo y respuesta textual
- alinea implementación local con la jerarquía documentada del pipeline

### FIX-CI-CORE-PNPM-VERSION-SOURCE-01

Estado: COMPLETADO  
Fecha: 2026-04-09  
Commit: 324d4e8053042131b47c0dfaee16bcddb63c1e1d
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige `ci-core` para que `pnpm` tenga una única fuente de versión en
GitHub Actions, evitando conflicto entre la workflow config y `package.json`.

Archivos afectados:

- `.github/workflows/ci-core.yml`

Validacion:

- hito registrado como fix de fuente única de versión para `pnpm` en `ci-core`
- causa raíz documentada: duplicación/conflicto de fuente de versión para
  `pnpm`
- solución aplicada: usar `package.json#packageManager` como única fuente de
  versión y eliminar la versión redundante en la workflow

Impacto:

- elimina conflicto de versión de `pnpm` en CI
- evita `ERR_PNPM_BAD_PM_VERSION`
- consolida una única fuente de verdad para el package manager
- mejora confiabilidad del workflow `ci-core`

### FIX-CI-CORE-BLOCKING-LINT-SCOPE-01

Estado: COMPLETADO  
Fecha: 2026-04-09  
Commit: 03bb9bdeb2b281f8a444698220fd4572d28e8d52
Clasificacion documental: SOLO_HITO

Descripcion:

Se ajusta `ci-core` para evitar que el scoped lint siga bloqueando el workflow
 por warnings heredados, manteniendo ese chequeo como observabilidad mientras
esa deuda se limpia por separado.

Archivos afectados:

- `.github/workflows/ci-core.yml`

Validacion:

- hito registrado como ajuste de severidad del scoped lint en `ci-core`
- causa raíz documentada: warnings heredados de lint disparaban el exit code 1
  del workflow aunque `pnpm test:core` y `pnpm ts-check` pasaban
- solución aplicada: mantener el chequeo scoped visible pero no bloqueante

Impacto:

- restaura continuidad de `ci-core`
- evita falsos rojos por deuda histórica de lint
- conserva visibilidad de warnings
- separa salud de runtime/test suite de deuda heredada de estilo y lint

### FIX-PIPELINE-MODIFY-CONTINUATION-CANONICAL-ALIGNMENT-03

Estado: COMPLETADO  
Fecha: 2026-04-09  
Commit: 02f55a08df9006a9bd825dcc5a100edc63a57c6e
Clasificacion documental: SOLO_HITO

Descripcion:

Se alinea la continuidad auxiliar de `modify` con la jerarquía canónica de
reservas, evitando que el prompt o menú de continuación derive sus datos
principales desde helpers no canónicos.

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Validacion:

- hito registrado como alineación canónica local de `buildFocusContinuationPrompt(...)`
- `selectedReservationTarget` y `activeReservationContext` documentados como
  punteros hacia la proyección canónica local dentro de `focus.subFlow === "modify"`
- `reservationSlots` y `nextSlots` quedan subordinados como helpers
  derivados/complementarios

Impacto:

- corrige la continuidad auxiliar de `modify`
- reduce riesgo de mezcla de atributos entre reservas en prompts y menús laterales
- fortalece consistencia entre foco activo y continuidad textual
- alinea una ruta auxiliar con la jerarquía documentada del pipeline

### FIX-PIPELINE-POSTACTION-SNAPSHOT-CANONICAL-ALIGNMENT-04

Estado: COMPLETADO  
Fecha: 2026-04-09  
Commit: 88f8d80b81c1df8617166ae637e10a216940221a
Clasificacion documental: SOLO_HITO

Descripcion:

Se alinea la reply de confirmación post-create con la proyección canónica del
booking recién creado, evitando drift entre execution y texto final.

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Validacion:

- hito registrado como alineación canónica local de la reply post-create
- el cambio queda acotado al bloque posterior a `confirmAndCreate(...)`
- `replySnapshot` pasa a priorizar el registro canónico local del booking
  recién creado y el `snapshot` derivado queda relegado a fallback

Impacto:

- corrige la confirmación textual post-create
- reduce riesgo de drift entre reserva creada y reply final
- fortalece consistencia entre execution y representación textual
- alinea una ruta post-action real con la jerarquía documentada del pipeline

### FIX-PIPELINE-CANCEL-PERSISTED-RECORD-CANONICAL-ALIGNMENT-05

Estado: COMPLETADO  
Fecha: 2026-04-09  
Commit: 9844c824965a389f87ac7d25b153eae933205aac
Clasificacion documental: SOLO_HITO

Descripcion:

Se alinea `buildPersistedReservationRecord(...)` con la jerarquía canónica de
reservas, haciendo que el record persistido priorice el canon sobre
`reservationSlots`.

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Validacion:

- hito registrado como alineación canónica del record persistido de reserva
- el cambio queda acotado a `buildPersistedReservationRecord(...)`
- `canonicalRecord` pasa a dominar sobre `reservationSlots` dentro de la capa
  de persistencia

Impacto:

- corrige la persistencia del record de reserva
- reduce riesgo de mezcla de datos entre reservas
- mejora consistencia entre canon y estado persistido
- refuerza integridad de las capas que luego consumen ese record

### FIX-PIPELINE-CREATE-VS-MODIFY-DOMINANCE-RESOLUTION-06

Estado: COMPLETADO  
Fecha: 2026-04-10  
Commit: 97e788fc7bb0fa04fe31fe9c62d9cc3fd24003d9
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige la dominancia entre `create` explícito y continuidad previa de
`modify`, asegurando que una nueva reserva con payload suficiente no sea
degradada a modificación de una reserva existente.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.multi_reservation.spec.ts`

Validacion:

- hito registrado como resolución de dominancia `create` vs continuidad
  incompatible de `modify`
- clasificado como `SOLO_HITO` por corrección localizada de una resolución de
  dominancia ya gobernada por los invariantes del pipeline
- `create` explícito con payload suficiente rompe la continuidad incompatible
  de `modify`
- no se ejecuta `modifyReservation(...)` y la reserva previa se mantiene intacta

Impacto:

- corrige dominancia create vs modify
- evita modificar por error una reserva previa
- mejora aislamiento entre reservas múltiples
- refuerza la coherencia del pipeline frente a cambios explícitos de intención

### FIX-PIPELINE-MODIFY-TARGET-CONTINUITY-07

Estado: COMPLETADO  
Fecha: 2026-04-10  
Commit: 11058f0e19a8ddb4741df137c48a0af92e854540
Clasificacion documental: SOLO_HITO

Descripcion:

Se preserva el target de reserva en `modify` ante interacciones laterales
compatibles, evitando pérdida de foco y repregunta de selección.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.focus_governance.spec.ts`

Validacion:

- hito registrado como preservación de target en continuidad de `modify`
- clasificado como `SOLO_HITO` por corrección localizada de continuidad sobre
  invariantes ya existentes del pipeline
- el sistema ya no limpia `selectedReservationTarget` indebidamente ante
  laterales compatibles
- la continuidad retoma la misma reserva y no inventa target nuevo

Impacto:

- corrige pérdida de foco en `modify`
- evita repreguntas innecesarias de selección
- mejora continuidad operativa tras laterales compatibles
- preserva identidad del target ya resuelto

### FIX-PIPELINE-CREATE-NAME-GATING-09

Estado: COMPLETADO  
Fecha: 2026-04-10  
Commit: b6686cb8240b6c30b9de228c84b437ea4bbb8127
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige la captura y el gating de `guestName` en el flujo `create`,
evitando caída a fallback genérico cuando el único faltante es el nombre del
huésped.

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Validacion:

- hito registrado como fix localizado de `guestName` gating en `create`
- se captura `guestName` inline desde el turno actual y se ajusta la prioridad
  de `reservationGuestName`
- se fuerza `buildCreateFlowPrompt(..., "guestName")` cuando ese es el único
  faltante antes del fallback genérico
- slice validado en verde: `72/72` tests

Impacto:

- mejora captura inline de `guestName`
- evita degradación del create cuando falta solo el nombre
- preserva sequencing correcto del flujo create
- reduce caídas innecesarias a fallback genérico

### FIX-PIPELINE-MODIFY-LATERAL-DOMAIN-RESOLUTION-08A

Estado: COMPLETADO  
Fecha: 2026-04-11  
Commit: 47c9f517cc1b800839dd085c15bac4a9f90356f4
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige la resolución de laterales de amenities dentro de `modify`,
evitando degradación a fallback de `reservation` y preservando la continuidad
simple del subflow.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.focus_governance.spec.ts`

Validacion:

- hito registrado como resolución lateral de amenities dentro de `modify`
- el lateral ya no cae en fallback de `reservation`
- no degrada a pricing ni `create`
- la continuidad simple de `modify` se preserva

Impacto:

- corrige resolución lateral en `modify`
- evita degradación a fallback incorrecto
- preserva continuidad simple del subflow
- protege create y confirm flows de regresiones laterales

### FIX-PIPELINE-CANCEL-LATERAL-DOMAIN-RESOLUTION-09

Estado: COMPLETADO  
Fecha: 2026-04-11  
Commit: ca41dfdd52f663d411a52638d87d63d197cff4fe
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige la resolución de laterales de amenities dentro de `cancel`,
evitando degradación a fallback de `reservation` y preservando la continuidad
del contexto de cancelación.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.cancel_multiturn_continuity.spec.ts`

Validacion:

- hito registrado como resolución lateral de amenities dentro de `cancel`
- el lateral ya no cae en fallback de `reservation`
- `pendingCancellation` y `selectedReservationTarget` se preservan
- `CONFIRMAR` posterior sigue ejecutando `cancelReservation(...)`

Impacto:

- corrige laterales dentro de `cancel`
- evita fallback incorrecto de `reservation`
- preserva continuidad real del proceso de cancelación
- permite retomar `CONFIRMAR` después del lateral sin perder target

### FIX-PIPELINE-CREATE-PROPOSAL-CONFIRM-PAYLOAD-ALIGNMENT-10

Estado: COMPLETADO  
Fecha: 2026-04-11  
Commit: cb95ddc8ca83676881380b026e2b9486500e58f3
Clasificacion documental: SOLO_HITO

Descripcion:

Se alinea la confirmación final de `create` con la última propuesta vigente,
evitando que el payload confirmado arrastre valores stale desde
`reservationSlots`.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.create_execution_integrity.spec.ts`

Validacion:

- hito registrado como alineación entre propuesta vigente y payload final de
  `create`
- se reemplaza composición manual por `mergeReservationSlots(...)`
- la confirmación final ya no arrastra valores stale
- el caso `double -> triple -> confirmar` queda alineado

Impacto:

- corrige confirmación final de `create`
- elimina drift entre propuesta cotizada y payload confirmado
- mejora integridad de ejecución del create
- refuerza coherencia entre draft, quote y confirmación final

### DOC-CHATGPT-CONTEXT-HANDOFF-CAPSULE-WORKFLOW-01

Estado: COMPLETADO  
Fecha: 2026-04-11  
Commit: d1183d858962615b66ec67e43e96f3e64ee2fd0b
Clasificacion documental: SOLO_HITO

Descripcion:

Se versionan un template de cápsula de contexto y una guía de handoff entre
chat viejo y chat nuevo en la app de ChatGPT.

Archivos afectados:

- `docs/CAPSULE_TEMPLATE_V3.md`
- `docs/abrir_chat_nuevo.md`

Validacion:

- hito registrado como workflow documental de traspaso de contexto entre chats
- se incorpora un template formal para cápsulas de contexto
- se documenta el procedimiento para generar la cápsula e iniciar un chat nuevo

Impacto:

- agrega un template formal para cápsulas de contexto
- documenta el workflow de handoff entre chat viejo y chat nuevo
- reduce fricción para migrar contexto operativo
- mejora consistencia del traspaso documental entre conversaciones

### DOC-ARCHITECTURE-FIXES-OPERATIONAL-RULE-RUNTIME-EVOLUTION-01

Estado: COMPLETADO  
Fecha: 2026-04-13  
Commit: 8850b45b85c68a5c3f7440e6fd448938d99edaf3
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se formaliza una regla operativa para que cada fix del runtime no solo corrija
el comportamiento observado, sino que deje la regla más explícita, más
canónica y menos repartida.

Archivos afectados:

- `docs/architecture/fixes-operational-rule-runtime-evolution.md`

Validacion:

- hito registrado como formalización de una regla operativa transversal para
  fixes del runtime
- el documento conecta corrección puntual con explicitud, canonicidad y menor
  dispersión lógica
- no introduce runtime nuevo ni refactor estructural

Impacto:

- formaliza una regla operativa transversal para fixes del runtime
- alinea la práctica de fixes con la dirección arquitectónica vigente
- mejora criterio documental para evolución controlada del runtime
- no cambia arquitectura ejecutable

### EXP-PIPELINE-FAQ-GRAPH-PARITY-01

Estado: COMPLETADO  
Fecha: 2026-04-13  
Commit: ce461fa0d78ba1b5e465177ea72dcba1a4ab2e72
Clasificacion documental: SOLO_HITO

Descripcion:

Se agrega una suite experimental aislada para recolectar evidencia auditable de
paridad entre `messageHandler` y `mhFlowGraph` en dominios FAQ, amenities y
policies.

Archivos afectados:

- `test/unit/messageHandler.graph_parity_faq.spec.ts`

Validacion:

- hito registrado como experimental, puro, atómico y `single-intention`
- no toca runtime productivo ni lógica de dominio
- produce evidencia auditable de paridad entre `messageHandler` y
  `mhFlowGraph`
- el alcance queda acotado a un único archivo de test

Impacto:

- agrega evidencia auditable de paridad para dominios FAQ
- permite observar diferencias reales sin intervenir runtime
- mantiene separado el experimento de fixes productivos
- mejora trazabilidad de la comparación entre runtime actual y graph

### EXP-PIPELINE-CREATE-LATERAL-PARITY-02

Estado: COMPLETADO  
Fecha: 2026-04-13  
Commit: 60144597cbefce5ebc86ac7898fee56e3ba16b2e
Clasificacion documental: SOLO_HITO

Descripcion:

Se agrega una suite experimental aislada para recolectar evidencia contextual
de paridad entre `messageHandler` y `mhFlowGraph` en el escenario de `create`
activo e incompleto con lateral puro y reenganche básico.

Archivos afectados:

- `test/unit/messageHandler.graph_parity_create_lateral.spec.ts`

Validacion:

- hito registrado como experimental, puro, atómico y `single-intention`
- no toca runtime productivo ni lógica de dominio
- produce evidencia contextual de paridad entre `messageHandler` y
  `mhFlowGraph`
- el alcance queda acotado a un único archivo de test

Impacto:

- agrega evidencia contextual de paridad para laterales en `create`
- permite observar diferencias reales sin intervenir runtime
- mantiene separado el experimento de fixes productivos
- mejora trazabilidad de la comparación entre runtime actual y graph

### EXP-PIPELINE-CREATE-LATERAL-PARITY-02-REVALIDATION

Estado: COMPLETADO  
Fecha: 2026-04-13  
Commit: 28e3a5d427f5a572b6743b79adaab8b925edc0a6
Clasificacion documental: SOLO_HITO

Descripcion:

Se endurece la evidencia experimental del escenario de lateral puro en
`create`, revalidando de forma explícita el estado observado después de
`FIX-PIPELINE-CREATE-LATERAL-CONTINUITY-REFINEMENT-12`.

Archivos afectados:

- `test/unit/messageHandler.graph_parity_create_lateral.spec.ts`

Validacion:

- hito registrado como revalidación experimental incremental
- no toca runtime productivo ni lógica de dominio
- endurece la evidencia del experimento base `EXP-PIPELINE-CREATE-LATERAL-PARITY-02`
- el alcance queda acotado a un único archivo de test

Impacto:

- fortalece la evidencia experimental post-fix 12
- hace más auditables las señales `createContinuity` y `pure`
- mantiene separado el experimento de fixes productivos
- mejora trazabilidad de la observación contextual ya existente

### FIX-PIPELINE-CREATE-LATERAL-CONTINUITY-REFINEMENT-12

Estado: COMPLETADO  
Fecha: 2026-04-13  
Commit: ba1345179d15ba8bf3470ed0591de4d4fd317c78
Clasificacion documental: SOLO_HITO

Descripcion:

Se refina la continuidad de `create` para que, después de un lateral puro, el
turno siguiente pueda reenganchar explícitamente el faltante pendiente si el
usuario expresa continuación afirmativa.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.focus_governance.spec.ts`

Validacion:

- hito auditado como puro, atómico y `single-intention`
- el lateral puro sigue sin continuación textual en ese mismo turno
- el turno siguiente reengancha con `buildCreateFlowPrompt(pre.lang, nextCreateMissingField)`
- sanity validada en verde en focus governance, create sequencing y create
  quote gating

Impacto:

- corrige la continuidad posterior a laterales puros en `create`
- reengancha el faltante correcto sin contaminar el turno lateral
- evita habilitar quote o availability prematuros
- refuerza la continuidad simple del flujo `create`

### FIX-PIPELINE-CREATE-LATERAL-PURITY-REFINEMENT-13

### FIX-PIPELINE-CREATE-LATERAL-KB-FAILSAFE-18

Estado: COMPLETADO  
Fecha: 2026-04-16  
Commit: 2728f86bd7ebc41066c5ebe6f59f638841b5f012
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se corrige el path real donde un lateral puro dentro de `create` perdía
precedencia cuando KB fallaba. El gate lateral era correcto, pero el bloque
inline de KB dentro de `bodyLLM` podía degradar el turno hacia `agentGraph`
transaccional si `answerWithKnowledge(...)` fallaba o no devolvía categoría
segura con texto.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.focus_governance.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- suites reportadas en verde:
  - `test/unit/messageHandler.focus_governance.spec.ts`
  - `test/unit/messageHandler.create_sequencing.spec.ts`
  - `test/unit/messageHandler.create_quote_gating.spec.ts`
- validación manual reportada:
  - `quiero reservar del 1 al 5 de mayo para 2 personas`
  - `¿el wifi está incluido?`
  - `sí, continuar`
  - `doble`
  - `Marcelo Martinez`
  - `confirmar`
- si `pureCreateLateralTurn === true` y KB falla o no devuelve `safeCat + text`,
  el turno responde fallback lateral puro y no cae al graph transaccional
- `create` queda intacto y el turno siguiente reengancha el faltante real

Impacto:

- agrega failsafe canónico para laterales puros dentro de `create`
- bloquea contaminación transaccional cuando KB falla
- preserva continuidad posterior de `create` sin mezclar dominios
- consolida una regla estable de precedencia lateral dentro del runtime vigente

### FIX-PIPELINE-CREATE-LATERAL-PURITY-REFINEMENT-13

Estado: COMPLETADO  
Fecha: 2026-04-13  
Commit: 21c1430e2913c6503a4f44f7a66184fb88f04da3
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige la pureza del dominio lateral dentro de `create`, haciendo que un
turno lateral puro quede persistido con su categoría lateral real y no con
trazas de `reservation`.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.focus_governance.spec.ts`

Validacion:

- hito auditado como puro, atómico y `single-intention`
- el lateral puro dentro de `create` queda persistido como dominio lateral
  válido
- no hay contaminación con `reservation`
- sanity validada en verde en focus governance, create sequencing y create
  quote gating

Impacto:

- corrige pureza de dominio en laterales de `create`
- evita persistencia incorrecta de `reservation` en turnos laterales puros
- hace más explícita la regla en un punto central del slice
- preserva aislamiento entre lateral informativa y flujo transaccional

### EXP-PIPELINE-CREATE-LATERAL-PARITY-02-FINAL

Estado: COMPLETADO  
Fecha: 2026-04-13  
Commit: 79aa03242cf4c5323a25af4b48c5761f17b7f9a6
Clasificacion documental: SOLO_HITO

Descripcion:

Se registra la evidencia final de `PARIDAD_OK` para el escenario de lateral
puro en `create`, luego de los fixes 12 y 13.

Archivos afectados:

- `test/unit/messageHandler.graph_parity_create_lateral.spec.ts`

Validacion:

- hito registrado como experimental final
- no toca runtime productivo ni lógica de dominio
- documenta `PARIDAD_OK` con `pure=true` y `createContinuity=true`
- el alcance queda acotado a un único archivo de test

Impacto:

- deja evidencia final auditable de paridad contextual lograda
- refleja la mejora observada tras los fixes 12 y 13
- mantiene separado el experimento de fixes productivos
- cierra la línea experimental del escenario lateral en `create`

### TEST-PIPELINE-GRAPH-PARITY-FIXTURE-ALIGNMENT-01

Estado: COMPLETADO  
Fecha: 2026-04-14  
Commit: 8ed48023903c5f768e2d540c12d30e297f6e21f9
Clasificacion documental: SOLO_HITO

Descripcion:

Se alinean los fixtures compartidos de tests de parity con el shape esperado
del mensaje, usando `channel` tipado y `timestamp`.

Archivos afectados:

- `test/unit/messageHandler.graph_parity_create_lateral.spec.ts`
- `test/unit/messageHandler.graph_parity_faq.spec.ts`

Validacion:

- hito registrado como ajuste de fixtures de tests de parity
- no toca runtime productivo ni lógica de dominio
- el alcance queda acotado a dos suites de parity
- la intención es compatibilidad del shape del mensaje

Impacto:

- alinea fixtures de parity con el contrato esperado del mensaje
- elimina incompatibilidades de tipado en `channel`
- agrega `timestamp` a los mensajes de test
- mantiene intacta la semántica funcional de las suites

### FIX-PIPELINE-VERIFY-PENDING-SNAPSHOT-CONTINUITY-14

Estado: COMPLETADO  
Fecha: 2026-04-14  
Commit: 8c81f9bcd56f08ec7ce16aea99a742605527242a
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige la precedencia entre `verify pending` y la continuidad afirmativa de
`create`, para que verify domine cuando corresponde y no se corte por faltantes
de create no pertinentes en ese punto.

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Validacion:

- hito auditado como puro, atómico y `single-intention`
- `verify pending` ahora precede a la continuidad afirmativa de `create`
- el reprompt por faltantes queda restringido a `checkIn`, `checkOut` y
  `roomType`
- suites validadas en verde: verify pending continuity, create sequencing,
  create quote gating y focus governance

Impacto:

- corrige precedencia de continuidad cuando existe verify pendiente
- evita corte indebido del flujo por faltantes de create no pertinentes
- preserva la continuidad correcta de verify
- mantiene acotado el cambio al slice necesario

### FIX-PIPELINE-MODIFY-DATES-ENTRY-GOVERNANCE-15

### FIX-PIPELINE-MODIFY-DATES-REALPATH-ENTRY-CONTINUATION-16

Estado: COMPLETADO  
Fecha: 2026-04-15  
Commit: e1740e43138a4cf00493317096fa85f66ce8c5f0
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se corrige la continuidad real de `modify.dates` en conversación completa.
La causa raíz no estaba en el parsing temporal sino en la falta de persistencia
del estado `modify` al abrir el menú sin target explícito.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- tests unitarios del hito reportados en verde
- flujo manual validado:
  - `quiero cambiar mi reserva`
  - `ingreso el jueves`
  - `el domingo`
- el runtime persiste `activeFlow`, `conversationFocus` y `lastCategory`
  incluso sin `boundReservationTarget` explícito
- `modify.dates` consume `checkIn` parcial y luego resuelve `checkOut`
  contextual desde fecha única sin repreguntas redundantes

Impacto:

- corrige continuidad real de entrada y reenganche en `modify.dates`
- evita degradación al menú genérico por ausencia de target explícito
- preserva estado canónico del flujo `modify` sin inventar target
- consolida una regla estable de continuidad dentro de `messageHandler`

### FIX-PIPELINE-MODIFY-DATES-ENTRY-GOVERNANCE-15

Estado: COMPLETADO  
Fecha: 2026-04-14  
Commit: 948c4574600481dbc8e151ea438e430f56e3d8bd
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige la entrada a `modify.dates` para que, ante señal temporal
suficiente, el flujo entre directamente al subflow correcto y evite el menú
genérico de `modify`.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- hito auditado como puro, atómico y `single-intention`
- la entrada a `modify.dates` ahora se gobierna por señal temporal suficiente
- se evita el menú genérico cuando corresponde entrar al subflow de fechas
- sanity validada en verde en reference resolution, create sequencing, create
  quote gating y verify pending continuity

Impacto:

- corrige gobernanza de entrada a `modify.dates`
- evita degradación al menú genérico de modificación
- mejora precisión del subflow de fechas
- mantiene acotado el cambio al slice temporal de `modify`

### FIX-PIPELINE-CREATE-LATERAL-DOMAIN-RESOLUTION-11

Estado: COMPLETADO  
Fecha: 2026-04-13  
Commit: 4bd76d8f7e31a09f4f0f11b65c0a8ba91d1c9e58
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige la resolución de laterales dentro de `create` para que se resuelvan
en su dominio real sin agregar continuación textual de `reservation` en ese
mismo turno.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.focus_governance.spec.ts`

Validacion:

- hito auditado como puro, atómico y `single-intention`
- el lateral se resuelve en su dominio propio sin degradar a fallback de
  `reservation`
- no se agrega continuación textual de reserva en el mismo turno
- la continuidad simple de `create` queda preservada

Impacto:

- corrige laterales dentro de `create`
- evita fallback incorrecto de `reservation`
- preserva continuidad simple del subflow
- protege create sequencing y confirm flows de regresiones laterales

### DOC-CHATGPT-CAPSULE-TEMPLATE-AND-HANDOFF-REFINEMENT-02

Estado: COMPLETADO  
Fecha: 2026-04-13  
Commit: fb7d26a3d67694fa1194d9393f44a01ed7071b96
Clasificacion documental: SOLO_HITO

Descripcion:

Se refinan la plantilla de cápsula de contexto y la guía de handoff entre
chat viejo y chat nuevo en ChatGPT.

Archivos afectados:

- `docs/CAPSULE_TEMPLATE_V3.md`
- `docs/abrir_chat_nuevo.md`

Validacion:

- hito registrado como refinamiento documental de cápsula y handoff
- la plantilla hace más explícita la regla operativa de fixes y el uso de
  referencias documentales
- la guía de apertura de chat nuevo queda reformulada y más estructurada

Impacto:

- mejora claridad operativa de la cápsula de contexto
- refuerza el handoff entre conversaciones
- hace más explícito el criterio de fixes dentro del material de traspaso
- mejora consistencia documental del workflow entre chats

### DOC-PIPELINE-CANONICAL-REPLY-GOVERNANCE-01

Estado: COMPLETADO  
Fecha: 2026-04-09  
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se formaliza como regla explícita del runtime la precedencia de la proyección
canónica sobre helpers derivados en la construcción de replies de reserva.

Archivos afectados:

- `docs/architecture/message_pipeline.md`

Validacion:

- hito registrado como consolidación documental transversal, sin cambio de código
- la regla queda explícita para snapshot, confirmaciones, replies post-action,
  continuation prompts y fallback replies
- el hito deriva de comportamientos ya implementados en múltiples rutas previas

Impacto:

- convierte una pauta ya implementada en gobernanza arquitectónica explícita
- reduce ambigüedad documental sobre la precedencia entre canon y helpers
- mejora coherencia transversal entre rutas de reply ya alineadas
- no refactoriza runtime ni introduce capas nuevas

### DOC-OPERATING-MODEL-AGENT-DISPATCH-AND-TOOLING-ALIGNMENT-01

Estado: COMPLETADO  
Fecha: 2026-04-17  
Commit: 884b4b0244d079e2a69886841a7df7dc4988a776
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se alinea el contrato operativo global con el dispatch explícito de agentes,
la herramienta de cápsula, la puerta de entrada y el prompt de checkpoint
arquitectónico.

Archivos afectados:

- `README.md`
- `docs/CAPSULE_TEMPLATE_V3.md`
- `docs/architecture/system_operating_model.md`
- `docs/architecture/prompts/architectural_checkpoint.md`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: none`
- se explicita la jerarquía entre `system_operating_model.md` y
  `config.toml`
- se formaliza `AGPT HITO DISPATCH RULE`
- se formaliza la interfaz `Guardian -> HDOC` con salida estructurada
  obligatoria
- HDOC queda explícitamente impedido de reanalizar el diff completo salvo
  inconsistencia material, duda documental real o conflicto de evidencia

Impacto:

- consolida el contrato operativo global entre documentos y ejecución
- reduce ambigüedad en dispatch de agentes y fases operativas
- fortalece trazabilidad entre orquestación, auditoría y cierre documental
- requiere mantener `README.md` y `docs/CAPSULE_TEMPLATE_V3.md` como
  artefactos derivados y no como fuentes normativas paralelas

### DOC-ROADMAP-RUNTIME-BOUNDARIES-GOVERNANCE-UPDATE-01

Estado: COMPLETADO  
Fecha: 2026-04-17  
Commit: 3369b4d5ad85e046208a1ace0cf4867117bae494
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se actualiza el estado real del roadmap, el checkpoint de entrada a Nivel 4 y
las reglas de gobernanza para distinguir cambios locales frente a cambios
estructurales del roadmap.

Archivos afectados:

- `docs/architecture/roadmap.md`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: structural_candidate`
- dictamen explícito de `arquitecto_sistema`: `APROBADO_PARA_HDOC`
- se valida como correcto el pasaje a `PRE-NIVEL 4 — HARDEN RUNTIME BOUNDARIES`
- se valida el checkpoint explícito de entrada a Nivel 4
- se valida consistencia con `system_operating_model.md`
- queda observación editorial no bloqueante: acotar la autoridad del roadmap
  al estado arquitectónico del roadmap, niveles y checkpoints

Impacto:

- corrige la representación arquitectónica del momento real del sistema
- explicita la etapa actual y sus precondiciones de endurecimiento
- formaliza la gobernanza del roadmap para cambios locales vs estructurales
- fortalece trazabilidad entre roadmap, dictamen arquitectónico y cierre
  documental

### FIX-PIPELINE-MODIFY-LATERAL-CONTINUITY-16

Estado: COMPLETADO  
Fecha: 2026-04-17  
Commit: 4002b5e7946242a406192de386715be0b6ce69f0
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige la continuidad local de `modify.dates` después de un lateral FAQ
puro, retomando desde el faltante contextual real en lugar de repreguntar ambas
fechas.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- no se agregan reglas nuevas de arquitectura ni gobernanza
- se preserva el estado canónico ya presente en `modify.dates`
- el reenganche posterior al lateral retoma el faltante real y evita
  repregunta redundante

Impacto:

- corrige continuidad local dentro del runtime vigente
- evita repregunta innecesaria de fechas en `modify.dates`
- preserva foco y estado canónico sin fuentes paralelas
- mantiene el alcance acotado a un fix operativo de slice

### FIX-PIPELINE-MODIFY-DATES-CONTEXTUAL-ANCHORING-17

Estado: COMPLETADO  
Fecha: 2026-04-17  
Commit: f95f095bcac31177b3e8f2836f60fc614f541b03
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige el anclaje contextual local para weekdays relativos cortos en
`modify.dates` cuando existe `checkIn` parcial y falta `checkOut`.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- no se alteran contratos estructurales, arquitectura global ni roadmap
- el runtime usa el estado parcial real como referencia temporal canónica
- se evita depender de `hoy` como ancla dominante cuando ya existe contexto
  parcial válido

Impacto:

- corrige anclaje contextual local dentro de `modify.dates`
- preserva el estado parcial real como referencia canónica
- evita parsing paralelo global o fuentes temporales competidoras
- mantiene el alcance acotado a un fix operativo de slice

### FIX-PIPELINE-MODIFY-DATES-SLOT-CORRECTION-18

Estado: COMPLETADO  
Fecha: 2026-04-18  
Commit: a270e2b02edb7cee654866aad8d203ce8e8dcf70
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige `modify.dates` para interpretar correcciones conversacionales sobre
un rango ya completo y reemplazar el slot corregido sin degradar el subflow.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- no altera arquitectura, contratos globales ni roadmap
- reemplaza el slot corregido sobre el estado ya capturado como fuente de
  verdad
- no reinicia el flujo ni introduce parsing global paralelo

Impacto:

- corrige una corrección conversacional local dentro de `modify.dates`
- reemplaza el slot corregido sin degradar el subflow
- preserva el estado ya capturado como referencia canónica
- mantiene el alcance acotado a un fix operativo de slice

### FIX-PIPELINE-CREATE-PREMATURE-EXECUTION-21

Estado: COMPLETADO  
Fecha: 2026-04-20  
Commit: 7220ace9c21e6158a647a545b2c1c5625f1968c0
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige la ejecución prematura y la duplicación en `create` mediante
confirmación explícita de commit y un guard consistente entre handler y graph.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `lib/agents/nodes/reservation.ts`
- `lib/agents/nodes/reservationConfirm.ts`
- `test/unit/messageHandler.create_execution_integrity.spec.ts`
- `test/unit/graph_create_confirm_guard.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- no cambia arquitectura, ADR ni roadmap
- elimina caminos implícitos de ejecución en `create`
- unifica la regla de commit explícito entre handler y graph

Impacto:

- corrige ejecución prematura y duplicación dentro de `create`
- alinea handler y graph bajo una misma regla de commit explícito
- preserva la ejecución gobernada por el estado conversacional existente
- mantiene el alcance acotado a un fix operativo de slice

### FEAT-ADMIN-DEMO-INVENTORY-OBSERVABILITY-19

Estado: COMPLETADO  
Fecha: 2026-04-20  
Commit: 7a860c799b0be05149280fd89f2b67d43fb85627
Clasificacion documental: SOLO_HITO

Descripcion:

Se agrega una herramienta de observabilidad y control del inventario demo en
memoria con UI, API, snapshot real del adapter y reset operativo por `hotelId`.

Archivos afectados:

- `app/admin/demo-inventory/page.tsx`
- `app/api/admin/demo-inventory/route.ts`
- `app/admin/layout.tsx`
- `instrumentation.ts`
- `lib/mcp/channelManagerAdapter.ts`
- `lib/utils/debugLog.ts`
- `middleware.ts`
- `test/unit/channelManagerAdapter.registry.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- no modifica arquitectura estructural, ADR ni roadmap
- la observabilidad lee y controla el store real del adapter inmemory
- no introduce estado paralelo ni cache derivado

Impacto:

- agrega capacidad operativa nueva acotada al entorno demo
- evita debugging ciego sobre el inventario demo en memoria
- fortalece observabilidad usando el snapshot real del adapter
- mantiene el alcance acotado a una feature operativa de entorno demo

### REFACTOR-RUNTIME-CONFIRMATION-GOVERNANCE-22

Estado: COMPLETADO  
Fecha: 2026-04-21  
Commit: 062211a6144bc68fb3e33fb4bbe0ae27222d80b6
Clasificacion documental: SOLO_HITO

Descripcion:

Se consolida la gobernanza de confirmación de `create` en un helper compartido
usado por handler y graph, preservando confirmación explícita como único
trigger de ejecución y evitando reapertura de `create` post-confirmación.

Archivos afectados:

- `lib/agents/confirmationGovernance.ts`
- `lib/handlers/messageHandler.ts`
- `lib/agents/nodes/reservation.ts`
- `lib/agents/nodes/reservationConfirm.ts`
- `test/unit/messageHandler.reservation_confirm_followup.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: local`
- no requiere actualización de roadmap ni documentación arquitectónica
- centraliza el contrato de ejecución `create`
- preserva `execution` como fuente de verdad y cierra el flujo
  post-confirmación sin reabrir `create`

Impacto:

- elimina duplicación semántica de la regla de confirmación
- reduce divergencia futura entre handler y graph
- preserva confirmación explícita como único trigger de ejecución
- mantiene el alcance acotado a un refactor local del runtime

### REFACTOR-RUNTIME-BRANCH-SIMPLIFICATION-23

Estado: COMPLETADO  
Fecha: 2026-04-21  
Commit: 8cf7206f055ae8f7c95e49c41a933e8e6c88840d
Clasificacion documental: SOLO_HITO

Descripcion:

Se simplifican branches del runtime para el follow-up post-confirmación,
extrayendo la resolución de snapshot confirmado a un helper puro y dejando los
efectos en el branch principal.

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: local`
- no requiere actualización de roadmap ni documentación arquitectónica
- separa lectura de estado y efectos sin alterar semántica

Impacto:

- mejora legibilidad y auditabilidad del branch post-confirmación
- mantiene `execution` como fuente de verdad
- reduce complejidad sin introducir nueva fuente de verdad
- mantiene el alcance acotado a un refactor local del runtime

### FIX-CREATE-FIRST-TURN-FULL-SLOT-PARSING-24

Estado: COMPLETADO  
Fecha: 2026-04-21  
Commit: fa8cd789db9ee254421d65de3c0545ea40ee9c95
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige el parsing de rango `dd/mm` sin año en el primer turno de `create`
mediante reutilización de `extractDateRangeFromTextLight` con guard explícito.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.slot_ingestion.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: local`
- no requiere actualización de roadmap ni documentación arquitectónica
- reutiliza extractor existente y corrige una precedencia mínima de slots

Impacto:

- corrige ingestión temporal local en primer turno de `create`
- preserva `execution` como fuente de verdad
- evita introducir extractor nuevo o fuente paralela de fechas
- mantiene el alcance acotado a un fix operativo de runtime

### FIX-CREATE-GUESTNAME-FALSE-POSITIVE-25

Estado: COMPLETADO  
Fecha: 2026-04-21  
Commit: 0aefcc79ccc802a221c5a021286ce97d4ce6aefd
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrigen falsos positivos en extracción de `guestName` en `create` mediante
endurecimiento del validador canónico `isSafeGuestName`.

Archivos afectados:

- `lib/agents/helpers.ts`
- `test/unit/messageHandler.slot_ingestion.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: local`
- no requiere actualización de roadmap ni documentación arquitectónica
- preserva el contrato de nombre completo

Impacto:

- evita contaminación de slots con tokens transaccionales
- endurece el validador canónico de nombres
- preserva `execution` como fuente de verdad
- mantiene el alcance acotado a un fix local de runtime

### REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-1

Estado: COMPLETADO  
Fecha: 2026-04-23  
Commit: 3c8ba8ab3cafee4fbe9110206a0ec59244dcceb7
Clasificacion documental: SOLO_HITO

Descripcion:

Se consolidan checks equivalentes de contexto `create` en `messageHandler`
mediante el helper `isCreateContextActive(pre)`, sin alterar fast-paths,
guards vagos ni tests.

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- reduce duplicación local de guards equivalentes dentro de `messageHandler`

Impacto:

- fortalece una única lógica para detectar contexto `create`
- reduce duplicación local de checks equivalentes
- preserva la fuente de verdad del runtime vigente
- mantiene el alcance acotado a un refactor local y reversible

### REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-2

Estado: COMPLETADO  
Fecha: 2026-04-23  
Commit: 6c3a7578d9a4f39a59d21f68eee06c8af089eb64
Clasificacion documental: SOLO_HITO

Descripcion:

Se ajusta la precedencia del Fast-path 0 en `create` para priorizar rangos
válidos y evitar que el corredor normal de quote/confirmación sea secuestrado
por el atajo de fechas. El alcance incluye corrección contextual de rango corto
dentro de `create`.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.slot_ingestion.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- preserva el corredor normal de `create` cuando el turno ya trae payload
  completo

Impacto:

- corrige la precedencia local del Fast-path 0 en `create`
- evita desvíos por atajo temporal sobre quote/confirmación
- mantiene una única resolución operativa dentro de `messageHandler`
- conserva el alcance acotado a un fix local del runtime vigente

### REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-3

Estado: COMPLETADO  
Fecha: 2026-04-23  
Commit: 942d54314c41ba139ee72ee5c51e54e64fc9973d
Clasificacion documental: SOLO_HITO

Descripcion:

Se agrega un sufficiency gating local en `messageHandler` para evitar
activación prematura de `create` ante consultas vagas de disponibilidad o
pedidos ambiguos para fin de semana.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.no_context_reservation_guards.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- preserva el gating mínimo de `create` ante inputs difusos

Impacto:

- evita activaciones prematuras del flujo `create`
- preserva una resolución consistente entre intención suficiente e
  insuficiente
- mantiene el runtime dentro de `messageHandler`
- conserva el alcance acotado a un fix local del runtime vigente

### REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-4

Estado: COMPLETADO  
Fecha: 2026-04-23  
Commit: 0aafb17817f53ea57fd6f3a33a19d9d312c7edef
Clasificacion documental: SOLO_HITO

Descripcion:

Se estabilizan expectations de tests de `create` frente a rollover/calendario
mediante actualización de fixtures de mes y uso de asserts menos frágiles para
fechas.

Archivos afectados:

- `test/unit/inputNormalizerAgent.basic.test.ts`
- `test/unit/messageHandler.no_context_reservation_guards.spec.ts`
- `test/unit/messageHandler.slot_ingestion.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- reduce fragilidad de la suite frente a rollover/calendario

Impacto:

- endurece la estabilidad local de tests de `create`
- evita expectations frágiles ligadas al mes o al calendario corriente
- no altera fuentes de verdad ni lógica operativa
- conserva el alcance acotado a hardening de la suite

### REFACTOR-RUNTIME-REFERENCE-RESOLUTION-ALIGNMENT-32

Estado: COMPLETADO  
Fecha: 2026-04-24  
Commit: 8728ac3d86aee21e1b062a8c2540096fda31b8ea
Clasificacion documental: SOLO_HITO

Descripcion:

Se alinea el runtime local de `messageHandler` con el boundary contractual de
reference resolution, separando de forma más explícita el resultado de decisión
del consumo posterior sin mover lógica fuera de `messageHandler` ni cambiar
comportamiento observable.

Archivos afectados:

- `lib/handlers/messageHandler.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- explicita el boundary del slice reference resolution dentro del runtime
  vigente

Impacto:

- fortalece la separación entre decision layer y consumo downstream
- no agrega estado nuevo ni fuentes paralelas de verdad
- preserva la lógica dentro de `messageHandler`
- mantiene el alcance acotado a un refactor runtime-local sin cambio observable

### FIX-CREATE-CONTEXTUAL-DATE-FOLLOWUP-33

Estado: COMPLETADO  
Fecha: 2026-04-24  
Commit: d3bc86b34fde60dd3ccc48bd87912d7f1bf3c45a
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige `create` para absorber una única fecha contextual relativa o
explícita cuando el runtime espera `checkIn` o `checkOut`, persistiendo el
draft parcial antes de decidir el siguiente prompt y evitando repreguntas del
mismo slot.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.slot_ingestion.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- consolida la persistencia parcial del draft canónico en `create`

Impacto:

- evita repreguntas del mismo slot cuando ya hay fecha contextual suficiente
- alinea la persistencia parcial con el flujo operativo real
- no introduce estado paralelo ni nueva fuente de verdad
- mantiene la lógica dentro de `messageHandler`

### FIX-CREATE-CHECKIN-PROMPT-FRAMING-34

Estado: COMPLETADO  
Fecha: 2026-04-24  
Commit: 3a95433483a86f44b654bb42598e5e8d551334cb
Clasificacion documental: SOLO_HITO

Descripcion:

Se corrige el wording de prompts de fecha faltante en contexto `create`,
evitando framing de `modify` ("nueva fecha") cuando el flujo está iniciando una
reserva o consulta de disponibilidad.

Archivos afectados:

- `lib/handlers/pipeline/availability.ts`
- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.slot_ingestion.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- refuerza la coherencia entre estado conversacional real y wording de prompt

Impacto:

- evita framing incorrecto de `modify` dentro de `create`
- mantiene explícito el contexto `create/modify` en el mismo helper
- no agrega estado nuevo ni fuentes paralelas de verdad
- conserva el alcance acotado a un fix local de copy y wiring de contexto

### FIX-CREATE-AVAILABILITY-INQUIRY-POLICY-35

Estado: COMPLETADO  
Fecha: 2026-04-24  
Commit: 61a4327aac45ae468917f1d922c65e47413b9da1
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se explicita la separación entre `availability inquiry` y `reservation.create`
dentro de `messageHandler`, incorporando modo inquiry en
`runAvailabilityCheck`, persistencia no transaccional para inquiry y reflejo
documental de la policy en `message_pipeline.md`.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `lib/handlers/pipeline/availability.ts`
- `docs/architecture/message_pipeline.md`
- `test/unit/messageHandler.no_context_reservation_guards.spec.ts`
- `test/unit/messageHandler.routing_observability.spec.ts`
- `test/unit/messageHandler.availability_inquiry_policy.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: none`
- la regla quedó reflejada en `message_pipeline.md` como comportamiento
  estructural observable
- no requiere actualización de roadmap

Impacto:

- consolida la semántica operativa entre inquiry y `create`
- evita persistencia transaccional prematura para inquiry
- mantiene `messageHandler` como runtime vigente
- fortalece la separación explícita entre consulta de disponibilidad y creación
  de reserva

### FIX-AVAILABILITY-INQUIRY-CREATE-HANDOFF-36

Estado: COMPLETADO  
Fecha: 2026-04-27  
Commit: d840457080f257fe29d9ccb8e93bfad046caf96c
Clasificacion documental: SOLO_HITO

Descripcion:

Se ajusta el runtime de reservation en `messageHandler` para hacer handoff
desde `availability_inquiry` a `create` cuando hubo disponibilidad positiva
previa y el usuario expresa intención de avanzar, reutilizando slots existentes
y pidiendo el siguiente faltante real.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.availability_inquiry_policy.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- `commit_hash` resuelto por match único del `commit_name_sugerido`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica

Impacto:

- reutiliza `reservationSlots` y señales operativas ya canónicas
- evita duplicar estado para la transición inquiry -> `create`
- mantiene la lógica dentro de `messageHandler`
- conserva el alcance acotado a un ajuste puntual del flujo existente

### FIX-AVAILABILITY-HANDOFF-STRICT-AFFIRMATION-37

Estado: COMPLETADO  
Fecha: 2026-04-27  
Commit: 299929677943b21e4124888bef7fe1eb7573f266
Clasificacion documental: SOLO_HITO

Descripcion:

Se endurece el handoff desde `availability_inquiry` hacia `create` dentro de
`messageHandler` para aceptar solo intención explícita de reserva, agregando
una aclaración para respuestas ambiguas y cobertura unitaria de casos positivos
y negativos del handoff.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.availability_inquiry_policy.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- corrige la regresión puntual introducida por el hito 36

Impacto:

- evita disparar `inquiry -> create` por afirmativos débiles
- vuelve a exigir intención explícita de reserva
- mantiene la transición dentro del mismo runtime y del mismo estado canónico
- no crea subestados ni fuentes paralelas de verdad

### FIX-CREATE-RELATIVE-WEEKEND-RANGE-PARSING-38

Estado: COMPLETADO  
Fecha: 2026-04-28  
Commit: 0506d8ccdee2c24e19349926b3877f571b9791f2
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se corrige el parsing de rangos relativos de fin de semana en `create`
explícito, absorbiendo expresiones como `del sábado al domingo` y
`este finde` en primer turno, y preservando el caso single-date como
`checkIn` contextual sin generar rangos inválidos.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `lib/agents/helpers.ts`
- `test/unit/messageHandler.slot_ingestion.spec.ts`
- `test/unit/messageHandler.create_quote_gating.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: no_explicit_roadmap_change`
- no requiere actualización de roadmap ni documentación arquitectónica
- mantiene coherencia con el runtime actual en `messageHandler`

Impacto:

- `create` explícito absorbe rangos relativos de fin de semana en primer turno
- `quiero reservar el sábado` queda como single-date contextual y repregunta
  `checkOut`
- evita interpretar fechas únicas como rangos paralelos inválidos
- fortalece la unicidad de la representación temporal dentro de `messageHandler`

### FIX-CONFIRMATION-PENDING-PROPOSAL-CORRECTIONS-39

Estado: COMPLETADO  
Fecha: 2026-04-29  
Commit: 7761478f0a9574d2a99e291702a27ea3498ac8d4
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se introduce gobernanza explícita sobre la proposal pendiente previa a
confirmación dentro de `messageHandler`, endureciendo la confirmación,
cortando loops con negación y forzando recotización coherente cuando el
usuario corrige fechas o huéspedes sin contaminar slots ajenos.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reservation_confirm_followup.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de Guardian validada como fuente primaria
- `roadmap_impact: no_explicit_roadmap_change`
- el comportamiento encaja en el estado `quoted` ya documentado en
  `message_pipeline.md`
- conviene documentar la gobernanza explícita del tramo `quote -> confirm`
  como hito documental separado, pero no bloquea este cierre

Impacto:

- la proposal activa solo confirma con `CONFIRMAR` limpio
- afirmativos débiles o confirmaciones ambiguas ya no emiten reserva
- una negación explícita pausa la proposal y rompe el loop de confirmación
- correcciones válidas invalidan la proposal previa y fuerzan recomputación
  coherente sin contaminar `guestName` u otros slots no corregidos

### FIX-PENDING-PROPOSAL-CONFIRMATION-WITH-TEMPORAL-MODIFIER-40

Estado: COMPLETADO  
Fecha: 2026-04-30  
Commit: 1c021baad49231a1725dd6d3f101617bd2b71531
Clasificacion documental: SOLO_HITO

Descripcion:

Se endurece la gobernanza de confirmación de proposals activas para evitar que
mensajes ambiguos con modificador temporal como `confirmar mañana` disparen una
confirmación inválida o entren por error al flujo de fechas, extrayendo además
un helper reutilizable para el contexto de proposal pendiente.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reservation_confirm_followup.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada reconstruida desde el commit real y su diff
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- mantiene la lógica de gobernanza dentro de `messageHandler`

Impacto:

- evita confirmar proposals activas ante `confirmar` con modificador temporal
- refuerza una única semántica de confirmación para proposals pendientes
- evita desvíos erróneos hacia parsing temporal durante el tramo de confirmación
- preserva el alcance acotado a un fix local con cobertura unitaria y e2e

### DOC-HITO-DISCIPLINA-PLANTILLAS-Y-APERTURA-CHAT-41

Estado: COMPLETADO  
Fecha: 2026-04-30  
Commit: fd36f7334de724d60936690c2fd70b0965f72b59
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se formaliza la disciplina documental y de apertura de chats mediante una
regla explícita de orquestación low-token en la cápsula operativa, una guía
de continuidad entre chats y la creación de `HITO_TEMPLATE_V1` como plantilla
obligatoria para definición de hitos por parte de AGPT.

Archivos afectados:

- `docs/CAPSULE_TEMPLATE_V3.md`
- `docs/abrir_chat_nuevo.md`
- `docs/development/hito_template.md`

Validacion:

- commit y push verificados sobre `origin/main`
- evidencia reconstruida desde commit real y diff documental
- `roadmap_impact: none`
- no requiere actualización de roadmap
- introduce disciplina reusable sin modificar runtime ni código de producto

Impacto:

- explicita que AGPT debe transportar estado operativo mínimo y no reasoning
- normaliza el flujo `chat viejo -> cápsula -> chat nuevo`
- vuelve obligatorio `HITO_TEMPLATE_V1` para nuevos hitos
- fortalece la trazabilidad y reduce ambigüedad operativa entre agentes

### DOC-PRESENTATION-NARRATIVE-BASE-42

Estado: COMPLETADO  
Fecha: 2026-04-30  
Commit: d2387d2928af4c4b49e728e2573572d98fb4000f
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se crea la narrativa base draft para futuras piezas no técnicas de Begasist,
separando posicionamiento, claims seguros, claims prudentes, claims prohibidos
y guardrails de uso comercial, sin tocar runtime ni arquitectura operativa.

Archivos afectados:

- `docs/product/presentation_narrative_base.md`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- mantiene explícitamente el naming como no cerrado

Impacto:

- concentra la narrativa comercial base en un único documento draft
- evita claims paralelos o inconsistentes entre deck, one-pager y demo
- explicita guardrails de uso comercial y claims prohibidos
- fortalece la gobernanza documental sin alterar runtime ni arquitectura

### DOC-PRESENTATION-CAPABILITY-MAP-43

Estado: COMPLETADO  
Fecha: 2026-04-30  
Commit: 66724edc737f73f0b69b2c8832b3ce8cf2b1acc0
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se crea un mapa draft de capacidades reales y presentables de Begasist para
materiales no técnicos, separando capacidades por estado documental y
operativo, wording comercial seguro, claims pendientes y límites explícitos,
sin tocar runtime ni código.

Archivos afectados:

- `docs/product/presentation_capability_map.md`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- mantiene abierto el naming comercial

Impacto:

- centraliza la traducción comercial de capacidades reales en un único draft
- evita claims paralelos, inflados o inconsistentes
- separa explícitamente qué puede presentarse, qué requiere validación y qué
  no debe prometerse
- fortalece la gobernanza documental comercial sin alterar runtime ni código

### FIX-GUEST-RESERVATION-HOLDER-FALLBACK-GOVERNANCE-44

Estado: COMPLETADO  
Fecha: 2026-05-01  
Commit: 63d804ebddc2deaa9bf280467f2163e5ff5e1594
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se corrige la gobernanza de identidad en replies y fallbacks de reservas para
que el titular canónico de una reserva confirmada con `reservationId`
prevalezca sobre `reservationSlots.guestName`, y se elimina el vocativo
nominal en proposals de availability para expresar correctamente `para
<titular>` o `reserva a nombre de <titular>`.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `lib/handlers/pipeline/availability.ts`
- `test/availability.unified.flow.spec.ts`
- `test/integration/recotizacion.planner_only.test.ts`
- `test/unit/messageHandler.create_execution_integrity.spec.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`
- `test/unit/messageHandler.slot_ingestion.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- consolida una regla explícita de dominio sobre identidad de titular

Impacto:

- elimina el fallback incorrecto desde `reservationSlots` para reservas
  confirmadas
- refuerza el uso del registro canónico por `reservationId`
- separa interlocutor conversacional de titular de reserva en replies y
  proposals
- evita una fuente paralela de identidad sin mover lógica fuera del runtime

### FIX-CREATE-RELATIVE-RANGE-ANOTHER-RESERVATION-45

Estado: COMPLETADO  
Fecha: 2026-05-01  
Commit: 1be8a6279c6c18734c59cba3521c8f61c1374839
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se corrige la detección e ingestión de rangos relativos tipo
`sábado/sabado al domingo próximo/proximo` en `create`, incluyendo el contexto
de `otra reserva`, evitando repreguntar fechas cuando `checkIn` y `checkOut`
ya fueron absorbidos y sin mezclar la deuda UX separada de confirmación de
nuevas fechas.

Archivos afectados:

- `lib/agents/helpers.ts`
- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.slot_ingestion.spec.ts`
- `test/unit/messageHandler.multi_reservation.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- preserva `messageHandler` como runtime vigente

Impacto:

- extiende los parsers existentes de fechas relativas sin introducir lógica
  paralela
- evita perder slots ya ingeridos en el branch de `otra reserva`
- deja de repreguntar fechas cuando el rango ya fue absorbido
- mantiene fuera de scope la deuda UX separada de confirmación de nuevas fechas

### FIX-CREATE-AVAILABILITY-SEQUENCING-UX-46

Estado: COMPLETADO  
Fecha: 2026-05-04  
Commit: 9ae3467831f82a287ff07012efc134df1ba706c4
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se corrige el sequencing y la UX entre `create` y `availability inquiry` para
que un `create` explícito completo cotice directamente sin pasar por el turno
intermedio `Anoté nuevas fechas...`, mantenga el pedido de faltantes reales en
`create` incompleto y preserve la frontera donde `availability inquiry` puro
no abre `create` ni pide `guestName`.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/helpers.extractSlotsFromText.spec.ts`
- `test/unit/messageHandler.availability_inquiry_policy.spec.ts`
- `test/unit/messageHandler.create_execution_integrity.spec.ts`
- `test/unit/messageHandler.create_quote_gating.spec.ts`
- `test/unit/messageHandler.multi_reservation.spec.ts`
- `test/unit/messageHandler.slot_ingestion.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- refuerza la frontera operativa entre `availability inquiry` y `create`

Impacto:

- elimina el sequencing intermedio `Anoté nuevas fechas...` del camino correcto
- hace que `create` explícito completo cotice directamente
- mantiene el pedido de faltantes reales cuando `create` está incompleto
- preserva que `availability inquiry` puro no abra `create` ni pida
  `guestName`

### FIX-CREATE-RELATIVE-WEEKDAY-RANGE-GENERALIZATION-47

Estado: COMPLETADO  
Fecha: 2026-05-04  
Commit: 2e0253963756a1e5d4c0d6b2ac3b10c65824f0d3
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se generaliza la detección de rangos relativos consecutivos de weekdays en
`create` para expresiones como `domingo al lunes próximo` y `martes hasta el
miércoles próximo`, incluyendo variantes con conectores `al`, `a`, `y`,
`and`, `hasta`, `hasta el` y `hasta la`, manteniendo alineados
`extractSlotsFromText` y el extractor relativo de `messageHandler` sin mezclar
sequencing ni `availability inquiry`.

Archivos afectados:

- `lib/agents/helpers.ts`
- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.create_quote_gating.spec.ts`
- `test/unit/messageHandler.multi_reservation.spec.ts`
- `test/unit/messageHandler.slot_ingestion.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- preserva `messageHandler` como runtime vigente

Impacto:

- extiende extractores existentes en lugar de crear parsers paralelos
- amplía la capacidad real de `create` sobre lenguaje natural relativo
- mantiene una única vía coherente para resolver rangos relativos consecutivos
  de weekdays
- deja fuera de scope cambios de sequencing o `availability inquiry`

### IMPLEMENT-CONVERSATIONAL-DISPLAY-NAME-READPATH-GOVERNANCE-49

Estado: COMPLETADO  
Fecha: 2026-05-04  
Commit: e4a8ae84b4cee416b1b4089b21b427884552f1a2
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se introduce un read-path seguro de `conversationalDisplayName` desde el guest
canónico para usar vocativo conversacional solo cuando exista identidad guest
confiable, manteniendo `reservationHolderName` como dato transaccional de
reserva y evitando reutilizar `guestName` de reserva como interlocutor.

Archivos afectados:

- `lib/utils/conversationalDisplayName.ts`
- `lib/handlers/pipeline/availability.ts`
- `test/availability.unified.flow.spec.ts`
- `test/unit/messageHandler.create_execution_integrity.spec.ts`
- `test/unit/messageHandler.multi_reservation.spec.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`
- `test/unit/messageHandler.reservation_confirm_followup.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- mantiene `reservationHolderName` dentro del dominio transaccional de reserva

Impacto:

- toma el nombre conversacional solo desde guest canónico
- evita persistir identidad conversacional en `conv_state`
- preserva `reservationHolderName` como dato transaccional separado
- bloquea que `guestName` de reserva vuelva a funcionar como vocativo

### FIX-ADMIN-GUESTS-CONVERSATION-LOAD-50

Estado: COMPLETADO  
Fecha: 2026-05-05  
Commit: 720856d226bc3bb252a427617cc225b02a259c11
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se restaura el read-path Admin/API de guests y conversaciones para que
`/api/admin/guests` responda sin `pending` indefinido, degrade a `200` ante
fuentes lentas o fallidas, reconstruya filas mínimas desde `conversations`
cuando la colección `guests` esté vacía y permita cargar
conversaciones/perfil desde la perspectiva del guest canónico usando `guestId`
y aliases de solo lectura.

Archivos afectados:

- `app/api/admin/guests/route.ts`
- `app/api/admin/conversations/route.ts`
- `app/api/admin/guest-profile/route.ts`
- `lib/db/conversations.ts`
- `lib/utils/guestReadAliases.ts`
- `test/integration/api_admin_guests_list.test.ts`
- `test/integration/api_admin_conversations.test.ts`
- `test/integration/api_admin_guest_profile.test.ts`
- `test/mocks/db_conversations.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- mantiene el runtime conversacional intacto y el read-path en modo derivado

Impacto:

- evita depender de una sola fuente frágil para el listado Admin de guests
- degrada defensivamente a `200` ante fuentes lentas o fallidas
- reconstruye lectura mínima desde `conversations` cuando `guests` está vacío
- permite cargar conversaciones y perfil desde perspectiva canónica sin crear
  write-path nuevo ni guest graph completo

### FIX-ADMIN-GUESTS-CONSOLIDATION-ACTIONS-51

Estado: COMPLETADO  
Fecha: 2026-05-05  
Commit: 6e497edda46799467cfa64b8eccdf3f72690054d
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se corrige la acción real de consolidación de huéspedes en Admin para tolerar
merges donde el guest primario o secundario provienen de filas derivadas desde
`conversations` y todavía no existen en `guests`, creando registros mínimos
antes de consolidar y preservando la migración de aliases, conversaciones y
mensajes hacia el guest canónico.

Archivos afectados:

- `lib/db/guestMerge.ts`
- `test/integration/api_admin_guests_merge.test.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- mantiene una única consolidación canónica sobre `guestId` primario

Impacto:

- tolera merges sobre filas derivadas que aún no existen en `guests`
- crea documentos mínimos antes de consolidar sin expandir el modelo global
- preserva aliases absorbidos y la migración de conversaciones y mensajes
- evita fallos por ausencia de documentos base en la acción real de merge

### FIX-ADMIN-GUESTS-PROFILE-NAME-READPATH-52

Estado: COMPLETADO  
Fecha: 2026-05-05  
Commit: 38779d323d332bb2ef33892f5d82cc5208b0fc9f
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se corrige el read-path de `/admin/guests` y guest profile para priorizar el
documento canónico más completo del guest cuando existen filas mínimas o
duplicadas con el mismo `guestId`, mostrando correctamente `name`, `mode`,
`aliases` e indicadores derivados sin alterar el runtime conversacional ni el
modelo global.

Archivos afectados:

- `app/admin/guests/page.tsx`
- `app/api/admin/guest-profile/route.ts`
- `app/api/admin/guests/route.ts`
- `lib/db/guests.ts`
- `test/integration/api_admin_guest_profile.test.ts`
- `test/integration/api_admin_guests_list.test.ts`
- `test/integration/api_admin_guests_merge.test.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- preserva el fallback defensivo existente del read-path Admin

Impacto:

- prioriza explícitamente el documento más completo por `guestId`
- evita pérdida visual de identidad canónica por filas mínimas derivadas
- conserva `mode`, `aliases` e indicadores derivados correctos en UI y backend
- no introduce edición ni write-path nuevo en Admin/profile

### FIX-RUNTIME-CONVERSATIONAL-DISPLAY-NAME-PROPOSAL-PATHS-53

Estado: COMPLETADO  
Fecha: 2026-05-06  
Commit: d6c2bd23bec3f3f27de38eec5bc60eebf48e557f
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se asegura que `conversationalDisplayName` leído desde el guest canónico se
aplique en proposal paths seguros de disponibilidad y `create`, incluyendo
`create` incremental, `create` completo y multi-reserva completa, manteniendo
tono neutro cuando no existe guest conocido y preservando
`reservationHolderName` solo como dato transaccional. Incluye además un fix
mínimo de tipado en Admin/guests para normalizar `GuestMode` sin alterar
comportamiento de dominio.

Archivos afectados:

- `app/api/admin/guests/route.ts`
- `lib/db/guests.ts`
- `lib/handlers/messageHandler.ts`
- `test/availability.unified.flow.spec.ts`
- `test/unit/messageHandler.create_execution_integrity.spec.ts`
- `test/unit/messageHandler.multi_reservation.spec.ts`
- `test/unit/messageHandler.reservation_confirm_followup.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- mantiene `reservationHolderName` como dato transaccional separado

Impacto:

- aplica el vocativo conversacional solo desde guest canónico en proposal paths
  seguros
- mantiene tono neutro cuando no existe guest conocido
- evita reutilizar `reservationHolderName` como interlocutor
- absorbe un ajuste mínimo de tipado `GuestMode` sin expandir el alcance

### FIX-AVAILABILITY-INQUIRY-AFTER-RESERVATION-CONTEXT-54

Estado: COMPLETADO  
Fecha: 2026-05-06  
Commit: c18e9e43862c6ad9a5b14538bacbdbe9428bc8a1
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se corrige la precedencia contextual para que una consulta pura de
disponibilidad después de una reserva activa o confirmada siga el flujo de
`availability inquiry` y no sea tratada como modificación, recotización ni
cambio de fechas de la reserva previa, preservando los paths explícitos de
`modify` y `create`.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.availability_inquiry_policy.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- preserva los paths explícitos de `modify` y `create`

Impacto:

- refuerza una única semántica para `availability inquiry` puro con contexto de
  reserva confirmada
- evita desvíos a `modify` o `date-flow` cuando la intención es solo consultar
  disponibilidad
- mantiene intacta la frontera entre inquiry, modify y create
- deja fuera de scope la deuda de wording posterior

### FIX-RUNTIME-GUEST-RESERVATION-SNAPSHOT-AFTER-MERGE-55

Estado: COMPLETADO  
Fecha: 2026-05-06  
Commit: 72e9d2ae9a4589208dc6e69f6826257b7954e0fb
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se corrige el runtime para que consultas de snapshot/listado como
`mostrame mis reservas` puedan resolver reservas asociadas al guest canónico
consolidado después de un merge en Admin cuando la conversación actual no
tiene `reservationHistory` o `lastReservation`, preservando prioridad del
snapshot local y usando fallback de solo lectura sobre conversaciones
asociadas al guest consolidado.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.reference_resolution.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- preserva prioridad del snapshot local y `reservationHolderName` como dato
  transaccional

Impacto:

- agrega fallback de lectura por guest canónico solo cuando corresponde
- deduplica por `reservationId` al reconstruir snapshots post-merge
- permite resolver reservas consolidadas sin depender solo de la conversación
  actual
- no usa titulares de reserva como interlocutores ni altera el runtime
  conversacional

### FEAT-RUNTIME-GUEST-NAME-CAPTURE-ON-GREETING-56

Estado: COMPLETADO  
Fecha: 2026-05-07  
Commit: 57bf0f245272a8adb6ff1b1055a20a4b62069b9f
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se implementa una captura conversacional mínima de `guest.name` en el saludo
inicial de un guest nuevo, persistiendo el nombre sobre el guest canónico
resuelto, usando `hotelConfig.hotelName` cuando está disponible y manteniendo
fallback seguro. Además asegura que el `create` explícito completo post-
handshake siga el path correcto de proposal sin caer en
`verify/snapshot/fallback`.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.guest_name_capture.spec.ts`
- `test/unit/messageHandler.stable_intents_guard.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- preserva `messageHandler` como runtime único

Impacto:

- captura `guest.name` solo en un handshake inicial controlado
- persiste el nombre sobre el guest canónico sin contaminar titulares de reserva
- usa `hotelConfig.hotelName` cuando está disponible y mantiene fallback seguro
- conserva el path correcto de proposal para `create` explícito completo

### FIX-AVAILABILITY-INQUIRY-TYPO-TOLERANCE-57

Estado: COMPLETADO  
Fecha: 2026-05-07  
Commit: a8a0c044db91e81d73ec27cea2dd365f11947a2f
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se agrega tolerancia mínima y explícita a typos frecuentes de disponibilidad
en `availability inquiry`, corrigiendo variantes puntuales como
`diponible`, `disponiblidad` y `disponivilidad` para que sigan el flujo de
consulta de disponibilidad sin abrir `create` ni pedir
`reservationHolderName` cuando el usuario solo consulta.

Archivos afectados:

- `lib/handlers/messageHandler.ts`
- `lib/handlers/pipeline/intent.ts`
- `test/unit/messageHandler.availability_inquiry_policy.spec.ts`
- `test/unit/messageHandler.guest_name_capture.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- mantiene una sola semántica de `availability inquiry`

Impacto:

- tolera errores razonables del usuario en consultas de disponibilidad
- evita que typos mínimos degraden a `create`
- alinea `messageHandler` con `pipeline/intent` sin fuzzy matching global
- mantiene explícito y acotado el conjunto de variantes toleradas

### FEAT-HOTEL-ASSISTANT-BRANDING-CONFIG-58

Estado: COMPLETADO  
Fecha: 2026-05-07  
Commit: a55fc61ea67dc132e407998716815655312a35a7
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se agrega configuración básica y opcional de branding textual del asistente
por hotel mediante `assistantBranding`, permitiendo definir `displayName` y
`roleLabel` con fallback seguro a `BegaIA` y `el asistente hotelero digital`,
usando `hotelName` cuando está disponible y preservando la separación entre
identidad del asistente, guest conversacional y titular transaccional de
reserva.

Archivos afectados:

- `types/channel.ts`
- `lib/config/hotelConfig.server.ts`
- `lib/handlers/messageHandler.ts`
- `test/unit/messageHandler.guest_name_capture.spec.ts`
- `scripts/set-assistant-branding.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- centraliza la identidad textual del asistente en `hotelConfig`

Impacto:

- permite branding textual básico por hotel con configuración opcional
- reduce hardcodes en runtime con fallback seguro a `BegaIA`
- usa `hotelName` cuando está disponible para contextualizar la identidad
- preserva la separación entre asistente, guest conversacional y titular de
  reserva

### FEAT-ADMIN-ASSISTANT-BRANDING-UI-59

Estado: COMPLETADO  
Fecha: 2026-05-08  
Commit: e7bc0c32a7f0466254c8ddbe6e25e00a33cebeb1
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se agrega mantenimiento operativo desde la UI canónica de edición de hotel
para `assistantBranding`, con validación centralizada, preview compartido con
runtime, guardado seguro vía `POST /api/hotels/update`, rechazo de valores
inválidos, y limpieza a fallback mediante `assistantBranding null` sin abrir
theme visual ni branding avanzado.

Archivos afectados:

- `lib/config/assistantBranding.ts`
- `app/api/hotels/update/route.ts`
- `components/admin/EditHotelForm.tsx`
- `lib/handlers/messageHandler.ts`
- `test/unit/hotels.update.assistant_branding.route.spec.ts`
- `test/frontend/editHotelForm.assistantBranding.spec.tsx`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- centraliza validación y preview en helper compartido

Impacto:

- habilita mantenimiento operativo de branding textual desde la UI Admin
- valida y rechaza valores inválidos de forma consistente entre UI y API
- permite limpiar branding a fallback seguro mediante `assistantBranding null`
- preserva separación entre runtime, branding textual y capa Admin/UI

### FEAT-ASSISTANT-BRANDING-ACKNOWLEDGEMENT-COPY-60

Estado: COMPLETADO  
Fecha: 2026-05-08  
Commit: 249ca2ca2f36f11915645f8baa5486bdc2e171cc
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se extiende `assistantBranding` con `acknowledgementLabel` como campo
controlado de copy para confirmar cómo el asistente llamará al huésped
después del saludo inicial, usando una lista cerrada de opciones, fallback
seguro a `Encantado` y una regla canónica de limpieza total que elimina
`assistantBranding` completo cuando `displayName` y `roleLabel` quedan
vacíos.

Archivos afectados:

- `types/channel.ts`
- `lib/config/hotelConfig.server.ts`
- `lib/config/assistantBranding.ts`
- `lib/handlers/messageHandler.ts`
- `components/admin/EditHotelForm.tsx`
- `test/unit/hotels.update.assistant_branding.route.spec.ts`
- `test/frontend/editHotelForm.assistantBranding.spec.tsx`
- `test/unit/messageHandler.guest_name_capture.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- runtime, API y Admin comparten helper y contrato de branding

Impacto:

- agrega `acknowledgementLabel` como copy configurable con lista cerrada
- mantiene fallback seguro a `Encantado`
- aplica una limpieza canónica que elimina `assistantBranding` completo al
  vaciar `displayName` y `roleLabel`
- evita inferencia gramatical frágil y mezcla con `guest.name` o
  `reservationHolderName`

### DOC-DEMO-PRESENTATION-RESYNC-BEGAIA-61

Estado: COMPLETADO  
Fecha: 2026-05-08  
Commit: fda64cc150c3432b58d0ac982e4b2a16b0bd44f4
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se resincronizan los documentos existentes de presentación/demo para usar
`BegaIA` como branding externo, mantener `Begasist` como nombre
interno/histórico y actualizar la narrativa y el mapa de capacidades con el
estado real validado hasta `FEAT-ASSISTANT-BRANDING-ACKNOWLEDGEMENT-COPY-60`,
usando la línea reciente `51–60` como contexto prudente de demo sin inflar
claims productivos.

Archivos afectados:

- `docs/product/presentation_narrative_base.md`
- `docs/product/presentation_capability_map.md`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- mantiene alineados narrativa comercial y capability map con el estado real

Impacto:

- centraliza `BegaIA` como naming externo en materiales de demo
- preserva `Begasist` como referencia interna e histórica
- actualiza claims seguros según el estado real validado hasta el hito 60
- evita abrir documentos paralelos o prometer capacidades no validadas

### DOC-PRESENTATION-USE-CASES-DEMO-SELECTION-BEGAIA-62

Estado: COMPLETADO  
Fecha: 2026-05-08  
Commit: e90402f18ac12bf376f42d4082e0f917ffb15e69
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se crea el documento fuente draft para selección de casos de uso y recorridos
de demo no técnica de `BegaIA`, alineando branding externo, referencia interna
a `Begasist`, secuencias de demo prudentes, claims seguros y límites
comerciales explícitos sin tocar runtime ni código.

Archivos afectados:

- `docs/product/presentation_use_cases_demo_selection.md`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- completa la base documental junto con narrativa y capability map

Impacto:

- centraliza la selección de demos en un único documento draft
- alinea branding externo `BegaIA` con referencia interna `Begasist`
- formula recorridos y claims de demo con prudencia explícita
- evita claims paralelos o inflados sobre PMS, CRM, pricing o comprensión libre

### DOC-ARCHITECTURE-CONCIERGE-BEGAIA-63

Estado: COMPLETADO  
Fecha: 2026-05-11  
Commit: 172e516f0f3e0a562c8137561fa7520ac7014234
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se actualiza la arquitectura conceptual de producto para reforzar el paso
desde concierge hotelero tradicional hacia concierge digital y presentar a
`BegaIA` como materialización del modelo, manteniendo `Begasist` como
referencia interna/histórica y explicitando límites comerciales prudentes
sobre PMS, pricing real, automatización total, reemplazo de recepción y CRM
completo.

Archivos afectados:

- `docs/product/architecture_concierge.md`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- mantiene consistente el framing conceptual con branding y límites reales

Impacto:

- clarifica la secuencia concierge tradicional -> concierge digital -> `BegaIA`
- preserva `Begasist` como naming interno e histórico
- mantiene la multicanalidad como orientación conceptual y no como promesa
  cerrada
- evita claims inflados sobre canales, PMS, pricing o automatización total

### DOC-DEMO-MULTICHANNEL-PARITY-VALIDATION-BEGAIA-64

Estado: COMPLETADO  
Fecha: 2026-05-11  
Commit: df2a3780146104f7972498f674428289e22c92b9
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se crea el documento draft versionable de validación multicanal de demo para
`BegaIA`, dejando evidencia prudente por canal sobre convergencia al runtime
vigente y distinguiendo soporte documentado de validación efectiva, con
resultado `Web aligned`, `Email aligned` y `WhatsApp partial` sin cerrar
paridad total.

Archivos afectados:

- `docs/product/presentation_multichannel_parity_validation.md`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- versiona una validación prudente sin inflar claims multicanal

Impacto:

- centraliza el estado real de validación por canal en un solo artefacto
- distingue soporte documentado de validación efectiva
- deja explícita la brecha `WhatsApp partial` como deuda separada
- evita declarar paridad multicanal completa como claim comercial

### FIX-WHATSAPP-CHANNELMESSAGE-IDENTITY-PARITY-65

Estado: COMPLETADO  
Fecha: 2026-05-11  
Commit: 42cc3b69c4e75dbe21bc4d1945654cdce5a125c4
Clasificacion documental: HITO_PLUS_EVOLUTION

Descripcion:

Se corrige la paridad mínima de identidad en el canal WhatsApp para que el
`UniversalEvent` y el `ChannelMessage` preserven `guestId` además de
`conversationId` y `sourceMsgId` al converger al runtime vigente, sin
rediseñar el canal ni duplicar lógica de dominio.

Archivos afectados:

- `types/events.ts`
- `lib/services/whatsapp.ts`
- `lib/handlers/universalChannelEventHandler.ts`
- `test/unit/universalChannelEventHandler.whatsapp_identity.spec.ts`

Validacion:

- commit y push verificados sobre `origin/main`
- salida estructurada de HDOC validada como fuente primaria
- `roadmap_impact: none`
- no requiere actualización de roadmap ni documentación arquitectónica
- fija una mejora real pero deja deuda residual explícita de canonicidad

Impacto:

- preserva `guestId` en la convergencia WhatsApp hacia el runtime
- mejora la paridad mínima con Web y Email sin duplicar lógica de dominio
- evita perder identidad resuelta aguas arriba en `ChannelMessage`
- deja riesgo residual por el fallback `guestId || senderJid`
