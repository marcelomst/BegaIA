# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-RUNTIME-RESERVATION-TEMPORAL-CONTEXT-AND-OPERABILITY-01

- Identificador: `FIX-RUNTIME-RESERVATION-TEMPORAL-CONTEXT-AND-OPERABILITY-01`
- Nombre: `FIX-RUNTIME-RESERVATION-TEMPORAL-CONTEXT-AND-OPERABILITY-01`
- Commit message: `fix(runtime): add temporal context to reservation listings`
- Hash: `c578a5272f21d763fbe286751934b853a24de13f`
- Descripción breve: Alinea listado visible y `lastPresentedReservations` con el mismo universo y orden temporal; el contexto sigue siendo referencia derivada y provider conserva la operabilidad de modify/cancel.

## 2. FIX-RUNTIME-CANCEL-CANONICAL-TARGET-VALIDATION-01

- Identificador: `FIX-RUNTIME-CANCEL-CANONICAL-TARGET-VALIDATION-01`
- Nombre: `FIX-RUNTIME-CANCEL-CANONICAL-TARGET-VALIDATION-01`
- Commit message: `fix(runtime): revalidate cancellation target against canonical state`
- Hash: `e87cd783a7738a31d18ff0f32cee68039146565c`
- Descripción breve: Revalida contra Canonical State el target de cancel obtenido por código, ordinal, presentación o foco antes de crear y confirmar `pendingCancellation`; la presentación identifica, pero no autoriza efectos transaccionales.

## 3. HARDEN-RUNTIME-WIPE-DEMO-CM-RESERVATIONS-01

- Identificador: `HARDEN-RUNTIME-WIPE-DEMO-CM-RESERVATIONS-01`
- Nombre: `HARDEN-RUNTIME-WIPE-DEMO-CM-RESERVATIONS-01`
- Commit message: `fix(tooling): harden demo channel manager reservation wipe`
- Hash: `c152e61ce0bfd5a5057970181b7b3618974ff540`
- Descripción breve: Endurece el wipe manual de reservas durables del Channel Manager demo/local: requiere selección explícita, hotel, `--force` y entorno autorizado, y preserva la exclusión del wipe genérico.

## 4. DOC-RELEASE-VERSIONING-BASELINE-POLICY-01

- Identificador: `DOC-RELEASE-VERSIONING-BASELINE-POLICY-01`
- Nombre: `DOC-RELEASE-VERSIONING-BASELINE-POLICY-01`
- Commit message: `docs(architecture): define release versioning and pilot baseline governance`
- Hash: `fecba834e0e31f77ecb670eb82ed3232785cae64`
- Descripción breve: Establece en el Operating Model la política única de branching, SemVer, tags, releases, RCs y pilot baselines, preservando la separación entre hito, versión, tag, deployment y baseline.

## 5. FIX-RUNTIME-RESERVATION-MODIFY-REPRICE-CONSISTENCY-01

- Identificador: `FIX-RUNTIME-RESERVATION-MODIFY-REPRICE-CONSISTENCY-01`
- Nombre: `FIX-RUNTIME-RESERVATION-MODIFY-REPRICE-CONSISTENCY-01`
- Commit message: `fix(runtime): enforce modify quote pricing consistency`
- Hash: `63045d886fa3410e60bfa428b9b92feb69d768d0`
- Descripción breve: Exige quote vigente de provider para modify, liga confirmación a `quoteId`/`quoteVersion`, bloquea mutaciones stale y requiere re-quote con segunda confirmación antes del update durable.

## 6. UPDATE-DEMO-COMMERCIAL-SPEECH-01

- Identificador: `UPDATE-DEMO-COMMERCIAL-SPEECH-01`
- Nombre: `UPDATE-DEMO-COMMERCIAL-SPEECH-01`
- Commit message: `docs(demo): refine commercial presentation speech`
- Hash: `5a2efa585a624479de3474d1ebb564b3cc6bed5e`
- Descripción breve: Refina el speech comercial del demo, separa Channel Manager de canales conversacionales y conserva la estructura de escenas compatible con el parser, sin cambios funcionales.

## 7. FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01

- Identificador: `FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01`
- Nombre: `FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01`
- Commit message: `fix(runtime): preserve complete reservation snapshot after modify`
- Hash: `3bb821a3240fcf92aebae3424ebde4ba92699780`
- Descripción breve: Preserva el snapshot completo tras modify mediante hidratación local de la misma reserva, dominancia de la confirmada actual y fallback guest-wide acotado; cierre Runtime Map diferido sin degradar la baseline más nueva.

## 8. TECH-TEST-CORE-BASELINE-RECOVERY-01

- Identificador: `TECH-TEST-CORE-BASELINE-RECOVERY-01`
- Nombre: `TECH-TEST-CORE-BASELINE-RECOVERY-01`
- Commit message: `fix(runtime): restore core baseline and honor modify exit`
- Hash: `0b8543ac6bc7c64cdb52fc5a7832d2294bb5e26f`
- Descripción breve: Recupera la baseline core y resuelve la salida explícita de `modify` antes del fast-path, sin reabrir el menú ni alterar intents modify válidos; refresca Runtime Map V1.

## 9. FIX-DEMO-CHANNEL-MANAGER-RESERVATION-DURABILITY-01

- Identificador: `FIX-DEMO-CHANNEL-MANAGER-RESERVATION-DURABILITY-01`
- Nombre: `FIX-DEMO-CHANNEL-MANAGER-RESERVATION-DURABILITY-01`
- Commit message: `fix(demo): persist channel manager reservations in Astra`
- Hash: `dc8e92a32ad4a57985fb51db0f84e1006ce2b9c8`
- Descripción breve: Sustituye el store volátil del Channel Manager demo/local por la tabla Astra `demo_cm_reservations`, aislada por hotel; preserva `conv_state` como proyección conversacional.

## 10. FIX-RUNTIME-RESERVATION-SNAPSHOT-GUEST-CONTINUITY-01

- Identificador: `FIX-RUNTIME-RESERVATION-SNAPSHOT-GUEST-CONTINUITY-01`
- Nombre: `FIX-RUNTIME-RESERVATION-SNAPSHOT-GUEST-CONTINUITY-01`
- Commit message: `fix(runtime): preserve guest-wide reservation reference continuity`
- Hash: `84ec3d229104c3e4e3bf6e0047f262fcc11b229d`
- Descripción breve: Extiende snapshot al guest canónico entre conversaciones y canales, preserva la dominancia de la reserva actual y resuelve referencias y target para preview/modify gobernado, con refresh de Runtime Map V1.
