# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

recent_hitos_count: 10

## 1. SEC-01

- Identificador: `SEC-01`
- Nombre: `credential logging containment`
- Commit tecnico: `399dd8b8105504b77bbe3a408c064fc5980c1452`.
- Push tecnico: confirmado.
- Estado documental: `DOCUMENTACION_PREPARADA`; contenido final versionable listo para materializacion por Marcelo y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Centraliza la sanitizacion del mirror global, protege las cinco salidas de consola y `debug/log.txt`, conserva tres fallos temporales preexistentes fuera del alcance y separa el cierre tecnico de las acciones operativas sobre claves o logs historicos.

## 2. BUG-RESERVATION-GUESTNAME-RAW-OVERRIDE-01

- Identificador: `BUG-RESERVATION-GUESTNAME-RAW-OVERRIDE-01`
- Nombre: `preserve canonical reservation guestName from proposal through confirmed create`
- Commit tecnico: `a06e3f92258a8aaecbbddc4040a318029401a2f6`.
- Push tecnico: confirmado.
- Estado documental: `DOCUMENTACION_PREPARADA`; contenido final versionable listo para materializacion por Marcelo y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Elimina la reinyeccion tardia de `msg.content`, preserva `reservationSlots.guestName` desde la propuesta hasta el create confirmado, registra smoke manual PASS y refresca referencias fisicas del box estable de create sin cambio conceptual.

## 3. OPS-HDOC-NONRECURSIVE-CLOSURE-01

- Identificador: `OPS-HDOC-NONRECURSIVE-CLOSURE-01`
- Nombre: `restore non-recursive HDOC postcommit closure`
- Commit tecnico: `93f50b75462949c19ecf921ff290572a84a0d275`.
- Push tecnico: confirmado.
- Estado documental: `DOCUMENTACION_PREPARADA`; contenido final versionable listo para materializacion por Marcelo y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Separa HDOC(1) de HDOC(CLOSE), elimina la persistencia recursiva del self-hash, registra la configuracion operativa externa validada y fortalece la trazabilidad sin impacto en Runtime Map ni roadmap.

## 4. BUG-PROVIDER-OPTIONAL-CONTACTS-NULL-01

- Identificador: `BUG-PROVIDER-OPTIONAL-CONTACTS-NULL-01`
- Nombre: `normalize provider optional contact nullability at the provider/runtime boundary`
- Commit tecnico: `f0d13746986bfc9bec7bb4e81e023bc37f7ca4a6`.
- Push tecnico: confirmado.
- Commit documental: `PENDING`.
- Estado documental: `DOCUMENTACION_PREPARADA`; commit documental `PENDING`.
- Descripcion breve: Normaliza `guestEmail` y `guestPhone` opcionales de `null` a ausencia runtime en el boundary del provider, mantiene campos obligatorios estrictos y autoridad del provider, registra smoke real exitoso y conserva las deudas independientes fuera del scope.

## 5. PILOT-READINESS-RESERVATION-RESPONSE-COMPLETENESS-01

- Identificador: `PILOT-READINESS-RESERVATION-RESPONSE-COMPLETENESS-01`
- Nombre: `complete canonical reservation data projection in observable proposal and post-modify responses`
- Commit tecnico: `16b88e2c9893480e1d36072f7f4eb1d2b82f66ee`.
- Push tecnico: confirmado.
- Commit documental: `9d82d3decb14cefd26904591f10f5ebd62cad9be`.
- Push documental: confirmado.
- Estado documental: `CLOSED`; commit documental `9d82d3decb14cefd26904591f10f5ebd62cad9be`.
- Descripcion breve: Completa la proyeccion observable de propuesta, la consistencia de `lastProposal` y la respuesta post-modify desde la Reservation autoritativa del provider; refresca evidencia fisica del Runtime Map sin cambio conceptual y conserva cuatro deudas independientes fuera del scope.

## 6. PILOT-READINESS-MODIFY-NUMGUESTS-AUTHORITY-01

- Identificador: `PILOT-READINESS-MODIFY-NUMGUESTS-AUTHORITY-01`
- Nombre: `authoritative_numGuests_end_to_end`
- Cadena tecnica: `7dfdfa7d19b16c685b8bbbb8932ccbe256647f15` → `d289914a1b584de2d677ac62ff7ee890e18aadd3`.
- Technical head: `d289914a1b584de2d677ac62ff7ee890e18aadd3`.
- Push tecnico: confirmado para ambos commits.
- Commit documental: `9a9cf654f09257e5497c5fc7155ab4fd3480ec04`.
- Push documental: confirmado.
- Estado documental: `CERRADO`; commit documental `9a9cf654f09257e5497c5fc7155ab4fd3480ec04`.
- Descripcion breve: Materializa `numGuests` como dato autoritativo del provider hasta la proyeccion canonica y `conv_state`, con Astra verificada, Runtime Map fisicamente refrescado sin cambio conceptual, deuda temporal no bloqueante e incidente Git exclusivamente operacional.

## 7. PILOT-READINESS-RUNTIME-MAP-EVIDENCE-REFRESH-01

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

## 8. OM-VISUAL-VIEW-B-HITO-LIFECYCLE-01

- Identificador: `OM-VISUAL-VIEW-B-HITO-LIFECYCLE-01`
- Nombre: `OM-VISUAL-VIEW-B-HITO-LIFECYCLE-01`
- Commit tecnico: `d42a5ce5bf1fe8a617a5a87eaad76647b294ff93`
- Commit documental: `70729dfb0aec5dfb85fb498653d5ec3fd0a70084`
- Push documental: confirmado.
- Estado documental: `CERRADO`; commit documental `70729dfb0aec5dfb85fb498653d5ec3fd0a70084`.
- Descripcion breve: Incorpora e indexa View B INTERNAL como representacion visual derivada y no contractual del lifecycle temporal gobernado de un hito del Operating Model.

## 9. OM-VISUAL-VIEW-C-AUTHORITY-CAPABILITY-BOUNDARIES-01

- Identificador: `OM-VISUAL-VIEW-C-AUTHORITY-CAPABILITY-BOUNDARIES-01`
- Nombre: `OM-VISUAL-VIEW-C-AUTHORITY-CAPABILITY-BOUNDARIES-01`
- Commit tecnico: `5ce594e68577f6ef21f48565b94ef869e0dcd2c0`
- Commit documental: `7a23fe9f7e355f5db1b93bfba6cac96824b7a7e6`
- Push documental: confirmado.
- Estado documental: `CERRADO`; commit documental `7a23fe9f7e355f5db1b93bfba6cac96824b7a7e6`.
- Descripcion breve: Incorpora e indexa View C INTERNAL como representacion visual derivada y no contractual de los limites de authority, capability, permission, gates y acciones protegidas del Operating Model.

## 10. OM-VISUAL-VIEW-A-ROLE-ARCHITECTURE-01

- Identificador: `OM-VISUAL-VIEW-A-ROLE-ARCHITECTURE-01`
- Nombre: `OM-VISUAL-VIEW-A-ROLE-ARCHITECTURE-01`
- Commit tecnico: `adb9546c97bb46faeb5e975305bbc93a1fe97937`
- Commit documental: `d5562d707632fa476026a83a004ad06941d6491b`
- Push documental: confirmado.
- Estado documental: `CERRADO`; commit documental `d5562d707632fa476026a83a004ad06941d6491b`.
- Descripcion breve: Incorpora e indexa View A INTERNAL como representacion visual derivada y no contractual de la arquitectura de roles del Operating Model.
