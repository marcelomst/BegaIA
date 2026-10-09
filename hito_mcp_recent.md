# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. OPS-HDOC-NONRECURSIVE-CLOSURE-01

- Identificador: `OPS-HDOC-NONRECURSIVE-CLOSURE-01`
- Nombre: `restore non-recursive HDOC postcommit closure`
- Commit tecnico: `93f50b75462949c19ecf921ff290572a84a0d275`.
- Push tecnico: confirmado.
- Estado documental: `DOCUMENTACION_PREPARADA`; contenido final versionable listo para materializacion por Marcelo y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Separa HDOC(1) de HDOC(CLOSE), elimina la persistencia recursiva del self-hash, registra la configuracion operativa externa validada y fortalece la trazabilidad sin impacto en Runtime Map ni roadmap.

## 2. BUG-PROVIDER-OPTIONAL-CONTACTS-NULL-01

- Identificador: `BUG-PROVIDER-OPTIONAL-CONTACTS-NULL-01`
- Nombre: `normalize provider optional contact nullability at the provider/runtime boundary`
- Commit tecnico: `f0d13746986bfc9bec7bb4e81e023bc37f7ca4a6`.
- Push tecnico: confirmado.
- Commit documental: `PENDING`.
- Estado documental: `DOCUMENTACION_PREPARADA`; commit documental `PENDING`.
- Descripcion breve: Normaliza `guestEmail` y `guestPhone` opcionales de `null` a ausencia runtime en el boundary del provider, mantiene campos obligatorios estrictos y autoridad del provider, registra smoke real exitoso y conserva las deudas independientes fuera del scope.

## 3. PILOT-READINESS-RESERVATION-RESPONSE-COMPLETENESS-01

- Identificador: `PILOT-READINESS-RESERVATION-RESPONSE-COMPLETENESS-01`
- Nombre: `complete canonical reservation data projection in observable proposal and post-modify responses`
- Commit tecnico: `16b88e2c9893480e1d36072f7f4eb1d2b82f66ee`.
- Push tecnico: confirmado.
- Commit documental: `9d82d3decb14cefd26904591f10f5ebd62cad9be`.
- Push documental: confirmado.
- Estado documental: `CLOSED`; commit documental `9d82d3decb14cefd26904591f10f5ebd62cad9be`.
- Descripcion breve: Completa la proyeccion observable de propuesta, la consistencia de `lastProposal` y la respuesta post-modify desde la Reservation autoritativa del provider; refresca evidencia fisica del Runtime Map sin cambio conceptual y conserva cuatro deudas independientes fuera del scope.

## 4. PILOT-READINESS-MODIFY-NUMGUESTS-AUTHORITY-01

- Identificador: `PILOT-READINESS-MODIFY-NUMGUESTS-AUTHORITY-01`
- Nombre: `authoritative_numGuests_end_to_end`
- Cadena tecnica: `7dfdfa7d19b16c685b8bbbb8932ccbe256647f15` → `d289914a1b584de2d677ac62ff7ee890e18aadd3`.
- Technical head: `d289914a1b584de2d677ac62ff7ee890e18aadd3`.
- Push tecnico: confirmado para ambos commits.
- Commit documental: `9a9cf654f09257e5497c5fc7155ab4fd3480ec04`.
- Push documental: confirmado.
- Estado documental: `CERRADO`; commit documental `9a9cf654f09257e5497c5fc7155ab4fd3480ec04`.
- Descripcion breve: Materializa `numGuests` como dato autoritativo del provider hasta la proyeccion canonica y `conv_state`, con Astra verificada, Runtime Map fisicamente refrescado sin cambio conceptual, deuda temporal no bloqueante e incidente Git exclusivamente operacional.

## 5. PILOT-READINESS-RUNTIME-MAP-EVIDENCE-REFRESH-01

- Identificador: `PILOT-READINESS-RUNTIME-MAP-EVIDENCE-REFRESH-01`
- Nombre: `PILOT-READINESS-RUNTIME-MAP-EVIDENCE-REFRESH-01`
- Commit tecnico: `93b0cb2852c64ba50f4aa078339f6a4f4f0b58ed`
- Push tecnico: confirmado.
- Commit documental: `6730cc897327ed0df428cd75a807bdb856d54875`
- Push documental: confirmado.
- closure_reconciliation_commit: `988b72a6f917063a8a389ab57f47a76446305320`
- closure_reconciliation_push: confirmado.
- Estado documental: `CERRADO`; commit documental `6730cc897327ed0df428cd75a807bdb856d54875`.
- Descripcion breve: Registra el refresh versionado de evidencia fisica y code refs del Runtime Map, preservando sus 19 box_id, su estructura conceptual, la arquitectura y el runtime; el siguiente hito permanece bloqueado por la precondicion externa Astra sobre `demo_cm_reservations.num_guests` con estado `pending_external_materialization`.

