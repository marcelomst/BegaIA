<!-- Path: docs/development/TASK.md -->

DOCUMENT_TYPE: OPERATIONAL_TRACKER

# BEGAIA — TASK

Versión: 0.9
Fecha de actualización: 2026-11-25
Responsable de planificación: AGPT
Responsable de control y operaciones Git: AH / operador conforme al Operating Model
Frente prioritario: Estabilización funcional de la Demo multicanal existente
Estado: Documento auxiliar de continuidad y coordinación.
Autoridad documental: subordinada a `docs/architecture/system_operating_model.md`; no sustituye ni modifica fuentes canónicas.
Sesión: ACTIVE — diagnóstico de regresiones funcionales pendiente; Frozen y aislamiento pausados

Regla de continuidad: este TASK dirige la conversación y conserva decisiones, pero no sustituye la comprobación de GitHub, el estado local ni el System Operating Model. No autoriza por sí solo implementación, configuración externa, commit, push o despliegues.

Regla de actualización versionable: toda modificación de este archivo se rige por el Operating Model, requiere un hito autorizado y no habilita por sí misma implementación, Git write ni despliegues.

## 1. Objetivo principal y decisión vigente

`PRIORITY: FUNCTIONAL_DEMO_STABILIZATION`

Objetivo P0: restablecer y verificar los comportamientos funcionales de BegaIA
necesarios para una presentación comercial multicanal confiable.

Contexto operacional informado por Marcelo:

- La Demo existente ha sido utilizada en presentaciones.
- Web, Email y WhatsApp pudieron conectarse y utilizarse.
- Se observaron regresiones en comportamientos previamente resueltos.
- Todavía no existe un inventario reproducible ni un diagnóstico confirmado de
  esas regresiones.
- La conectividad de los canales no acredita que todos los recorridos
  funcionales estén estables.

No se consideran resueltas las regresiones ni se les atribuye una causa hasta
obtener evidencia reproducible. Por decisión de AGPT del 2026-11-25, el
desarrollo de Demo Frozen y del aislamiento de entornos queda temporalmente en
pausa mientras se diagnostica y estabiliza la Demo multicanal existente.

## 2. Fuentes de verdad y baseline

- Repositorio canónico: `marcelomst/BegaIA`, rama `main`.
- HEAD de `main` verificado local y remotamente el 2026-11-25 para esta
  actualización: `9ecb0740e3d4e659ff935804f4b12b538fb259af`.
- Commit técnico del contrato Docker Frozen:
  `bdcc555ecef56bfac12e371f952ac6146659fb2d`.
- Commit técnico del contrato Astra sintético:
  `1cacceac24730f690adcc2ae396f851da28df1ea`.
- Commit documental actual de `main`:
  `9ecb0740e3d4e659ff935804f4b12b538fb259af`. HDOC informó `CLOSED` para el
  último hito; ese cierre documental no convierte un artefacto técnico en una
  validación operacional.
- Commit documental del hito Email allowlist: `fdca37b43ad28c34800402dc3a706dc61977e9b8`; HDOC reportó `STATUS: CLOSED` y push confirmado.
- Commit técnico asociado: `8663e8f3d0889137b1500782bab34daba78172e0`.
- Documentos prioritarios: `README.md`, `docs/architecture/system_operating_model.md`, `docs/architecture/roadmap.md`, `docs/architecture/message_pipeline.md`, `hito_mcp_recent.md`, `hito_mcp.md` y ADRs relacionados con despliegue/canales.
- Configuración efectiva local, contenedores, secretos, proveedores, datos y agentes: verificar directamente en el entorno correspondiente; GitHub no la prueba.
- Archivos adjuntos a Hotel Assistant: auxiliares; pueden estar desactualizados. No requieren sincronización manual periódica.
- TASK: este tracker auxiliar no acredita por sí mismo integración, commit,
  push, publicación ni estado operacional; esos estados deben verificarse en
  Git y en el entorno correspondiente.
- Al abrir una nueva sesión o invocar este documento: reverificar HEAD remoto, README, Operating Model, hitos recientes y estado local antes de proponer hito o atribuir vigencia a los estados aquí registrados.

## 3. Estado operacional demostrado — Email (2026-11-24)

Capacidad funcional demostrada, NO equivalente a Demo congelada.
La evidencia de conectividad aquí conservada no prueba estabilidad actual de
todos los recorridos funcionales ni sustituye el diagnóstico de regresiones.

