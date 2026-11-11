# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

recent_hitos_count: 10

## 1. SECURE-CONVERSATIONAL-FOUNDATION-01

- Identificador: `SECURE-CONVERSATIONAL-FOUNDATION-01`
- Nombre: `establish secure conversational foundation`
- Commit tecnico: `55e4a7127110af2eed3d350920efa893ea8e6110`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Consolida ownership, CAS, persistencia tenant-scoped,
  autorizacion administrativa, autenticacion Staff y MCP fail-closed; mantiene
  Cancel deshabilitado, Guest Web sin continuidad ni SSE, el hito de origen
  abierto y despliegue no autorizado.

## 2. SPIKE-SIN-V2-SEMANTIC-EVALUATION-PROTOCOL-15

- Identificador: `SPIKE-SIN-V2-SEMANTIC-EVALUATION-PROTOCOL-15`
- Nombre: `materialize SIN V2 semantic evaluation protocol`
- Commit tecnico: `82ae0677110f20336186925fb1a247dfe8ec7396`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Materializa el protocolo exploratorio R3, la guia de
  anotacion y la especificacion del instrumento para evaluar semanticamente
  SIN V2 offline. Mantiene Gate A pendiente, no declara dataset, gold, scorer
  ni ejecucion experimental y no modifica SIN V2, RDA o runtime productivo.

## 3. SPIKE-SIN-V2-LOCAL-MODEL-EVALUATION-14

- Identificador: `SPIKE-SIN-V2-LOCAL-MODEL-EVALUATION-14`
- Nombre: `evaluate SIN V2 local model profiles`
- Commit tecnico: `6a745268bc34534d783c44f32c3234c2c0c8fbbf`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Evalua offline cinco perfiles cerrados de modelo local;
  observa transporte viable y conformidad estructural parcial, pero ninguna
  salida generativa valida para SIN V2 ni fidelidad semantica demostrada.
  Preserva `BACKUP_PENDING` para el respaldo independiente de las capturas y
  no versiona evidencia cruda.

## 4. FIX-CANCEL-POSTTRANSACTION-CANONICAL-PROJECTION-01

- Identificador: `FIX-CANCEL-POSTTRANSACTION-CANONICAL-PROJECTION-01`
- Nombre: `close canonical post-Cancel projection`
- Commit tecnico: `c9af50c96ebb8f137e08a1687a11758cf6c7c7f1`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Preserva la reserva cancelada y persiste su proyeccion
  canonica con identidad, estado y atributos materiales; mantiene la autoridad
  de `cancelled` frente a material activo same-ID, conserva
  `activeReservationContext.phase=cancelled`, convierte `OBS-M6-09` a pruebas
  ordinarias y mantiene `OBS-M6-10` abierto y fuera de alcance.

## 5. TEST-OBS-M6-09-POST-CANCEL-CROSS-CONVERSATION-CAUSAL-CHARACTERIZATION-01

- Identificador: `TEST-OBS-M6-09-POST-CANCEL-CROSS-CONVERSATION-CAUSAL-CHARACTERIZATION-01`
- Nombre: `characterize OBS-M6-09 post-Cancel cross-conversation divergence`
- Commit tecnico: `c6bae56e1e6052b07cd09dd6d4f4e99cb3e68436`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Caracteriza causalmente la divergencia post-Cancel entre
  Snapshot singular y listado guest-wide, incluida la fase `confirmed`
  incorrecta; preserva dos contratos pendientes mediante `it.fails`, confirma
  que `OBS-M6-09` persiste y requiere un hito separado para el fix productivo.

## 6. FIX-DEMO-M6-DISCARD-OBJECT-SCOPE-01

- Identificador: `FIX-DEMO-M6-DISCARD-OBJECT-SCOPE-01`
- Nombre: `harden M6 discard and cancel target scope`
- Commit tecnico: `3234f6456ccb93b93214eeb3742fc254455bce90`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Reconoce contextualmente `propuesta` durante un preview
  Modify, descarta el preview y sus confirmaciones pendientes, bloquea
  fail-closed la cancelacion anaforica sin target suficiente y preserva Cancel
  con target canonico strong; mantiene `OBS-M6-08`, `OBS-M6-09` y `OBS-M6-10`
  fuera de alcance.

## 7. FIX-CANONICAL-READ-SAME-ID-HYDRATION-01

- Identificador: `FIX-CANONICAL-READ-SAME-ID-HYDRATION-01`
- Nombre: `correct canonical same-ID hydration after Modify discard`
- Commit tecnico: `3443c7463f45a6d5b3537d1e51d7a961eab5a951`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Corrige la hidratacion canonica same-ID entre
  Modify/Discard y Snapshot, preserva autoridad material local primero y
  restringe el fallback guest-wide read-only a `hotelId`, `canonicalGuestId`
  y `reservationId`; refresca rangos top-level del Runtime Map sin alterar sus
  cajas ni el modelo conceptual.

## 8. SPIKE-SIN-SEMANTIC-CONTRACT-V2-13

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

## 9. TEST-OBS-M6-07-POST-DISCARD-CAUSAL-CHARACTERIZATION-01

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

## 10. FIX-GUESTWIDE-MODIFY-AUTHORITY-RESOLUTION-01

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
