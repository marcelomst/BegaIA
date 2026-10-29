# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

recent_hitos_count: 10

## 1. SPIKE-RDA-OFFLINE-CONSISTENCY-EVALUATOR-12

- Identificador: `SPIKE-RDA-OFFLINE-CONSISTENCY-EVALUATOR-12`
- Nombre: `offline RDA consistency evaluator`
- Commit tecnico: `ebb6aa776360009715b1cf322922b37fe8d3bb0f`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Incorpora un evaluador determinista offline RDA, fixtures
  de desarrollo y 15 tests focalizados aprobados, con TypeScript estricto,
  ESLint y aislamiento productivo validados; la procedencia de entrada no se
  autentica, la auditoria se limita a relaciones suministradas y ningun
  resultado autoriza operaciones.

## 2. FIX-MODIFY-NUMGUESTS-COMPOUND-EXTRACTION-01

- Identificador: `FIX-MODIFY-NUMGUESTS-COMPOUND-EXTRACTION-01`
- Nombre: `preserve compound guest extraction`
- Commit tecnico: `1056624f1b0ee900a1d587ee5a061d0fc56adcef`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Preserva `numGuests` en expresiones compuestas ligadas a
  un tipo de habitacion canonico, acota palabras numericas al contexto de
  personas o huespedes, cubre la traza Modify de ocho etapas y refresca
  evidencia fisica focal del Runtime Map sin modificar cajas, taxonomia,
  relaciones ni diagramas conceptuales.

## 3. TEST-MODIFY-NUMGUESTS-TRACE-01

- Identificador: `TEST-MODIFY-NUMGUESTS-TRACE-01`
- Nombre: `trace numGuests modify defect`
- Commit tecnico: `3db892f2a9fe160481acffe24b957bafc36ac263`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Caracteriza mediante siete expected-failure la perdida de
  `numGuests` en `modify`, preserva 26 pruebas MCP correctas y mantiene
  `OBS-M6-03` como `CONFIRMED`; `OBS-M6-04` sigue pendiente de reproduccion
  causal, sin atribucion especifica. Registra una incidencia Git excepcional:
  el STAGE quedo dividido, el shell informo
  `messageHandler.reference_resolution.spec.ts: command not found` y se
  continuo con COMMIT y PUSH pese al error. El procedimiento historico
  permanecio incumplido; Guardian verifico que el commit publicado es
  materialmente exacto, AGPT acepto provisionalmente el artefacto y AH
  autorizo excepcionalmente continuar solo para este hito y commit, sin
  convertir el protocolo en PASS ni modificar el Operating Model.

## 4. FIX-CANCEL-OBJECT-SCOPE-AFTER-DISCARD-01

- Identificador: `FIX-CANCEL-OBJECT-SCOPE-AFTER-DISCARD-01`
- Nombre: `guard cancel object scope after discard`
- Commit tecnico: `64aec813cdc723907ad17f53292df951cecdfd32`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Impide que referencias a cambios descartados activen una
  cancelacion, exige aclaracion sin objeto suficiente y limpia confirmaciones
  sensibles obsoletas; preserva cancelaciones legitimas y refresca evidencia
  fisica focal del Runtime Map sin modificar sus 19 cajas ni el modelo
  conceptual.

## 5. FIX-MODIFY-CANCEL-OBJECT-NORMALIZATION-01

- Identificador: `FIX-MODIFY-CANCEL-OBJECT-NORMALIZATION-01`
- Nombre: `normalize modify-cancel object resolution`
- Commit tecnico: `2ca48e2216548c32476da8749b029376bd14a6da`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Normaliza contextualmente el objeto cancelado al pasar de
  un preview `modify` a `cancel`, descarta el cambio pendiente, conserva el
  target canonico exacto y activo y exige confirmacion; refresca evidencia
  fisica del Runtime Map sin modificar sus 19 cajas ni el modelo conceptual.

## 6. SEC-CLOUDFLARED-UPGRADE-01

- Identificador: `SEC-CLOUDFLARED-UPGRADE-01`
- Nombre: `pin cloudflared security version`
- Commit tecnico: `2c6d8b443282a073db6be85891f5f25d8c36df5f`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Fija Cloudflare Tunnel en Docker Compose a
  `cloudflare/cloudflared:2026.10.4`, valida la configuracion efectiva, el
  contenedor saludable, cuatro conexiones QUIC y el digest observado, sin
  cambios de arquitectura, roadmap, Runtime Map ni reglas operativas.

## 7. GOV-SIMPLIFY-AGENT-HANDOFF-GIT-01

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

## 8. FIX-MODIFY-MULTIFIELD-PREVIEW-INTEGRITY-01

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

## 9. REF-RUNTIME-MAP-MODIFY-PREVIEW-01

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

## 10. DOC-CONVERSATIONAL-GOVERNANCE-INVARIANTS-01

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
