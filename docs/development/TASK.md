<!-- Path: docs/development/TASK.md -->

DOCUMENT_TYPE: OPERATIONAL_TRACKER

# BEGAIA — TASK

Versión: 0.7
Fecha de actualización: 2026-11-24
Responsable de planificación: AGPT
Responsable de control y operaciones Git: AH / operador conforme al Operating Model
Frente prioritario: Arquitectura de tres entornos — Demo Comercial / Developer / Experimental
Estado: Documento auxiliar de continuidad y coordinación.
Autoridad documental: subordinada a `docs/architecture/system_operating_model.md`; no sustituye ni modifica fuentes canónicas.
Sesión: ACTIVE — fase de análisis; implementación de aislamiento NO autorizada

Regla de continuidad: este TASK dirige la conversación y conserva decisiones, pero no sustituye la comprobación de GitHub, el estado local ni el System Operating Model. No autoriza por sí solo implementación, configuración externa, commit, push o despliegues.

Regla de actualización versionable: toda modificación de este archivo se rige por el Operating Model, requiere un hito autorizado y no habilita por sí misma implementación, Git write ni despliegues.

## 1. Objetivo principal y decisión vigente

Materializar una Demo Comercial congelada, identificable, reproducible e independiente del workspace de desarrollo y experimentación, manteniendo el desarrollo normal de BegaIA y un corredor separado para experimentos.

| Entorno | Propósito | Condición de aceptación principal |
| --- | --- | --- |
| Demo Comercial | Presentar BegaIA a hoteles con comportamiento previsible | Baseline inmutable, despliegue aislado, datos/configuración controlados, promoción y rollback verificables |
| Developer | Evolución del SaaS en el repositorio canónico | Cambios bajo Operating Model sin afectar la Demo activa |
| Experimental | SIN/RDA, Copilot, modelos locales y benchmarks | Aislamiento de código, datos y efectos; sin acceso accidental a Demo |

Prioridad P0: analizar las dependencias y definir el mínimo camino crítico hacia Demo Comercial congelada. No abrir nuevos hitos funcionales de Email ni de Cancel como prerrequisito automático. Los defectos relevantes para los casos concretos de demo se analizarán y decidirán expresamente.

Decisión de AGPT, 2026-11-24: retomar el objetivo tripartito original. Los trabajos de Email son habilitadores ya demostrados, no el destino de esta línea de trabajo.

## 2. Fuentes de verdad y baseline

- Repositorio canónico: `marcelomst/BegaIA`, rama `main`.
- HEAD de `main` verificado por AGPT el 2026-11-24: `fdca37b43ad28c34800402dc3a706dc61977e9b8`.
- Commit documental del hito Email allowlist: `fdca37b43ad28c34800402dc3a706dc61977e9b8`; HDOC reportó `STATUS: CLOSED` y push confirmado.
- Commit técnico asociado: `8663e8f3d0889137b1500782bab34daba78172e0`.
- Documentos prioritarios: `README.md`, `docs/architecture/system_operating_model.md`, `docs/architecture/roadmap.md`, `docs/architecture/message_pipeline.md`, `hito_mcp_recent.md`, `hito_mcp.md` y ADRs relacionados con despliegue/canales.
- Configuración efectiva local, contenedores, secretos, proveedores, datos y agentes: verificar directamente en el entorno correspondiente; GitHub no la prueba.
- Archivos adjuntos a Hotel Assistant: auxiliares; pueden estar desactualizados. No requieren sincronización manual periódica.
- TASK: esta versión se preparó desde el documento v0.6 adjunto. Su presencia en el working tree no acredita integración, commit, push ni publicación; esos estados deben verificarse en Git.
- Al abrir una nueva sesión o invocar este documento: reverificar HEAD remoto, README, Operating Model, hitos recientes y estado local antes de proponer hito o atribuir vigencia a los estados aquí registrados.

## 3. Estado operacional demostrado — Email (2026-11-24)

Capacidad funcional demostrada, NO equivalente a Demo congelada.