- Hotel de prueba: `hotel999`.
- Cuenta de hotel: `begamshop.ventas@gmail.com`.
- Remitente/destinatario de prueba autorizado: `marcelomst1@gmail.com`.
- IMAP y SMTP con credencial externa vía `secretRef=demo-hotel999-main` y `source=env`: comprobados en pruebas reales.
- Hito `SEC-EMAIL-WORKER-SMTP-RECIPIENT-ALLOWLIST-01`: el tracker conserva el cierre reportado por HDOC y la publicación posterior; el registro técnico canónico acredita 21 pruebas focalizadas PASS, pero no acredita conexiones o envíos SMTP reales. La prueba SMTP real consignada aquí corresponde a evidencia operacional posterior informada por AGPT.
- Worker once: prueba `BEGAIA-EMAIL-E2E-02` respondió consulta sobre estacionamiento; entrega Gmail confirmada.
- Worker Docker continuo `begasist-demo-email`, modo watch: prueba `BEGAIA-EMAIL-WATCH-01` de check-out recibió respuesta real («El check-out es hasta las 11:00.»).
- Observación operacional anterior aportada: contenedor `running | healthy | Restarts=0`, polling y heartbeat activos, Redis lock `email_bot_lock:hotel999` presente (`1`), bandeja sin pendientes. Esta evidencia histórica no se toma como estado actual.
- Variables efectivas comprobadas en contenedor: `EMAIL_SENDING_ENABLED=true`, `EMAIL_WORKER_ALLOWED_RECIPIENTS=marcelomst1@gmail.com`, `EMAIL_LEGACY_ALLOWED_SENDERS=marcelomst1@gmail.com`, `EMAIL_LEGACY_MAX_MESSAGES=1`, `EMAIL_LEGACY_SAFE_MODE=1`.
- La allowlist restringe destinatarios SMTP; el máximo de un mensaje es por lote, no un límite total para un worker continuo.
- Advertencia no bloqueante observada: `[conversation-trace]/Astra Unsupported update operation modifier: $push ... '$slice'`. No incorporar automáticamente su corrección al frente de aislamiento.
- No se acredita operación multihotel, despliegue productivo, aislamiento de Demo o estabilidad prolongada.
- El servicio actual se monta desde el workspace mediante `.:/app:cached` y reutiliza la imagen `begasist-suite:dev`. Por ello no es una versión congelada independiente. Cambios en `lib/` pueden afectar el proceso en ejecución/reiniciado mediante nodemon. Es un riesgo activo mientras se desarrolla.
- Nota de operación: mientras esté activo el worker watch con SMTP, mantener ambos filtros restringidos y no lanzar pruebas/deploys paralelos sobre la misma cuenta de correo sin control. Una acción de aislamiento deberá decidir expresamente el destino y la parada/migración de este servicio.

### Procedimiento comercial existente informado

Este procedimiento fue informado por Marcelo como práctica operacional; no es
un test automatizado ni acredita por sí mismo estabilidad funcional:

1. ejecutar `wipe-conversations-and-messages.ts` para limpiar el estado
   conversacional previo;
2. preparar una reserva mediante una conversación real por Email, siguiendo la
   chuleta comercial;
3. realizar la presentación mostrando Web, Email y WhatsApp.

La conversación por Email y su reserva deben permanecer visibles. El objetivo
comercial conserva la multicanalidad y la supervisión operativa. Antes de
reutilizar el wipe sobre un destino diferente deben verificarse su seguridad,
su alcance efectivo y el destino exacto. Este tracker no autoriza ejecutarlo.

### Observaciones operacionales pendientes

#### OBS-EMAIL-HEARTBEAT-WITHOUT-LOCK

- Prioridad: `P2 — diferible`.
- Estado: `PENDING_FIX_DESIGN`.
- Fecha de observación: 2026-11-24.

Evidencia observada:

- Contenedor `begasist-demo-email` `running/healthy`.
- Proceso Node del worker presente.
- Logs con polling previo y detención del runtime con `reason=polling_disabled_or_lock_lost`.
- Redis `email_polling:hotel999=true`.
- Lock `email_bot_lock:hotel999` ausente.
- Heartbeat `heartbeat:email-bot:hotel999` renovándose.
- No se detectó un segundo Email Worker local activo en los procesos y contenedores inspeccionados.

Mecanismo identificado:

