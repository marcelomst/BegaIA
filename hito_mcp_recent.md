# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-CI-CORE-PNPM-SETUP-ORDER-01

- Identificador: `FIX-CI-CORE-PNPM-SETUP-ORDER-01`
- Nombre: `FIX-CI-CORE-PNPM-SETUP-ORDER-01`
- Commit message: `FIX-CI-CORE-PNPM-SETUP-ORDER-01 install pnpm before setup-node cache initialization`
- Hash: `c9f21e763ed4720bb065f1714afd6b164ac0b1b2`
- Descripción breve: Se corrige el workflow `ci-core` para que `pnpm` esté disponible antes de que `actions/setup-node` inicialice el cache de dependencias.

## 2. FIX-PIPELINE-AUXILIARY-REPLY-CANONICAL-ALIGNMENT-01

- Identificador: `FIX-PIPELINE-AUXILIARY-REPLY-CANONICAL-ALIGNMENT-01`
- Nombre: `FIX-PIPELINE-AUXILIARY-REPLY-CANONICAL-ALIGNMENT-01`
- Commit message: `FIX-PIPELINE-AUXILIARY-REPLY-CANONICAL-ALIGNMENT-01 align auxiliary reservation reply with canonical target projection`
- Hash: `92a30d1f81b27b7b871ddf5a023547da01edbc8c`
- Descripción breve: Se alinea una reply auxiliar de `reservation` con la jerarquía canónica del runtime, evitando que helpers derivados dominen sobre el target real.

## 3. DOC-ARCHITECTURE-OPERATING-MODEL-FORMALIZATION-01

- Identificador: `DOC-ARCHITECTURE-OPERATING-MODEL-FORMALIZATION-01`
- Nombre: `DOC-ARCHITECTURE-OPERATING-MODEL-FORMALIZATION-01`
- Commit message: `DOC-ARCHITECTURE-OPERATING-MODEL-FORMALIZATION-01 formalize system operating model as explicit governance contract`
- Hash: `7651eeeb793a1f3c41a599d13823d514d54e0b91`
- Descripción breve: Se formaliza `docs/architecture/system_operating_model.md` como contrato explícito de gobernanza operativa del sistema.

## 4. DOC-REPO-README-REPOSITIONING-01

- Identificador: `DOC-REPO-README-REPOSITIONING-01`
- Nombre: `DOC-REPO-README-REPOSITIONING-01`
- Commit message: `DOC-REPO-README-REPOSITIONING-01 rewrite root README as Begasist system overview`
- Hash: `990dac4887e4232da6f8b85e4422e0f147930245`
- Descripción breve: Se reescribe el `README.md` raíz para reposicionarlo como overview actual del sistema Begasist, reemplazando el framing histórico del prototipo anterior.

## 5. DOC-HISTORY-RECENT-HITO-SNAPSHOT-01

- Identificador: `DOC-HISTORY-RECENT-HITO-SNAPSHOT-01`
- Nombre: `DOC-HISTORY-RECENT-HITO-SNAPSHOT-01`
- Commit message: `DOC-HISTORY-RECENT-HITO-SNAPSHOT-01 version recent hito snapshot for operational context`
- Hash: `3409fcc6865a419df1f10f854b060773e29e8f4f`
- Descripción breve: Se versiona `hito_mcp_recent.md` como recorte operativo de historial reciente, sin reemplazar el historial completo de `hito_mcp.md`.

## 6. DOC-REPO-LEGACY-DOCUMENT-ARCHIVE-01

- Identificador: `DOC-REPO-LEGACY-DOCUMENT-ARCHIVE-01`
- Nombre: `DOC-REPO-LEGACY-DOCUMENT-ARCHIVE-01`
- Commit message: `DOC-REPO-LEGACY-DOCUMENT-ARCHIVE-01 archive legacy root documents into _legacy`
- Hash: `198d7ce408563b4a9994889f22958cf92a98dbcb`
- Descripción breve: Se limpia la raíz del repo archivando documentación legacy en `_legacy/`, sin mezclar runtime ni reescrituras documentales activas.

## 7. FIX-SNAPSHOT-AUXILIARY-ROUTES-CANONICAL-ALIGNMENT-01

- Identificador: `FIX-SNAPSHOT-AUXILIARY-ROUTES-CANONICAL-ALIGNMENT-01`
- Nombre: `FIX-SNAPSHOT-AUXILIARY-ROUTES-CANONICAL-ALIGNMENT-01`
- Commit message: `FIX-SNAPSHOT-AUXILIARY-ROUTES-CANONICAL-ALIGNMENT-01 prefer canonical reservation projection in post-booking snapshot fast-path`
- Hash: `180023677027dbb0cf8f12bf53ce735e7d95821d`
- Descripción breve: Se corrige el fast-path auxiliar de snapshot post-booking para que priorice la proyección canónica de reserva y no deje que `reservationSlots` domine sobre el target real.

## 8. DOC-ARCHITECTURE-DOC-GOVERNANCE-TAXONOMY-01

- Identificador: `DOC-ARCHITECTURE-DOC-GOVERNANCE-TAXONOMY-01`
- Nombre: `DOC-ARCHITECTURE-DOC-GOVERNANCE-TAXONOMY-01`
- Commit message: `DOC-ARCHITECTURE-DOC-GOVERNANCE-TAXONOMY-01 align doc governance, taxonomy and ADR naming`
- Hash: `823c1a70dbe1df55bd578bd1a4891fed9ee64852`
- Descripción breve: Se ordena la gobernanza documental y la taxonomía de `docs/architecture/`, normalizando naming de ADRs y reforzando la separación entre operación, ADRs, arquitectura viva y artefactos derivados.

## 9. FIX-REFERENCE-AMBIGUOUS-ANAPHORA-GATING-01

- Identificador: `FIX-REFERENCE-AMBIGUOUS-ANAPHORA-GATING-01`
- Nombre: `FIX-REFERENCE-AMBIGUOUS-ANAPHORA-GATING-01`
- Commit message: `FIX-REFERENCE-AMBIGUOUS-ANAPHORA-GATING-01 block ambiguous 'esa' resolution without prior valid selection`
- Hash: `c0797154bdca9c1d5f596b1114cdd7bd45b69a8e`
- Descripción breve: Se corrige la resolución indebida de anáforas ambiguas como `esa` cuando no existe selección previa válida y hay múltiples reservas candidatas.

## 10. FIX-SNAPSHOT-TARGET-DATA-CONSISTENCY-01

- Identificador: `FIX-SNAPSHOT-TARGET-DATA-CONSISTENCY-01`
- Nombre: `FIX-SNAPSHOT-TARGET-DATA-CONSISTENCY-01`
- Commit message: `FIX-SNAPSHOT-TARGET-DATA-CONSISTENCY-01 sync reservationSlots after cancel to keep snapshot target data consistent`
- Hash: `3f8ec03987bc073f36a9f7a067d3c719948dc638`
- Descripción breve: Se corrige consistencia de snapshot posterior a cancelación, evitando mezcla de datos entre reservas cuando el snapshot se arma después de confirmar una cancelación.