- Hotel de prueba: `hotel999`.
- Cuenta de hotel: `begamshop.ventas@gmail.com`.
- Remitente/destinatario de prueba autorizado: `marcelomst1@gmail.com`.
- IMAP y SMTP con credencial externa vía `secretRef=demo-hotel999-main` y `source=env`: comprobados en pruebas reales.
- Hito `SEC-EMAIL-WORKER-SMTP-RECIPIENT-ALLOWLIST-01`: el tracker conserva el cierre reportado por HDOC y la publicación posterior; el registro técnico canónico acredita 21 pruebas focalizadas PASS, pero no acredita conexiones o envíos SMTP reales. La prueba SMTP real consignada aquí corresponde a evidencia operacional posterior informada por AGPT.
- Worker once: prueba `BEGAIA-EMAIL-E2E-02` respondió consulta sobre estacionamiento; entrega Gmail confirmada.
- Worker Docker continuo `begasist-demo-email`, modo watch: prueba `BEGAIA-EMAIL-WATCH-01` de check-out recibió respuesta real («El check-out es hasta las 11:00.»).
- Última observación operacional aportada: contenedor `running | healthy | Restarts=0`, polling y heartbeat activos, Redis lock `email_bot_lock:hotel999` presente (`1`), bandeja sin pendientes.
- Variables efectivas comprobadas en contenedor: `EMAIL_SENDING_ENABLED=true`, `EMAIL_WORKER_ALLOWED_RECIPIENTS=marcelomst1@gmail.com`, `EMAIL_LEGACY_ALLOWED_SENDERS=marcelomst1@gmail.com`, `EMAIL_LEGACY_MAX_MESSAGES=1`, `EMAIL_LEGACY_SAFE_MODE=1`.
- La allowlist restringe destinatarios SMTP; el máximo de un mensaje es por lote, no un límite total para un worker continuo.
- Advertencia no bloqueante observada: `[conversation-trace]/Astra Unsupported update operation modifier: $push ... '$slice'`. No incorporar automáticamente su corrección al frente de aislamiento.
- No se acredita operación multihotel, despliegue productivo, aislamiento de Demo o estabilidad prolongada.
- El servicio actual se monta desde el workspace mediante `.:/app:cached` y reutiliza la imagen `begasist-suite:dev`. Por ello no es una versión congelada independiente. Cambios en `lib/` pueden afectar el proceso en ejecución/reiniciado mediante nodemon. Es un riesgo activo mientras se desarrolla.
- Nota de operación: mientras esté activo el worker watch con SMTP, mantener ambos filtros restringidos y no lanzar pruebas/deploys paralelos sobre la misma cuenta de correo sin control. Una acción de aislamiento deberá decidir expresamente el destino y la parada/migración de este servicio.

## 4. Diagnóstico de los tres entornos — preliminar, no cierre

| Dimensión | Demo Comercial actual | Developer | Experimental | Acción requerida |
| --- | --- | --- | --- | --- |
| Código | Compose usa bind mount `.:/app:cached` y tag de imagen dev | Workspace WSL canónico | Residuales de `scripts/semantic-normalization-spike/` observados | Diseñar fuente inmutable de Demo y límites físicos de workspace |
| Procesos | Suite y worker Email de demo actual, no congelados | Servicios y agentes sobre el mismo repositorio | Herramientas/prototipos según sesión | Inventariar procesos, redes, puertos y dependencias reales |
| Datos | `hotel999`, Astra y Redis operativos | Separación no acreditada | Aislamiento de datos no acreditado | Identificar namespaces, credenciales, volúmenes, dataset demo y posibles escrituras cruzadas |
| Canales | Email controlado, Web y WhatsApp según cobertura vigente | Conectores de desarrollo | Sin garantía general de aislamiento | Definir endpoints, proveedores, webhooks y políticas de envío por entorno |
| Versionado | Falta baseline comercial congelado comprobado | `main` es línea integrada canónica | Trabajo experimental separado por política, aislamiento efectivo no verificado | Definir promoción, rollback y verificación por hash |
| Secretos | `runtime.env` privado externo para demo actual; SecretRef Email probado | Contratos documentados | Estado efectivo por auditar | Inventario sanitizado y separación de efectos/credenciales |

Ninguna celda «por auditar» concede readiness o prueba por inferencia. Evitar duplicar infraestructura innecesariamente: preferir la mínima separación suficiente y comprobable.

## 5. Backlog prioritario — línea de trabajo vigente

| ID de seguimiento AGPT | Prioridad | Trabajo | Estado | Agente / intervención prevista |
| --- | --- | --- | --- | --- |
| ENV-01 | P0 | Auditoría diferencial real de dependencias Demo/Developer/Experimental y requisitos mínimos de independencia | `NEXT — ANALYSIS_ONLY` | `arquitecto_sistema` (Codex Profile V2); diagnóstico local sanitizado cuando proceda |
| ENV-02 | P0 condicional a ENV-01 | Diseño acotado del baseline Demo congelado, configuración, procesos, datos y rollback | `PENDING_DESIGN` | `arquitecto_sistema`; AGPT decide hito específico |
| ENV-03 | P0 condicional a diseño aprobado | Implementación y verificación del aislamiento de Demo sin afectar Developer | `NOT_AUTHORIZED` | `asistente_tecnico` y `repo_guardian` según Operating Model |
| ENV-04 | P1 | Definir corredor Experimental y protección frente a Demo/Developer | `PENDING_ASSESSMENT` | `arquitecto_sistema`, con contrato operacional efectivo |
| ENV-05 | P1 | Promoción controlada Developer → Demo, smoke, rollback y evidencia de reproducibilidad | `PENDING_DESIGN` | Agentes definidos después de ENV-01/02 |
| ENV-06 | P1 | Selección de recorrido comercial y pruebas sobre baseline Demo final | `PENDING_BASELINE` | AGPT / ejecución humana con evidencia |