- La ruta `POST /api/email/polling` invoca `enableEmailPolling()`.
- `enableEmailPolling()` puede iniciar `startChannelHeartbeat()` en el proceso Suite/Admin, independientemente del runtime que posee el lock del Email Worker.

Consecuencia: el heartbeat no acredita por sí solo que el worker esté procesando correos.

Pendiente:

- Determinar la causa original de detención del runtime.
- Diseñar semántica de heartbeat ligada al runtime efectivo.
- Diferenciar habilitación administrativa, propiedad del lock y salud operacional.
- Revisar el healthcheck del Email Worker.

Restricción: no se declara demostrada la causa original de detención ni la identidad del proceso concreto que renovó el heartbeat.

Dependencia: conservar como observación independiente P2. No está resuelta, pero
no se convierte automáticamente en bloqueo de cualquier prueba funcional de
Email; cada prueba debe controlar su alcance y evidencia efectiva.

## 4. Demo Frozen y aislamiento de entornos — pausa temporal

`FROZEN_WORKSTREAM: PAUSED_BY_AGPT`
`REASON: FUNCTIONAL_REGRESSIONS_TAKE_PRIORITY`

La arquitectura tripartita continúa como intención futura: Developer, Demo
Comercial Frozen y Experimental. Su desarrollo queda pausado, sin revertir
código, eliminar artefactos ni modificar los contratos publicados.

Evidencia preservada de `INFRA-DEMO-CODE-ISOLATION-01`:

- Contrato Docker Frozen versionado en el commit técnico publicado
  `bdcc555ecef56bfac12e371f952ac6146659fb2d`.
- Imagen local construida desde
  `0033cefa4b9764a3e6e23b4bad5b7e34aabe1d08`.
- Image ID observado:
  `sha256:8d2f5498ca613caef81fd3b5c02f8ef40177d4e3fc47250c2a77357478ddd2b9`.
- Arquitectura observada de la imagen: `amd64`.
- El arranque funcional de Frozen no fue acreditado.
- Compose Frozen no incluye actualmente Email Worker ni WhatsApp.

Evidencia preservada de `INFRA-DEMO-ASTRA-BASELINE-CONTRACT-01`:

- Contrato Astra sintético versionado en el commit técnico publicado
  `1cacceac24730f690adcc2ae396f851da28df1ea`.
- Manifest de 16 objetos.
- El adaptador real mantiene `apply` bloqueado.
- No se creó ni inicializó un keyspace Demo acreditado.
- No se demostró aislamiento real de datos.

`ENV-01` permanece como análisis completado. Para el trabajo futuro no se toma
todavía una decisión definitiva entre keyspace Astra separado, base Astra
independiente o infraestructura Astra compartida con separación lógica por
`hotelId`. Mantener `hotel999` en Developer y crear otro hotel para Demo es una
alternativa pendiente de análisis, no una decisión aprobada. No se exige una
segunda base Astra sin justificación y no se considera suficiente el
aislamiento lógico hasta verificar filtrado por `hotelId`, scripts destructivos
y enrutamiento multicanal.

## 5. Backlog prioritario — línea de trabajo vigente

| ID de seguimiento AGPT | Prioridad | Trabajo | Estado |
| --- | --- | --- | --- |
| DEMO-FUNCTIONAL | P0 | Diagnóstico y estabilización de regresiones funcionales de la Demo multicanal | `ACTIVE_PRIORITY` |
| DEMO-REGRESSION-INVENTORY | P0 | Inventario reproducible, priorización y definición del primer hito correctivo | `PENDING` |
| ENV-01 | Histórico | Auditoría diferencial Demo/Developer/Experimental | `ANALYSIS_COMPLETE` |
| ENV-02 | En pausa | Diseño de baseline, configuración, procesos, datos y rollback | `PAUSED_BY_AGPT` |
| ENV-03 | En pausa | Implementación y verificación del aislamiento de Demo | `PAUSED_BY_AGPT` |
| ENV-04 | En pausa | Corredor Experimental y sus protecciones | `PAUSED_BY_AGPT` |
| ENV-05 | En pausa | Promoción, smoke, rollback y reproducibilidad | `PAUSED_BY_AGPT` |
| ENV-06 | En pausa | Recorrido comercial sobre baseline Frozen | `PAUSED_BY_AGPT` |

