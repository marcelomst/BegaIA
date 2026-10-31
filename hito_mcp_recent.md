# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

recent_hitos_count: 10

## 1. SPIKE-SIN-SEMANTIC-CONTRACT-V2-13

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

## 2. TEST-OBS-M6-07-POST-DISCARD-CAUSAL-CHARACTERIZATION-01

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

## 3. FIX-GUESTWIDE-MODIFY-AUTHORITY-RESOLUTION-01

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

## 4. TEST-CANONICAL-READ-INTEGRITY-MATRIX-01

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

## 5. SPIKE-RDA-OFFLINE-CONSISTENCY-EVALUATOR-12

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

## 6. FIX-MODIFY-NUMGUESTS-COMPOUND-EXTRACTION-01

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

## 7. TEST-MODIFY-NUMGUESTS-TRACE-01

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

## 8. FIX-CANCEL-OBJECT-SCOPE-AFTER-DISCARD-01

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

## 9. FIX-MODIFY-CANCEL-OBJECT-NORMALIZATION-01

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

## 10. SEC-CLOUDFLARED-UPGRADE-01

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
