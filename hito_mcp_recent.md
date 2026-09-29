# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. OPS-OPERATING-MODEL-WORKFLOW-RECONCILIATION-02

- Identificador: `OPS-OPERATING-MODEL-WORKFLOW-RECONCILIATION-02`
- Nombre: `OPS-OPERATING-MODEL-WORKFLOW-RECONCILIATION-02`
- Commit message: `docs(workflow): reconcile agent lifecycle with operating model`
- Hash: `dbb913ae0f96a24a85b10a5c21cf7da5cb7984f6`
- Estado documental: `DOCUMENTACION_PREPARADA`; commit documental `PENDING`.
- Descripción breve: Reconcilia la guía subordinada de agentes con el lifecycle, las clasificaciones, los gates y la autoridad Git del Operating Model canónico, sin introducir reglas nuevas.

## 2. OPS-OPERATING-MODEL-MARKDOWN-NORMALIZATION-01

- Identificador: `OPS-OPERATING-MODEL-MARKDOWN-NORMALIZATION-01`
- Nombre: `OPS-OPERATING-MODEL-MARKDOWN-NORMALIZATION-01`
- Commit message: `docs(architecture): normalize operating model markdown`
- Hash: `c78227a7737e403c9359f0b5c6299b32d5aeda04`
- Estado documental: `DOCUMENTACION_PREPARADA`; commit documental `PENDING`.
- Descripción breve: Restaura headings, listas, separación y bloques fenced Markdown del Operating Model sin alterar contenido contractual, reglas operativas ni arquitectura viva.

## 3. OPS-OPERATING-MODEL-MARKDOWN-FENCE-FIX-01

- Identificador: `OPS-OPERATING-MODEL-MARKDOWN-FENCE-FIX-01`
- Nombre: `OPS-OPERATING-MODEL-MARKDOWN-FENCE-FIX-01`
- Commit message: `docs(architecture): fix operating model markdown fence`
- Hash: `e2238cc5e316778c3ac2e5ff15f3b38d80b9f3be`
- Estado documental: `DOCUMENTACION_PREPARADA`; commit documental `PENDING`.
- Descripción breve: Reubica el cierre de un fence Markdown para limitar el bloque `text` a sus tres líneas previstas, sin modificar contenido contractual, reglas operativas ni arquitectura viva.

## 4. OPS-CODEX-SESSION-PROFILES-CUTOVER-01

- Identificador: `OPS-CODEX-SESSION-PROFILES-CUTOVER-01`
- Nombre: `OPS-CODEX-SESSION-PROFILES-CUTOVER-01`
- Commit técnico: `not_applicable`
- Hash técnico: `not_applicable`
- Estado documental: `DOCUMENTACION_PREPARADA`; commit documental `PENDING`.
- Descripción breve: Promueve cinco perfiles Codex definitivos en el entorno externo y consolida una única guía canónica para WSL2, CLI 0.156.1 y Profile V2, sin versionar configuraciones de `~/.codex`.

## 5. OPS-OPERATING-MODEL-EXTERNAL-HITO-CONTRACT-01

- Identificador: `OPS-OPERATING-MODEL-EXTERNAL-HITO-CONTRACT-01`
- Nombre: `OPS-OPERATING-MODEL-EXTERNAL-HITO-CONTRACT-01`
- Commit message: `docs(architecture): define external operational hito contract`
- Hash: `4d18655bb784d1927cb4da6aba327f2613933995`
- Estado documental: `DOCUMENTACION_PREPARADA`; commit documental `PENDING`.
- Descripción breve: Incorpora al Operating Model canónico el discriminador entre cambios versionables y cambios operativos íntegramente externos, con gates trazables distintos y sin crear una fuente normativa paralela.

## 6. FIX-RUNTIME-CREATE-COMPLETE-WORD-DATE-RANGE-INGRESS-01

- Identificador: `FIX-RUNTIME-CREATE-COMPLETE-WORD-DATE-RANGE-INGRESS-01`
- Nombre: `FIX-RUNTIME-CREATE-COMPLETE-WORD-DATE-RANGE-INGRESS-01`
- Commit message: `fix(runtime): reject invalid create dates and preserve checkout on repair`
- Hash: `efc11b21eb1aabbe881250d6fe0556ba16b113c3`
- Descripción breve: Rechaza fechas calendario imposibles antes de availability/propuesta y preserva el checkOut válido al reparar checkIn en flujos multi-turno con historial y Chrono.

## 7. FIX-RUNTIME-RESERVATION-TEMPORAL-CONTEXT-AND-OPERABILITY-01

- Identificador: `FIX-RUNTIME-RESERVATION-TEMPORAL-CONTEXT-AND-OPERABILITY-01`
- Nombre: `FIX-RUNTIME-RESERVATION-TEMPORAL-CONTEXT-AND-OPERABILITY-01`
- Commit message: `fix(runtime): add temporal context to reservation listings`
- Hash: `c578a5272f21d763fbe286751934b853a24de13f`
- Descripción breve: Alinea listado visible y `lastPresentedReservations` con el mismo universo y orden temporal; el contexto sigue siendo referencia derivada y provider conserva la operabilidad de modify/cancel.

## 8. FIX-RUNTIME-CANCEL-CANONICAL-TARGET-VALIDATION-01

- Identificador: `FIX-RUNTIME-CANCEL-CANONICAL-TARGET-VALIDATION-01`
- Nombre: `FIX-RUNTIME-CANCEL-CANONICAL-TARGET-VALIDATION-01`
- Commit message: `fix(runtime): revalidate cancellation target against canonical state`
- Hash: `e87cd783a7738a31d18ff0f32cee68039146565c`
- Descripción breve: Revalida contra Canonical State el target de cancel obtenido por código, ordinal, presentación o foco antes de crear y confirmar `pendingCancellation`; la presentación identifica, pero no autoriza efectos transaccionales.

## 9. HARDEN-RUNTIME-WIPE-DEMO-CM-RESERVATIONS-01

- Identificador: `HARDEN-RUNTIME-WIPE-DEMO-CM-RESERVATIONS-01`
- Nombre: `HARDEN-RUNTIME-WIPE-DEMO-CM-RESERVATIONS-01`
- Commit message: `fix(tooling): harden demo channel manager reservation wipe`
- Hash: `c152e61ce0bfd5a5057970181b7b3618974ff540`
- Descripción breve: Endurece el wipe manual de reservas durables del Channel Manager demo/local: requiere selección explícita, hotel, `--force` y entorno autorizado, y preserva la exclusión del wipe genérico.

## 10. DOC-RELEASE-VERSIONING-BASELINE-POLICY-01

- Identificador: `DOC-RELEASE-VERSIONING-BASELINE-POLICY-01`
- Nombre: `DOC-RELEASE-VERSIONING-BASELINE-POLICY-01`
- Commit message: `docs(architecture): define release versioning and pilot baseline governance`
- Hash: `fecba834e0e31f77ecb670eb82ed3232785cae64`
- Descripción breve: Establece en el Operating Model la política única de branching, SemVer, tags, releases, RCs y pilot baselines, preservando la separación entre hito, versión, tag, deployment y baseline.
