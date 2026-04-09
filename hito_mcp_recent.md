# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-PIPELINE-CANCEL-PERSISTED-RECORD-CANONICAL-ALIGNMENT-05

- Identificador: `FIX-PIPELINE-CANCEL-PERSISTED-RECORD-CANONICAL-ALIGNMENT-05`
- Nombre: `FIX-PIPELINE-CANCEL-PERSISTED-RECORD-CANONICAL-ALIGNMENT-05`
- Commit message: `FIX-PIPELINE-CANCEL-PERSISTED-RECORD-CANONICAL-ALIGNMENT-05 prefer canonical record over reservationSlots in persisted reservation record`
- Hash: `9844c824965a389f87ac7d25b153eae933205aac`
- Descripción breve: Se alinea `buildPersistedReservationRecord(...)` con la jerarquía canónica de reservas, haciendo que el record persistido priorice el canon sobre `reservationSlots`.

## 2. FIX-PIPELINE-POSTACTION-SNAPSHOT-CANONICAL-ALIGNMENT-04

- Identificador: `FIX-PIPELINE-POSTACTION-SNAPSHOT-CANONICAL-ALIGNMENT-04`
- Nombre: `FIX-PIPELINE-POSTACTION-SNAPSHOT-CANONICAL-ALIGNMENT-04`
- Commit message: `FIX-PIPELINE-POSTACTION-SNAPSHOT-CANONICAL-ALIGNMENT-04 align post-create confirmation reply with canonical booking projection`
- Hash: `88f8d80b81c1df8617166ae637e10a216940221a`
- Descripción breve: Se alinea la reply de confirmación post-create con la proyección canónica del booking recién creado, evitando drift entre execution y texto final.

## 3. FIX-PIPELINE-MODIFY-CONTINUATION-CANONICAL-ALIGNMENT-03

- Identificador: `FIX-PIPELINE-MODIFY-CONTINUATION-CANONICAL-ALIGNMENT-03`
- Nombre: `FIX-PIPELINE-MODIFY-CONTINUATION-CANONICAL-ALIGNMENT-03`
- Commit message: `FIX-PIPELINE-MODIFY-CONTINUATION-CANONICAL-ALIGNMENT-03 align modify continuation prompt with canonical reservation projection`
- Hash: `02f55a08df9006a9bd825dcc5a100edc63a57c6e`
- Descripción breve: Se alinea la continuidad auxiliar de `modify` con la jerarquía canónica de reservas, evitando que el prompt o menú de continuación derive sus datos principales desde helpers no canónicos.

## 4. FIX-CI-CORE-BLOCKING-LINT-SCOPE-01

- Identificador: `FIX-CI-CORE-BLOCKING-LINT-SCOPE-01`
- Nombre: `FIX-CI-CORE-BLOCKING-LINT-SCOPE-01`
- Commit message: `FIX-CI-CORE-BLOCKING-LINT-SCOPE-01 make scoped lint advisory until legacy warnings are cleaned`
- Hash: `03bb9bdeb2b281f8a444698220fd4572d28e8d52`
- Descripción breve: Se ajusta `ci-core` para evitar que el scoped lint siga bloqueando el workflow por warnings heredados, manteniendo ese chequeo como observabilidad mientras esa deuda se limpia por separado.

## 5. FIX-CI-CORE-PNPM-VERSION-SOURCE-01

- Identificador: `FIX-CI-CORE-PNPM-VERSION-SOURCE-01`
- Nombre: `FIX-CI-CORE-PNPM-VERSION-SOURCE-01`
- Commit message: `FIX-CI-CORE-PNPM-VERSION-SOURCE-01 use packageManager as single pnpm version source in ci-core`
- Hash: `324d4e8053042131b47c0dfaee16bcddb63c1e1d`
- Descripción breve: Se corrige `ci-core` para que `pnpm` tenga una única fuente de versión en GitHub Actions, evitando conflicto entre la workflow config y `package.json`.

## 6. FIX-PIPELINE-AUXILIARY-FALLBACK-CANONICAL-ALIGNMENT-02

- Identificador: `FIX-PIPELINE-AUXILIARY-FALLBACK-CANONICAL-ALIGNMENT-02`
- Nombre: `FIX-PIPELINE-AUXILIARY-FALLBACK-CANONICAL-ALIGNMENT-02`
- Commit message: `FIX-PIPELINE-AUXILIARY-FALLBACK-CANONICAL-ALIGNMENT-02 align local fallback reply with canonical reservation projection`
- Hash: `9d24f1d58fa4cf5875a4571ea0c45e9ae4e5bd06`
- Descripción breve: Se alinea la ruta auxiliar `buildReservationLocalFallbackReply(...)` con la jerarquía canónica de reservas, evitando que helpers derivados dominen sobre el target real.

## 7. FIX-CI-CORE-PNPM-SETUP-ORDER-01

- Identificador: `FIX-CI-CORE-PNPM-SETUP-ORDER-01`
- Nombre: `FIX-CI-CORE-PNPM-SETUP-ORDER-01`
- Commit message: `FIX-CI-CORE-PNPM-SETUP-ORDER-01 install pnpm before setup-node cache initialization`
- Hash: `c9f21e763ed4720bb065f1714afd6b164ac0b1b2`
- Descripción breve: Se corrige el workflow `ci-core` para que `pnpm` esté disponible antes de que `actions/setup-node` inicialice el cache de dependencias.

## 8. FIX-PIPELINE-AUXILIARY-REPLY-CANONICAL-ALIGNMENT-01

- Identificador: `FIX-PIPELINE-AUXILIARY-REPLY-CANONICAL-ALIGNMENT-01`
- Nombre: `FIX-PIPELINE-AUXILIARY-REPLY-CANONICAL-ALIGNMENT-01`
- Commit message: `FIX-PIPELINE-AUXILIARY-REPLY-CANONICAL-ALIGNMENT-01 align auxiliary reservation reply with canonical target projection`
- Hash: `92a30d1f81b27b7b871ddf5a023547da01edbc8c`
- Descripción breve: Se alinea una reply auxiliar de `reservation` con la jerarquía canónica del runtime, evitando que helpers derivados dominen sobre el target real.

## 9. DOC-ARCHITECTURE-OPERATING-MODEL-FORMALIZATION-01

- Identificador: `DOC-ARCHITECTURE-OPERATING-MODEL-FORMALIZATION-01`
- Nombre: `DOC-ARCHITECTURE-OPERATING-MODEL-FORMALIZATION-01`
- Commit message: `DOC-ARCHITECTURE-OPERATING-MODEL-FORMALIZATION-01 formalize system operating model as explicit governance contract`
- Hash: `7651eeeb793a1f3c41a599d13823d514d54e0b91`
- Descripción breve: Se formaliza `docs/architecture/system_operating_model.md` como contrato explícito de gobernanza operativa del sistema.

## 10. DOC-REPO-README-REPOSITIONING-01

- Identificador: `DOC-REPO-README-REPOSITIONING-01`
- Nombre: `DOC-REPO-README-REPOSITIONING-01`
- Commit message: `DOC-REPO-README-REPOSITIONING-01 rewrite root README as Begasist system overview`
- Hash: `990dac4887e4232da6f8b85e4422e0f147930245`
- Descripción breve: Se reescribe el `README.md` raíz para reposicionarlo como overview actual del sistema Begasist, reemplazando el framing histórico del prototipo anterior.
