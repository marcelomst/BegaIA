# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

recent_hitos_count: 10

## 1. GOV-SIMPLIFY-AGENT-HANDOFF-GIT-01

- Identificador: `GOV-SIMPLIFY-AGENT-HANDOFF-GIT-01`
- Nombre: `restore simplified agent Git handoff`
- Commit tecnico: `859bedec5a26c077661a9fa3b528376abf5a8daf`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; el documentation commit y su
  push deben ejecutarse mediante OPS-02 antes de la validacion postcommit de
  HDOC(CLOSE).
- Descripcion breve: Restablece `RESTORE_SIMPLE_GIT` como contrato general
  para hitos posteriores, mantiene autoridad Git write exclusiva de AH,
  auditoria previa, envelopes y verificacion posterior, acepta la perdida de
  revalidacion automatica inmediata y exige reevaluacion ante desarrolladores
  concurrentes; conserva OPS-02 solo para cerrar este hito y deja como
  pendiente posterior retirar las excepciones externas autorizadas.

## 2. FIX-MODIFY-MULTIFIELD-PREVIEW-INTEGRITY-01

- Identificador: `FIX-MODIFY-MULTIFIELD-PREVIEW-INTEGRITY-01`
- Nombre: `preserve multifield modify preview integrity`
- Commit tecnico: `0e431ef2a0a4e687be1f4ec6fcde268e94bb8e83`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Compone campos explicitos y acumulados de `modify` bajo el
  mismo `reservationId`, preserva `numGuests: null` como valor canonico,
  valida capacidad y disponibilidad antes del quote y ejecuta solo el
  `pendingPatch` cotizado; cubre O1/O2 y paridad M1/M3/M4/M5, deja M2/M6 fuera
  de alcance y refresca evidencia fisica del Runtime Map sin cambio conceptual.

## 3. REF-RUNTIME-MAP-MODIFY-PREVIEW-01

- Identificador: `REF-RUNTIME-MAP-MODIFY-PREVIEW-01`
- Nombre: `refresh modify preview runtime map references`
- Commit tecnico: `d495004bb7c7df97cf5b03fbef5a50674d2bfc41`.
- Push tecnico: confirmado.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Publica un refresh factual, focal y reproducible de scans
  y code refs de `reservation.modify`, `turnDecision` y `persistenceReply`;
  preserva las 19 cajas y limita la frescura al foco verificado, sin cambios
  funcionales, conceptuales, de roadmap ni de arquitectura viva.

## 4. DOC-CONVERSATIONAL-GOVERNANCE-INVARIANTS-01

- Identificador: `DOC-CONVERSATIONAL-GOVERNANCE-INVARIANTS-01`
- Nombre: `codify conversational governance invariants`
- Commit tecnico: `236b227281b9d2a453122cbd374821ee35c8241e`.
- Push tecnico: confirmado.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Incorpora canonicamente GC-01 a GC-04 en la arquitectura
  viva del pipeline, acota GC-02 al desplazamiento de modify pendiente por
  cancel y GC-03 a modify/cancel sobre reservas existentes, e integra la
  obligacion previa de target sin duplicarla ni alterar la aclaracion ante
  ambiguedad.

## 5. GOV-FIX-CONDITIONAL-HITO-TYPE-01-CUTOVER

- Identificador: `GOV-FIX-CONDITIONAL-HITO-TYPE-01-CUTOVER`
- Nombre: `activate conditional hito_type contract in external Codex profiles`
- Clasificacion del cambio: `external_operational_change`.
- Tipo de hito: `operating_environment_cutover`.
- Artefactos tecnicos del cutover: `technical_commit`, `commit_hash` y
  `technical_push` en `not_applicable`.