Los IDs `ENV-01` a `ENV-06` siguen siendo auxiliares de planificación. ENV-01
conserva su análisis completado; la pausa de ENV-02 a ENV-06 no altera sus
alcances originales ni elimina los hitos técnicos y documentales publicados.
La prioridad inmediata es producir evidencia reproducible de las regresiones,
no inferir causas ni implementar correctivos antes de un hito autorizado.

## 6. Backlog funcional heredado de TASK v0.6 — conservado, NO revalidado

El documento aportado de fecha 2026-11-05 registraba la estabilización
funcional como prioridad inmediata. La decisión del 2026-11-25 retoma ese
frente, pero no convierte los estados históricos en hechos vigentes ni declara
resuelto ningún defecto. Cada observación de Cancel, Modify y los demás
recorridos debe cotejarse con `main`, contratos, hitos y pruebas actuales antes
de incorporarse al inventario reproducible.

| Seguimiento histórico | Estado en v0.6 (2026-11-05) | Tratamiento en esta línea |
| --- | --- | --- |
| DEMO-01 / OBS-M6-02 accionabilidad | `VERIFIED / HISTORICAL_CLOSURE_PENDING` | Reconciliar sólo si afecta la demo comercial seleccionada |
| DEMO-02 descarte frente a Cancel | `CLOSED_DOCUMENTED` | Preservar cierre histórico |
| DEMO-08 / OBS-M6-09 proyección post-Cancel | `CLOSED_CONFIRMED` | Preservar cierre histórico |
| DEMO-09 / OBS-M6-10 confirmación informada Cancel | `OPEN_CONFIRMED / FIX_DESIGN_READY` | No asumir estado actual; verificar contratos y decidir inclusión de Cancel en la Demo |
| DEMO-10 / OBS-M6-08 confirmación obsoleta | `PENDING_CHARACTERIZATION` | Diferir salvo impacto en caso elegido |
| DEMO-03 recaptura Modify M2 | `QUEUED` | Diferir salvo impacto en caso elegido |
| DEMO-04 divergencia Modify | `QUEUED` | Diferir salvo impacto en caso elegido |
| DEMO-05 dry-run integral | `QUEUED` | Programar para baseline final, no como cadena funcional indefinida |
| DEMO-06 listado ambiguo Modify | `WATCHLIST` | Mantener watchlist |
| DEMO-07 «Cambiemos la reserva» | `DEFERRED` | Mantener diferido |

Advertencia del TASK v0.6: Cancel no debía considerarse estabilizado para demo externa mientras OBS-M6-10 estuviera abierto. Para la Demo Comercial nueva, verificar el estado canónico de Cancel y, si persiste la limitación, excluir el corredor Cancel de los casos demostrados en lugar de convertir necesariamente su reparación en condición previa para congelar un alcance comercial más estrecho.

Otros diferidos históricos: refresh global de Runtime Map V1, refactor Nivel 4, SIN V2, listado ambiguo Modify y mejoras no necesarias para el recorrido comercial.

## 7. Contratos de gobierno y exclusiones

- `main` es la línea integrada canónica; comprobar HEAD remoto antes de diseñar hito.
- Aplicar `CODE → COMMIT → HASH → PUSH → DOC` cuando se autoricen cambios versionables.
- `asistente_tecnico`: implementación acotada; `arquitecto_sistema`: análisis cross-slice; `repo_guardian`: auditoría; `hdoc`: documentación.
- Codex Profile V2: no usar `@workspace`; verificar agente, sandbox, permisos y sesión efectivos. Copilot de VS Code: comenzar con `@workspace`.
- La existencia de contratos Frozen y Astra publicados no autoriza cutover,
  promoción, creación de recursos, servicios, secretos ni cambios de
  configuración; ese workstream está pausado.
- No compartir secretos ni solicitar su contenido; usar evidencias sanitizadas del entorno local.
- No prometer aislamiento por tener contenedores llamados «demo». Verificar que código, datos y efectos externos estén realmente separados.
- No promover tests sintéticos a validación operacional; no elevar demo controlada a producción comercial sin gates específicos.
- No promover conectividad histórica de Email, Web o WhatsApp a estabilidad
  funcional actual sin evidencia.
- No refactorizar `messageHandler`, migrar a `mhFlowGraph` ni modificar otros
  componentes por anticipado durante el diagnóstico.
- Preservar `scripts/semantic-normalization-spike/` y otros residuales locales ajenos; no asumir estado Git limpio.

## 8. Secuencia de continuidad e invocación de AGPT

