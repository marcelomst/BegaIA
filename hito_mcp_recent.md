# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-PIPELINE-MODIFY-CONTINUATION-CANONICAL-ALIGNMENT-03

- Identificador: `FIX-PIPELINE-MODIFY-CONTINUATION-CANONICAL-ALIGNMENT-03`
- Nombre: `FIX-PIPELINE-MODIFY-CONTINUATION-CANONICAL-ALIGNMENT-03`
- Commit message: `FIX-PIPELINE-MODIFY-CONTINUATION-CANONICAL-ALIGNMENT-03 align modify continuation prompt with canonical reservation projection`
- Hash: `02f55a08df9006a9bd825dcc5a100edc63a57c6e`
- Descripción breve: Se alinea la continuidad auxiliar de `modify` con la jerarquía canónica de reservas, evitando que el prompt o menú de continuación derive sus datos principales desde helpers no canónicos.

## 2. FIX-CI-CORE-BLOCKING-LINT-SCOPE-01

- Identificador: `FIX-CI-CORE-BLOCKING-LINT-SCOPE-01`
- Nombre: `FIX-CI-CORE-BLOCKING-LINT-SCOPE-01`
- Commit message: `FIX-CI-CORE-BLOCKING-LINT-SCOPE-01 make scoped lint advisory until legacy warnings are cleaned`
- Hash: `03bb9bdeb2b281f8a444698220fd4572d28e8d52`
- Descripción breve: Se ajusta `ci-core` para evitar que el scoped lint siga bloqueando el workflow por warnings heredados, manteniendo ese chequeo como observabilidad mientras esa deuda se limpia por separado.

## 3. FIX-CI-CORE-PNPM-VERSION-SOURCE-01

- Identificador: `FIX-CI-CORE-PNPM-VERSION-SOURCE-01`
- Nombre: `FIX-CI-CORE-PNPM-VERSION-SOURCE-01`
- Commit message: `FIX-CI-CORE-PNPM-VERSION-SOURCE-01 use packageManager as single pnpm version source in ci-core`
- Hash: `324d4e8053042131b47c0dfaee16bcddb63c1e1d`
- Descripción breve: Se corrige `ci-core` para que `pnpm` tenga una única fuente de versión en GitHub Actions, evitando conflicto entre la workflow config y `package.json`.

## 4. FIX-PIPELINE-AUXILIARY-FALLBACK-CANONICAL-ALIGNMENT-02

- Identificador: `FIX-PIPELINE-AUXILIARY-FALLBACK-CANONICAL-ALIGNMENT-02`
- Nombre: `FIX-PIPELINE-AUXILIARY-FALLBACK-CANONICAL-ALIGNMENT-02`
- Commit message: `FIX-PIPELINE-AUXILIARY-FALLBACK-CANONICAL-ALIGNMENT-02 align local fallback reply with canonical reservation projection`
- Hash: `9d24f1d58fa4cf5875a4571ea0c45e9ae4e5bd06`
- Descripción breve: Se alinea la ruta auxiliar `buildReservationLocalFallbackReply(...)` con la jerarquía canónica de reservas, evitando que helpers derivados dominen sobre el target real.

## 5. FIX-CI-CORE-PNPM-SETUP-ORDER-01

- Identificador: `FIX-CI-CORE-PNPM-SETUP-ORDER-01`
- Nombre: `FIX-CI-CORE-PNPM-SETUP-ORDER-01`
- Commit message: `FIX-CI-CORE-PNPM-SETUP-ORDER-01 install pnpm before setup-node cache initialization`
- Hash: `c9f21e763ed4720bb065f1714afd6b164ac0b1b2`
- Descripción breve: Se corrige el workflow `ci-core` para que `pnpm` esté disponible antes de que `actions/setup-node` inicialice el cache de dependencias.

## 6. FIX-PIPELINE-AUXILIARY-REPLY-CANONICAL-ALIGNMENT-01

- Identificador: `FIX-PIPELINE-AUXILIARY-REPLY-CANONICAL-ALIGNMENT-01`
- Nombre: `FIX-PIPELINE-AUXILIARY-REPLY-CANONICAL-ALIGNMENT-01`
- Commit message: `FIX-PIPELINE-AUXILIARY-REPLY-CANONICAL-ALIGNMENT-01 align auxiliary reservation reply with canonical target projection`
- Hash: `92a30d1f81b27b7b871ddf5a023547da01edbc8c`
- Descripción breve: Se alinea una reply auxiliar de `reservation` con la jerarquía canónica del runtime, evitando que helpers derivados dominen sobre el target real.

## 7. DOC-ARCHITECTURE-OPERATING-MODEL-FORMALIZATION-01

- Identificador: `DOC-ARCHITECTURE-OPERATING-MODEL-FORMALIZATION-01`
- Nombre: `DOC-ARCHITECTURE-OPERATING-MODEL-FORMALIZATION-01`
- Commit message: `DOC-ARCHITECTURE-OPERATING-MODEL-FORMALIZATION-01 formalize system operating model as explicit governance contract`
- Hash: `7651eeeb793a1f3c41a599d13823d514d54e0b91`
- Descripción breve: Se formaliza `docs/architecture/system_operating_model.md` como contrato explícito de gobernanza operativa del sistema.

## 8. DOC-REPO-README-REPOSITIONING-01

- Identificador: `DOC-REPO-README-REPOSITIONING-01`
- Nombre: `DOC-REPO-README-REPOSITIONING-01`
- Commit message: `DOC-REPO-README-REPOSITIONING-01 rewrite root README as Begasist system overview`
- Hash: `990dac4887e4232da6f8b85e4422e0f147930245`
- Descripción breve: Se reescribe el `README.md` raíz para reposicionarlo como overview actual del sistema Begasist, reemplazando el framing histórico del prototipo anterior.

## 9. DOC-HISTORY-RECENT-HITO-SNAPSHOT-01

- Identificador: `DOC-HISTORY-RECENT-HITO-SNAPSHOT-01`
- Nombre: `DOC-HISTORY-RECENT-HITO-SNAPSHOT-01`
- Commit message: `DOC-HISTORY-RECENT-HITO-SNAPSHOT-01 version recent hito snapshot for operational context`
- Hash: `3409fcc6865a419df1f10f854b060773e29e8f4f`
- Descripción breve: Se versiona `hito_mcp_recent.md` como recorte operativo de historial reciente, sin reemplazar el historial completo de `hito_mcp.md`.

## 10. DOC-REPO-LEGACY-DOCUMENT-ARCHIVE-01

- Identificador: `DOC-REPO-LEGACY-DOCUMENT-ARCHIVE-01`
- Nombre: `DOC-REPO-LEGACY-DOCUMENT-ARCHIVE-01`
- Commit message: `DOC-REPO-LEGACY-DOCUMENT-ARCHIVE-01 archive legacy root documents into _legacy`
- Hash: `198d7ce408563b4a9994889f22958cf92a98dbcb`
- Descripción breve: Se limpia la raíz del repo archivando documentación legacy en `_legacy/`, sin mezclar runtime ni reescrituras documentales activas.