- Hito padre: `GOV-FIX-CONDITIONAL-HITO-TYPE-01`, clasificado como
  `existing_repo_change`, con commit tecnico publicado
  `ae773c469804bc3b6794b5a07af6013353ef5f43` y push confirmado.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Activa en los tres perfiles Codex externos el contrato
  condicional de `hito_type`, preserva la rama versionable del hito padre y
  registra evidencia sustitutiva auditada, integridad del repositorio y
  rollback disponible sin modificar perfiles durante la fase documental.

## 6. FIX-MODIFY-CANCEL-PRECEDENCE-01

- Identificador: `FIX-MODIFY-CANCEL-PRECEDENCE-01`
- Nombre: `arbitrate modify preview cancellation`
- Commit tecnico: `0da07bc606a962a0ce39c9e924e158435a520e83`.
- Push tecnico: confirmado.
- Commit documental: `PENDING`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Corrige la precedencia de cancelar sobre un preview de modificacion pendiente, conserva target y slots canonicos, mantiene confirmaciones mutuamente excluyentes y refresca los rangos top-level del Runtime Map sin cambio conceptual; O1 y O2 quedan fuera de alcance.

## 7. FIX-RESERVATION-CANCEL-MCP-RESULT-VALIDATION-01

- Identificador: `FIX-RESERVATION-CANCEL-MCP-RESULT-VALIDATION-01`
- Nombre: `validate provider cancellation result fail-closed`
- Commit tecnico: `7111f9aa6f039f4fc12f881b8f661499cea23a94`.
- Push tecnico: confirmado.
- Commit documental: `PENDING`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Valida fail-closed el resultado del proveedor en `cancelReservationTool`; solo acepta una `Reservation` canonica con `hotelId` y `reservationId` coincidentes y `status` exactamente `cancelled`, sin cambios arquitectonicos ni refresh del Runtime Map.

## 8. FIX-RESERVATION-PROPOSAL-FRESH-STATE-CAS-01

- Identificador: `FIX-RESERVATION-PROPOSAL-FRESH-STATE-CAS-01`
- Nombre: `enforce newest-wins reservation proposal publication with logical turn revision`
- Commit tecnico: `cbf72a9f7cbc701faaea424ad474a08a49b8e7d1`.
- Push tecnico: confirmado.
- Commit documental: `PENDING`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Corrige la inicializacion y publicacion concurrente de propuestas `reservation.create` mediante revision logica del turno, conserva `conv_state` como unica fuente canonica y refresca los rangos top-level del Runtime Map sin cambiar cajas ni arquitectura conceptual.

## 9. OPS-02-GIT-WRITE-CONTRACT-01

- Identificador: `OPS-02-GIT-WRITE-CONTRACT-01`
- Nombre: `establish canonical three-phase Git write contract`
- Commit tecnico: `7ad995a18851e404072ccf4fba79cf60b126abb0`.
- Push tecnico: confirmado.
- Commit documental: `PENDING`.
- Estado documental: `DOCUMENTACION_PREPARADA`; commit documental `PENDING` y cierre sujeto a validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Establece el contrato canonico de Git write en tres fases independientes y fail-closed bajo autoridad exclusiva de AH, con validacion exacta de staging, commit, residual y publicacion remota, sin duplicar la fuente normativa del Operating Model.

## 10. PERS-02

- Identificador: `PERS-02`
- Nombre: `preserve rich deterministic create proposals`
- Cadena tecnica: `229bf02fa8db71fe8ef84357e66cb1d4441729b9` → `7cb9178bc03277a0e54cb8b8bb350627cf793220`.
- Technical head: `7cb9178bc03277a0e54cb8b8bb350627cf793220`.
- Push tecnico: confirmado.
- Estado documental: `DOCUMENTACION_PREPARADA`; contenido final versionable listo para materializacion por Marcelo y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Preserva propuestas ricas durante `reservation.create` deterministico, publica y finaliza `lastProposal` mediante CAS de identidad completa, bloquea confirmaciones invalidas o stale, mantiene continuidad tras consultas laterales y refresca evidencia fisica focal sin cambio conceptual ni afirmacion de frescura global.
