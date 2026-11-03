# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

recent_hitos_count: 10

## 1. FIX-DEMO-M6-DISCARD-OBJECT-SCOPE-01

- Identificador: `FIX-DEMO-M6-DISCARD-OBJECT-SCOPE-01`
- Nombre: `harden M6 discard and cancel target scope`
- Commit tecnico: `3234f6456ccb93b93214eeb3742fc254455bce90`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Reconoce contextualmente `propuesta` durante un preview
  Modify, descarta el preview y sus confirmaciones pendientes, bloquea
  fail-closed la cancelacion anaforica sin target suficiente y preserva Cancel
  con target canonico strong; mantiene `OBS-M6-08`, `OBS-M6-09` y `OBS-M6-10`
  fuera de alcance.

## 2. FIX-CANONICAL-READ-SAME-ID-HYDRATION-01

- Identificador: `FIX-CANONICAL-READ-SAME-ID-HYDRATION-01`
- Nombre: `correct canonical same-ID hydration after Modify discard`
- Commit tecnico: `3443c7463f45a6d5b3537d1e51d7a961eab5a951`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Corrige la hidratacion canonica same-ID entre
  Modify/Discard y Snapshot, preserva autoridad material local primero y
  restringe el fallback guest-wide read-only a `hotelId`, `canonicalGuestId`
  y `reservationId`; refresca rangos top-level del Runtime Map sin alterar sus
  cajas ni el modelo conceptual.

## 3. SPIKE-SIN-SEMANTIC-CONTRACT-V2-13

- Identificador: `SPIKE-SIN-SEMANTIC-CONTRACT-V2-13`
- Nombre: `experimental SIN V2 semantic contract`
- Commit tecnico: `1412b8d76c6eaf11a266839dd6624139b4eb8827`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Incorpora offline el contrato experimental SIN V2, su
  validador estricto, un adaptador conservador hacia RDA, fixtures y 29 pruebas
  focalizadas aprobadas; preserva 15 pruebas RDA y mantiene el spike aislado,
  sin autoridad operacional, efectos ni estado canonico paralelo.

## 4. TEST-OBS-M6-07-POST-DISCARD-CAUSAL-CHARACTERIZATION-01

- Identificador: `TEST-OBS-M6-07-POST-DISCARD-CAUSAL-CHARACTERIZATION-01`
- Nombre: `characterize OBS-M6-07 after valid Modify preview discard`
- Commit tecnico: `c4c991b7062cb5adb736adb7c19cd9c2689c754c`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Caracteriza causalmente `OBS-M6-07` despues de descartar
  un preview Modify valido: las precondiciones pasan y la unica divergencia
  esperada es la completitud post-descarte. No observa efectos de dominio de
  modify, cancel ni create, no declara la observacion resuelta y preserva
  `FIX-CANONICAL-STATUS-ACTIONABILITY-01` en `RECONCILED / CLOSURE_BLOCKED`.

## 5. FIX-GUESTWIDE-MODIFY-AUTHORITY-RESOLUTION-01

- Identificador: `FIX-GUESTWIDE-MODIFY-AUTHORITY-RESOLUTION-01`
- Nombre: `restore guestwide modify authority resolution`
- Commit tecnico: `3281c9b7c2ff1791c02ce2dd7759e399123e05c8`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Restaura Modify mediante autoridad material guest-wide
  efimera por hotel, huesped canonico y reserva, con autoridad local primero,
  identificacion no autoritativa, fail-closed y revalidacion antes de quote,
  preview y ejecucion; mantiene `OBS-M6-07` confirmado y no altera el cierre
  bloqueado del hito relacionado.

## 6. TEST-CANONICAL-READ-INTEGRITY-MATRIX-01

- Identificador: `TEST-CANONICAL-READ-INTEGRITY-MATRIX-01`
- Nombre: `characterize canonical read integrity matrix`
- Commit tecnico: `474257d286fca3e0061c334ac770eaf1c3dac501`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Caracteriza mediante una matriz A-H la integridad del read
  path canonico de reservas; conserva 13 expected-failure, con `OBS-M6-02` y
  `OBS-M6-07` en `CONFIRMED`, sin cambios productivos ni refresh del Runtime
  Map.

## 7. SPIKE-RDA-OFFLINE-CONSISTENCY-EVALUATOR-12

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

## 8. FIX-MODIFY-NUMGUESTS-COMPOUND-EXTRACTION-01

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

## 9. TEST-MODIFY-NUMGUESTS-TRACE-01

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

## 10. FIX-CANCEL-OBJECT-SCOPE-AFTER-DISCARD-01

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
