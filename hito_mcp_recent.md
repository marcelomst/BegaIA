# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

recent_hitos_count: 10

## 1. FIX-GUEST-WEB-SUPERVISED-APPROVAL-VISIBILITY-01

- Identificador: `FIX-GUEST-WEB-SUPERVISED-APPROVAL-VISIBILITY-01`
- Nombre: `poll approved supervised replies`
- Commit tecnico: `2ed316941caa10ab1bf263a4a59548285c04f0bf`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Incorpora polling Guest Web cada cuatro segundos durante
  un maximo de dos minutos para mostrar una unica vez respuestas supervisadas
  visibles y correlacionadas; History API permanece como fuente de verdad y
  una aprobacion posterior al plazo requiere recuperacion posterior, por
  ejemplo mediante recarga.

## 2. FIX-CONVERSATIONAL-CONTEXT-KB-FASTPATH-01

- Identificador: `FIX-CONVERSATIONAL-CONTEXT-KB-FASTPATH-01`
- Nombre: `propagate explicit recall history to KB fastpath`
- Commit tecnico: `28e23cc4bf8235b940df44bbac72d3ac56e48e10`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Propaga historial opcional al KB fastpath solo ante
  recall explicito con antecedente humano, preserva roles y aplica
  `HISTORY_LIMIT=8` despues de excluir la pregunta actual; clasificacion y
  retrieval siguen usando solo la pregunta actual, sin memoria ni
  persistencia paralela y sin declarar verificacion backend/Astra ni demo
  readiness.

## 3. FIX-GUEST-WEB-AMENITIES-AUTOSEND-POLICY-01

- Identificador: `FIX-GUEST-WEB-AMENITIES-AUTOSEND-POLICY-01`
- Nombre: `normalize amenities handoff autosend policy`
- Commit tecnico: `c46da699802d21561198594ca82c456dc4bc97ff`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Restringe la normalizacion `amenities` a
  `amenities_info` al guard de structured handoff, preserva la categoria
  publica `amenities` y mantiene Web supervised y categorias sensibles en
  supervision; refresca evidencia fisica del Runtime Map sin cambios
  conceptuales y no declara verificacion Astra directa ni demo readiness.

## 4. DEMO-GUEST-WEB-TRUSTED-INGRESS-01

- Identificador: `DEMO-GUEST-WEB-TRUSTED-INGRESS-01`
- Nombre: `add trusted ingress for guest web`
- Commit tecnico: `535367cddf5e0e55be1216f9e2902e3a63a1e438`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Incorpora una unica frontera trusted ingress para Guest
  Web con listeners local y Cloudflare separados, acreditacion TCP, asercion
  HMAC y sanitizacion HTTP bidireccional; mantiene smoke Docker, despliegue,
  tunel publico y demo comercial sin aprobar, y Cancel deshabilitado.

## 5. GUEST-WEB-CONVERSATION-CAPABILITY-01

- Identificador: `GUEST-WEB-CONVERSATION-CAPABILITY-01`
- Nombre: `add secure Guest Web conversation capability`
- Commit tecnico: `92c0ee8592867f41ab66694a55ad4b63b791aa9a`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Incorpora continuidad Guest Web segura con identidad,
  capability, grant y binding server-side, historial e idempotencia durable;
  mantiene trusted ingress como precondicion, smoke controlado pendiente,
  despliegue y demo comercial no concedidos y Cancel deshabilitado.

## 6. SECURE-CONVERSATIONAL-FOUNDATION-01

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

## 7. SPIKE-SIN-V2-SEMANTIC-EVALUATION-PROTOCOL-15

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

## 8. SPIKE-SIN-V2-LOCAL-MODEL-EVALUATION-14

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

## 9. FIX-CANCEL-POSTTRANSACTION-CANONICAL-PROJECTION-01

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

## 10. TEST-OBS-M6-09-POST-CANCEL-CROSS-CONVERSATION-CAUSAL-CHARACTERIZATION-01

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
