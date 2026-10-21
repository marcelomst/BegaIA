# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

recent_hitos_count: 10

## 1. FIX-MODIFY-CANCEL-PRECEDENCE-01

- Identificador: `FIX-MODIFY-CANCEL-PRECEDENCE-01`
- Nombre: `arbitrate modify preview cancellation`
- Commit tecnico: `0da07bc606a962a0ce39c9e924e158435a520e83`.
- Push tecnico: confirmado.
- Commit documental: `PENDING`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Corrige la precedencia de cancelar sobre un preview de modificacion pendiente, conserva target y slots canonicos, mantiene confirmaciones mutuamente excluyentes y refresca los rangos top-level del Runtime Map sin cambio conceptual; O1 y O2 quedan fuera de alcance.

## 2. FIX-RESERVATION-CANCEL-MCP-RESULT-VALIDATION-01

- Identificador: `FIX-RESERVATION-CANCEL-MCP-RESULT-VALIDATION-01`
- Nombre: `validate provider cancellation result fail-closed`
- Commit tecnico: `7111f9aa6f039f4fc12f881b8f661499cea23a94`.
- Push tecnico: confirmado.
- Commit documental: `PENDING`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Valida fail-closed el resultado del proveedor en `cancelReservationTool`; solo acepta una `Reservation` canonica con `hotelId` y `reservationId` coincidentes y `status` exactamente `cancelled`, sin cambios arquitectonicos ni refresh del Runtime Map.

## 3. FIX-RESERVATION-PROPOSAL-FRESH-STATE-CAS-01

- Identificador: `FIX-RESERVATION-PROPOSAL-FRESH-STATE-CAS-01`
- Nombre: `enforce newest-wins reservation proposal publication with logical turn revision`
- Commit tecnico: `cbf72a9f7cbc701faaea424ad474a08a49b8e7d1`.
- Push tecnico: confirmado.
- Commit documental: `PENDING`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Corrige la inicializacion y publicacion concurrente de propuestas `reservation.create` mediante revision logica del turno, conserva `conv_state` como unica fuente canonica y refresca los rangos top-level del Runtime Map sin cambiar cajas ni arquitectura conceptual.

## 4. OPS-02-GIT-WRITE-CONTRACT-01

- Identificador: `OPS-02-GIT-WRITE-CONTRACT-01`
- Nombre: `establish canonical three-phase Git write contract`
- Commit tecnico: `7ad995a18851e404072ccf4fba79cf60b126abb0`.
- Push tecnico: confirmado.
- Commit documental: `PENDING`.
- Estado documental: `DOCUMENTACION_PREPARADA`; commit documental `PENDING` y cierre sujeto a validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Establece el contrato canonico de Git write en tres fases independientes y fail-closed bajo autoridad exclusiva de AH, con validacion exacta de staging, commit, residual y publicacion remota, sin duplicar la fuente normativa del Operating Model.

## 5. PERS-02

- Identificador: `PERS-02`
- Nombre: `preserve rich deterministic create proposals`
- Cadena tecnica: `229bf02fa8db71fe8ef84357e66cb1d4441729b9` → `7cb9178bc03277a0e54cb8b8bb350627cf793220`.
- Technical head: `7cb9178bc03277a0e54cb8b8bb350627cf793220`.
- Push tecnico: confirmado.
- Estado documental: `DOCUMENTACION_PREPARADA`; contenido final versionable listo para materializacion por Marcelo y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Preserva propuestas ricas durante `reservation.create` deterministico, publica y finaliza `lastProposal` mediante CAS de identidad completa, bloquea confirmaciones invalidas o stale, mantiene continuidad tras consultas laterales y refresca evidencia fisica focal sin cambio conceptual ni afirmacion de frescura global.

## 6. OPS-01

- Identificador: `OPS-01`
- Nombre: `restore agent transition closure flow`
- Commit tecnico: `94e8b8166f2ad6123c1158aaa84c10ccf7725aa7`.
- Push tecnico: confirmado.
- Estado documental: `DOCUMENTACION_PREPARADA`; contenido final versionable listo para materializacion por Marcelo y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Restablece el circuito `Guardian -> AH -> Guardian -> HDOC -> AH -> HDOC` mediante envelopes de retorno autocontenidos, autoridad Git write exclusiva de Marcelo y validacion postcommit read-only; consolida el contrato operativo sin impacto en Runtime Map ni roadmap.

## 7. PERS-01

- Identificador: `PERS-01`
- Nombre: `preserve rich Graph proposal metadata`
- Commit tecnico: `de07879f0cc1d69510c5ad87f7f744054ea5d788`.
- Push tecnico: confirmado.
- Estado documental: `DOCUMENTACION_PREPARADA`; contenido final versionable listo para materializacion por Marcelo y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Preserva la metadata rica de `lastProposal` para propuestas atribuidas a la invocacion Graph actual mediante relectura canonica y CAS exclusivo sobre `lastProposal.text`; registra evidencia focal y Astra aceptada, y refresca dos boxes estables sin cambio conceptual ni afirmacion de frescura global.

## 8. LAT-01

- Identificador: `LAT-01`
- Nombre: `canonical LLM retry policy`
- Commit tecnico: `9a46b5f9007ccb204e6982e05c72571ffd8c44da`.
- Push tecnico: confirmado.
- Estado documental: `DOCUMENTACION_PREPARADA`; contenido final versionable listo para materializacion por Marcelo y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Centraliza la clasificacion de errores LLM permanentes de cuota o billing, corta antes del segundo intento en `fillSlotsWithLLM` y `tryStructuredAnalyze`, preserva retries transitorios y fallbacks, registra 13/13 pruebas focales y 76/77 de paridad, y refresca evidencia fisica focal del Runtime Map sin cambio conceptual ni afirmacion de frescura global.

## 9. SEC-01

- Identificador: `SEC-01`
- Nombre: `credential logging containment`
- Commit tecnico: `399dd8b8105504b77bbe3a408c064fc5980c1452`.
- Push tecnico: confirmado.
- Estado documental: `DOCUMENTACION_PREPARADA`; contenido final versionable listo para materializacion por Marcelo y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Centraliza la sanitizacion del mirror global, protege las cinco salidas de consola y `debug/log.txt`, conserva tres fallos temporales preexistentes fuera del alcance y separa el cierre tecnico de las acciones operativas sobre claves o logs historicos.

## 10. BUG-RESERVATION-GUESTNAME-RAW-OVERRIDE-01

- Identificador: `BUG-RESERVATION-GUESTNAME-RAW-OVERRIDE-01`
- Nombre: `preserve canonical reservation guestName from proposal through confirmed create`
- Commit tecnico: `a06e3f92258a8aaecbbddc4040a318029401a2f6`.
- Push tecnico: confirmado.
- Estado documental: `DOCUMENTACION_PREPARADA`; contenido final versionable listo para materializacion por Marcelo y validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Elimina la reinyeccion tardia de `msg.content`, preserva `reservationSlots.guestName` desde la propuesta hasta el create confirmado, registra smoke manual PASS y refresca referencias fisicas del box estable de create sin cambio conceptual.