Forma sugerida de invocación al iniciar otro hilo:

> AGPT, continuemos BegaIA desde TASK.md v0.9. La prioridad actual es estabilizar funcionalmente la Demo multicanal Web, Email y WhatsApp. Frozen y el aislamiento de entornos están pausados por decisión expresa. Verificá HEAD de main, Operating Model, hitos recientes y evidencias efectivas. Primero identifiquemos las regresiones observadas; no implementar correcciones sin diagnóstico y hito autorizado.

### Primer paso al reanudar

- Verificar `main` y documentos canónicos en GitHub.
- Leer este TASK como agenda auxiliar, sin asumir vigencia de hashes, observaciones operacionales o pendientes históricos.
- Identificar una regresión funcional observada y recuperar el comportamiento
  previamente esperado.
- Localizar contratos, pruebas e hitos anteriores pertinentes.
- Reproducir el defecto con evidencia y determinar si comparte causa con otros
  defectos.
- Diseñar un hito correctivo de intención acotada e implementar sólo después de
  autorización.
- Validar cada corrección con pruebas de regresión y Guardian.
- Mantener `OBS-EMAIL-HEARTBEAT-WITHOUT-LOCK` como observación P2 independiente,
  sin declararla resuelta ni convertirla automáticamente en bloqueo de toda
  prueba funcional Email.
- Actualizar TASK después de un cambio material de estado con fecha, hashes revisados, decisiones, evidencia, pendientes y siguiente acción.

## 9. Criterios futuros de la línea tripartita — en pausa

Estos criterios se conservan como antecedentes del workstream Frozen y no son
la acción vigente:

- Baseline Demo congelado, hash/tag/artefacto reproducible y origen verificados.
- Código Demo sin dependencia mutable del workspace Developer.
- Configuración, secretos y credenciales Demo acotados y efectivamente cargados.
- Datos operacionales Demo aislados o comparticiones justificadas con controles verificables.
- Docker (proyectos, imágenes, redes, volúmenes, procesos y puertos) sin interferencias demostradas.
- Email/WhatsApp/Web y cualquier canal externo evaluados bajo contención Demo.
- Developer puede evolucionar sin cambiar la Demo activa.
- Experimental no puede afectar involuntariamente Demo ni Developer.
- Procedimiento de promoción y rollback validado con evidencia.
- Recorrido comercial seleccionado y validado sobre el baseline congelado, no sobre el workspace activo.
- Estado comercial/productivo declarado sólo con validación específica independiente.

## 10. Historial y próximos controles

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 0.1–0.6 | 2026-11-02 a 2026-11-05 | Backlog funcional y correctivos Cancel; conservado como fuente histórica adjunta |
| 0.7 | 2026-11-24 | Reorientación al objetivo tripartito; evidencia Email once y watch; baseline GitHub actualizado; backlog histórico separado de la prioridad vigente; ruta de invocación AGPT |
| 0.8 | 2026-11-24 | ENV-01 marcado `ANALYSIS_COMPLETE`; `INFRA-DEMO-CODE-ISOLATION-01` registrado como recomendado no autorizado; observación `OBS-EMAIL-HEARTBEAT-WITHOUT-LOCK` incorporada como P2 pendiente |
| 0.9 | 2026-11-25 | Prioridad P0 reorientada al diagnóstico y estabilización funcional multicanal; Frozen y ENV-02 a ENV-06 pausados; contratos publicados y backlog histórico preservados |

### Próxima acción operativa

`NEXT_ACTION: DEMO_MULTICHANNEL_REGRESSION_DIAGNOSIS`

Procedimiento:

1. identificar una regresión funcional observada;
2. recuperar el comportamiento previamente esperado;
3. localizar contratos, pruebas e hitos anteriores pertinentes;
4. reproducir el defecto con evidencia;
5. determinar si existe causa compartida con otros defectos;
6. diseñar un hito correctivo de intención acotada;
7. implementar sólo después de autorización;
8. validar con pruebas de regresión y Guardian.

Estado de referencia: `FUNCTIONAL_DEMO_STABILIZATION` —
`DEMO_MULTICHANNEL_REGRESSION_DIAGNOSIS` — `FROZEN_WORKSTREAM_PAUSED_BY_AGPT`
— `ENV_01_ANALYSIS_COMPLETE` —
`OBS_EMAIL_HEARTBEAT_WITHOUT_LOCK_PENDING_FIX_DESIGN`.