## 6. OM-VISUAL-VIEW-B-HITO-LIFECYCLE-01

- Identificador: `OM-VISUAL-VIEW-B-HITO-LIFECYCLE-01`
- Nombre: `OM-VISUAL-VIEW-B-HITO-LIFECYCLE-01`
- Commit tecnico: `d42a5ce5bf1fe8a617a5a87eaad76647b294ff93`
- Commit documental: `70729dfb0aec5dfb85fb498653d5ec3fd0a70084`
- Push documental: confirmado.
- Estado documental: `CERRADO`; commit documental `70729dfb0aec5dfb85fb498653d5ec3fd0a70084`.
- Descripcion breve: Incorpora e indexa View B INTERNAL como representacion visual derivada y no contractual del lifecycle temporal gobernado de un hito del Operating Model.

## 7. OM-VISUAL-VIEW-C-AUTHORITY-CAPABILITY-BOUNDARIES-01

- Identificador: `OM-VISUAL-VIEW-C-AUTHORITY-CAPABILITY-BOUNDARIES-01`
- Nombre: `OM-VISUAL-VIEW-C-AUTHORITY-CAPABILITY-BOUNDARIES-01`
- Commit tecnico: `5ce594e68577f6ef21f48565b94ef869e0dcd2c0`
- Commit documental: `7a23fe9f7e355f5db1b93bfba6cac96824b7a7e6`
- Push documental: confirmado.
- Estado documental: `CERRADO`; commit documental `7a23fe9f7e355f5db1b93bfba6cac96824b7a7e6`.
- Descripcion breve: Incorpora e indexa View C INTERNAL como representacion visual derivada y no contractual de los limites de authority, capability, permission, gates y acciones protegidas del Operating Model.

## 8. OM-VISUAL-VIEW-A-ROLE-ARCHITECTURE-01

- Identificador: `OM-VISUAL-VIEW-A-ROLE-ARCHITECTURE-01`
- Nombre: `OM-VISUAL-VIEW-A-ROLE-ARCHITECTURE-01`
- Commit tecnico: `adb9546c97bb46faeb5e975305bbc93a1fe97937`
- Commit documental: `d5562d707632fa476026a83a004ad06941d6491b`
- Push documental: confirmado.
- Estado documental: `CERRADO`; commit documental `d5562d707632fa476026a83a004ad06941d6491b`.
- Descripcion breve: Incorpora e indexa View A INTERNAL como representacion visual derivada y no contractual de la arquitectura de roles del Operating Model.

## 9. OM-VISUAL-VIEW-E-CANONICAL-ARCHITECTURE-01

- Identificador: `OM-VISUAL-VIEW-E-CANONICAL-ARCHITECTURE-01`
- Nombre: `OM-VISUAL-VIEW-E-CANONICAL-ARCHITECTURE-01`
- Commit tecnico: `277109f3f2550a9e528e4e032071fb5c009536ea`
- Commit documental: `d11e7ba544c5857637c2afeada414604ff96b129`
- Estado documental: `CERRADO`; commit documental `d11e7ba544c5857637c2afeada414604ff96b129`.
- Descripcion breve: Incorpora e indexa View E INTERNAL como representacion visual derivada y no contractual de la arquitectura documental del Operating Model y sus ambitos de autoridad.

## 10. OPS-OPERATING-MODEL-VISUAL-VIEW-D-PUBLIC-01

- Identificador: `OPS-OPERATING-MODEL-VISUAL-VIEW-D-PUBLIC-01`
- Nombre: `OPS-OPERATING-MODEL-VISUAL-VIEW-D-PUBLIC-01`
- Commit tecnico: `78dc8a399d08e54b4c738cd44742e358027c38f7`
- Commit documental: `540cd5c38686f3eeb95f0eeea274aaf7edf8582b`
- Estado documental: `CERRADO`; commit documental `540cd5c38686f3eeb95f0eeea274aaf7edf8582b`.
- Descripcion breve: Incorpora View D PUBLIC como representacion visual derivada y no contractual del Product System y su gobierno de evolucion.
