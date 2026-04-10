# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-PIPELINE-CREATE-NAME-GATING-09

- Identificador: `FIX-PIPELINE-CREATE-NAME-GATING-09`
- Nombre: `FIX-PIPELINE-CREATE-NAME-GATING-09`
- Commit message: `FIX-PIPELINE-CREATE-NAME-GATING-09 capture inline guestName and gate create when only the name is missing`
- Hash: `b6686cb8240b6c30b9de228c84b437ea4bbb8127`
- Descripción breve: Se corrige la captura y el gating de `guestName` en el flujo `create`, evitando caída a fallback genérico cuando el único faltante es el nombre del huésped.

## 2. FIX-PIPELINE-MODIFY-TARGET-CONTINUITY-07

- Identificador: `FIX-PIPELINE-MODIFY-TARGET-CONTINUITY-07`
- Nombre: `FIX-PIPELINE-MODIFY-TARGET-CONTINUITY-07`
- Commit message: `FIX-PIPELINE-MODIFY-TARGET-CONTINUITY-07 preserve modify target across compatible lateral turns`
- Hash: `11058f0e19a8ddb4741df137c48a0af92e854540`
- Descripción breve: Se preserva el target de reserva en `modify` ante interacciones laterales compatibles, evitando pérdida de foco y repregunta de selección.

## 3. FIX-PIPELINE-CREATE-VS-MODIFY-DOMINANCE-RESOLUTION-06

- Identificador: `FIX-PIPELINE-CREATE-VS-MODIFY-DOMINANCE-RESOLUTION-06`
- Nombre: `FIX-PIPELINE-CREATE-VS-MODIFY-DOMINANCE-RESOLUTION-06`
- Commit message: `FIX-PIPELINE-CREATE-VS-MODIFY-DOMINANCE-RESOLUTION-06 prefer explicit create over incompatible modify continuity`
- Hash: `97e788fc7bb0fa04fe31fe9c62d9cc3fd24003d9`
- Descripción breve: Se corrige la dominancia entre `create` explícito y continuidad previa de `modify`, asegurando que una nueva reserva con payload suficiente no sea degradada a modificación de una reserva existente.

## 4. FIX-PIPELINE-CANCEL-PERSISTED-RECORD-CANONICAL-ALIGNMENT-05

- Identificador: `FIX-PIPELINE-CANCEL-PERSISTED-RECORD-CANONICAL-ALIGNMENT-05`
- Nombre: `FIX-PIPELINE-CANCEL-PERSISTED-RECORD-CANONICAL-ALIGNMENT-05`
- Commit message: `FIX-PIPELINE-CANCEL-PERSISTED-RECORD-CANONICAL-ALIGNMENT-05 prefer canonical record over reservationSlots in persisted reservation record`
- Hash: `9844c824965a389f87ac7d25b153eae933205aac`
- Descripción breve: Se alinea `buildPersistedReservationRecord(...)` con la jerarquía canónica de reservas, haciendo que el record persistido priorice el canon sobre `reservationSlots`.

## 5. FIX-PIPELINE-POSTACTION-SNAPSHOT-CANONICAL-ALIGNMENT-04

- Identificador: `FIX-PIPELINE-POSTACTION-SNAPSHOT-CANONICAL-ALIGNMENT-04`
- Nombre: `FIX-PIPELINE-POSTACTION-SNAPSHOT-CANONICAL-ALIGNMENT-04`
- Commit message: `FIX-PIPELINE-POSTACTION-SNAPSHOT-CANONICAL-ALIGNMENT-04 align post-create confirmation reply with canonical booking projection`
- Hash: `88f8d80b81c1df8617166ae637e10a216940221a`
- Descripción breve: Se alinea la reply de confirmación post-create con la proyección canónica del booking recién creado, evitando drift entre execution y texto final.

## 6. FIX-PIPELINE-MODIFY-CONTINUATION-CANONICAL-ALIGNMENT-03

- Identificador: `FIX-PIPELINE-MODIFY-CONTINUATION-CANONICAL-ALIGNMENT-03`
- Nombre: `FIX-PIPELINE-MODIFY-CONTINUATION-CANONICAL-ALIGNMENT-03`
- Commit message: `FIX-PIPELINE-MODIFY-CONTINUATION-CANONICAL-ALIGNMENT-03 align modify continuation prompt with canonical reservation projection`
- Hash: `02f55a08df9006a9bd825dcc5a100edc63a57c6e`
- Descripción breve: Se alinea la continuidad auxiliar de `modify` con la jerarquía canónica de reservas, evitando que el prompt o menú de continuación derive sus datos principales desde helpers no canónicos.

## 7. FIX-CI-CORE-BLOCKING-LINT-SCOPE-01

- Identificador: `FIX-CI-CORE-BLOCKING-LINT-SCOPE-01`
- Nombre: `FIX-CI-CORE-BLOCKING-LINT-SCOPE-01`
- Commit message: `FIX-CI-CORE-BLOCKING-LINT-SCOPE-01 make scoped lint advisory until legacy warnings are cleaned`
- Hash: `03bb9bdeb2b281f8a444698220fd4572d28e8d52`
- Descripción breve: Se ajusta `ci-core` para evitar que el scoped lint siga bloqueando el workflow por warnings heredados, manteniendo ese chequeo como observabilidad mientras esa deuda se limpia por separado.

## 8. FIX-CI-CORE-PNPM-VERSION-SOURCE-01

- Identificador: `FIX-CI-CORE-PNPM-VERSION-SOURCE-01`
- Nombre: `FIX-CI-CORE-PNPM-VERSION-SOURCE-01`
- Commit message: `FIX-CI-CORE-PNPM-VERSION-SOURCE-01 use packageManager as single pnpm version source in ci-core`
- Hash: `324d4e8053042131b47c0dfaee16bcddb63c1e1d`
- Descripción breve: Se corrige `ci-core` para que `pnpm` tenga una única fuente de versión en GitHub Actions, evitando conflicto entre la workflow config y `package.json`.

## 9. FIX-PIPELINE-AUXILIARY-FALLBACK-CANONICAL-ALIGNMENT-02

- Identificador: `FIX-PIPELINE-AUXILIARY-FALLBACK-CANONICAL-ALIGNMENT-02`
- Nombre: `FIX-PIPELINE-AUXILIARY-FALLBACK-CANONICAL-ALIGNMENT-02`
- Commit message: `FIX-PIPELINE-AUXILIARY-FALLBACK-CANONICAL-ALIGNMENT-02 align local fallback reply with canonical reservation projection`
- Hash: `9d24f1d58fa4cf5875a4571ea0c45e9ae4e5bd06`
- Descripción breve: Se alinea la ruta auxiliar `buildReservationLocalFallbackReply(...)` con la jerarquía canónica de reservas, evitando que helpers derivados dominen sobre el target real.

## 10. FIX-CI-CORE-PNPM-SETUP-ORDER-01

- Identificador: `FIX-CI-CORE-PNPM-SETUP-ORDER-01`
- Nombre: `FIX-CI-CORE-PNPM-SETUP-ORDER-01`
- Commit message: `FIX-CI-CORE-PNPM-SETUP-ORDER-01 install pnpm before setup-node cache initialization`
- Hash: `c9f21e763ed4720bb065f1714afd6b164ac0b1b2`
- Descripción breve: Se corrige el workflow `ci-core` para que `pnpm` esté disponible antes de que `actions/setup-node` inicialice el cache de dependencias.