Estos IDs son identificadores auxiliares de planificación de AGPT, no hitos aprobados o registrados en `hito_mcp.md`. No autorizar automáticamente los hitos siguientes por completar un análisis.

### Condiciones mínimas para aceptar ENV-01

- Enumerar qué comparte hoy Demo con Developer y Experimental: directorios, bind mounts, imágenes, procesos, redes, volúmenes, Redis, Astra, secretos, puertos y endpoints.
- Distinguir evidencia GitHub de evidencia WSL/Docker y recursos privados no inspeccionados.
- Identificar rutas de contaminación: cambios en código, reinicios de nodemon, escrituras en datos de demostración, pruebas de agentes y correos automáticos.
- Proponer 1 opción mínima preferida y alternativas sólo si son materialmente distintas, con costos/riesgos, dependencias y rollback.
- Distinguir requisito indispensable de mejora diferible; definir condiciones de aceptación verificables.
- Recomendar el primer hito implementable con una sola intención, pero no implementarlo.

## 6. Backlog funcional heredado de TASK v0.6 — conservado, NO revalidado

El documento aportado de fecha 2026-11-05 registraba la estabilización funcional como prioridad inmediata. Esa priorización queda sustituida por ENV-01, no borrada ni declarada resuelta. No transportar los estados históricos a hechos actuales sin cotejarlos con main, hito_mcp_recent.md/`hito_mcp.md` y pruebas vigentes.

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
- El análisis ENV-01 no autoriza crear worktrees, imágenes, redes, volúmenes, secretos, servicios, commits ni modificar configuraciones.
- No compartir secretos ni solicitar su contenido; usar evidencias sanitizadas del entorno local.
- No prometer aislamiento por tener contenedores llamados «demo». Verificar que código, datos y efectos externos estén realmente separados.
- No promover tests sintéticos a validación operacional; no elevar demo controlada a producción comercial sin gates específicos.
- No repetir los hitos Email cerrados ni iniciar el diagnóstico de `$push/$slice` salvo justificación de impacto en la separación.
- No cambiar `messageHandler` ni migrar a `mhFlowGraph` dentro de este análisis.
- Preservar `scripts/semantic-normalization-spike/` y otros residuales locales ajenos; no asumir estado Git limpio.

## 8. Secuencia de continuidad e invocación de AGPT

Forma sugerida de invocación al iniciar otro hilo:

> AGPT, continuemos BegaIA desde TASK.md v0.7. Prioridad P0: ENV-01, análisis diferencial de aislamiento para materializar Demo Comercial congelada, Developer y Experimental. Primero verificá HEAD de main, Operating Model, hito_mcp_recent.md y estado efectivo; reconciliá el backlog sin reabrir hitos Email. No implementar ni iniciar servicios. Devolveme diagnóstico, camino crítico y prompt para arquitecto_sistema (Codex Profile V2), si corresponde.

### Primer paso al reanudar

- Verificar `main` y documentos canónicos en GitHub.
- Leer este TASK como agenda auxiliar, sin asumir vigencia de hashes o pendientes históricos.
- Recuperar evidencias efectivas sanitizadas de WSL/Docker sólo cuando sean necesarias.
- Evaluar si ENV-01 requiere agente arquitecto y preparar un prompt read-only de una sola intención.
- Analizar resultado del agente, decidir el primer hito real y su clasificación canónica; no implementar hasta autorización.
- Actualizar TASK después de un cambio material de estado con fecha, hashes revisados, decisiones, evidencia, pendientes y siguiente acción.

## 9. Criterios de cierre de la línea tripartita

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

### Próxima decisión AGPT

ENV-01: preparar análisis diferencial de arquitectura e infraestructura para construir una Demo Comercial congelada e independiente, sin cambios durante el análisis.

Estado de referencia: TRIPARTITE_OBJECTIVE_RESTORED — EMAIL_WATCH_CONTROLLED_OPERATIONAL — DEMO_FREEZE_NOT_VERIFIED — ENV_01_ANALYSIS_PENDING.
