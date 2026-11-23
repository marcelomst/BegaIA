# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

recent_hitos_count: 10

## 1. SEC-EMAIL-WORKER-IMAP-TLS-HARDENING-01

- Identificador: `SEC-EMAIL-WORKER-IMAP-TLS-HARDENING-01`
- Nombre: `enforce strict IMAP TLS in worker`
- Commit tecnico: `96c9fef2f1dae1a2412b6d9d47312099586ba691`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Endurece el único constructor IMAP del Email Worker con
  TLS y validación de certificados estrictos, usando `IMAP_HOST` como host y
  `servername` para conexión inicial y fallback; no acredita conexiones reales,
  compatibilidad multihotel, sanitización de logs ni habilitación operacional.

## 2. FIX-EMAIL-IMAP-PROBE-TLS-SERVERNAME-01

- Identificador: `FIX-EMAIL-IMAP-PROBE-TLS-SERVERNAME-01`
- Nombre: `set IMAP probe TLS servername`
- Commit tecnico: `bb711cf1a2dd567b7ba2fc4764e513b81f0097b3`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Alinea el `servername` TLS del probe IMAP con el mismo
  `email.imapHost` usado como host, preservando validación de certificados,
  timeouts, credenciales, fallback y `exact-target`; no corrige ni habilita el
  Email Worker, cuyo hardening TLS permanece bloqueado para un hito separado.

## 3. OPS-EMAIL-EXACT-TARGET-PROBE-01

- Identificador: `OPS-EMAIL-EXACT-TARGET-PROBE-01`
- Nombre: `add exact-target credential probe`
- Commit tecnico: `bea2d872a2eeec62cab682f934e0f099b96f986b`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Incorpora un diagnóstico Email exact-target limitado a
  `hotel999` y `demo-hotel999-main`, con lectura segura desde archivo externo,
  autenticación sintética IMAP/SMTP y salida sanitizada; no acredita ejecución
  real ni autoriza apply, rollback, escritura Astra o reinicio de Email Worker.

## 4. SEC-INFRA-EMAIL-CONNECTIVITY-PROBE-01

- Identificador: `SEC-INFRA-EMAIL-CONNECTIVITY-PROBE-01`
- Nombre: `add secure email connectivity probe`
- Commit tecnico: `0dc9ac0bedad375ac92f0ebe515e00784fc3a690`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Incorpora un diagnóstico CLI seguro de conectividad y
  autenticación IMAP/SMTP, con TLS validado, selección externa fail-closed y
  salida categórica sin secretos; no abre INBOX, no envía correo ni inicia o
  modifica Email Worker.

## 5. SEC-INFRA-DEMO-COMPOSE-ENV-SOURCE-CONTRACT-01

- Identificador: `SEC-INFRA-DEMO-COMPOSE-ENV-SOURCE-CONTRACT-01`
- Nombre: `unify Demo Compose env source`
- Commit tecnico: `ab607afd53bada3cbe2881dbefa231baec9885d5`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Consolida `BEGASIST_DEMO_ENV_FILE` como fuente canónica
  para los nueve scripts Demo y deriva `COMPOSE_ENV_FILES` de la misma ruta,
  con fallback `.env`; preserva perfiles y argumentos, sin completar el
  cutover operacional ni aislar `.env`.

## 6. SEC-INFRA-DEMO-ENV-EXTERNAL-PATH-CONTRACT-01

- Identificador: `SEC-INFRA-DEMO-ENV-EXTERNAL-PATH-CONTRACT-01`
- Nombre: `add external Demo env file contract`
- Commit tecnico: `3192cdd54ad11470d3a6bf0345f6a4298f7d4084`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Incorpora `BEGASIST_DEMO_ENV_FILE` como selector comun
  para el `env_file` de `suite` y `email-worker`, con fallback compatible a
  `.env` y soporte de rutas externas; habilita externalizacion, pero no
  constituye un cutover ni acredita aislamiento completo.

## 7. SEC-INFRA-DOCKER-CONTEXT-HARDENING-01

- Identificador: `SEC-INFRA-DOCKER-CONTEXT-HARDENING-01`
- Nombre: `harden sensitive Docker build context`
- Commit tecnico: `dedbe0a7ee4ff68bd95e402f28fff298fb5719e8`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Endurece el contexto Docker con 23 exclusiones nuevas
  para impedir el ingreso de activos sensibles identificados; no modifica
  Dockerfiles, Compose, runtime, credenciales ni datos, y no cubre versionado
  Git, historial, bind mounts ni configuracion externa.

## 8. UX-GUEST-WEB-SUPERVISED-CONTINUITY-01

- Identificador: `UX-GUEST-WEB-SUPERVISED-CONTINUITY-01`
- Nombre: `improve supervised conversation continuity`
- Commit tecnico: `69dcc1f7c0dd604cbefab21b3710a99526e67e1f`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Mejora la continuidad visual efimera de Guest Web con un
  aviso explicito para el primer pending, un indicador discreto unico para los
  siguientes, retiro al aprobar o expirar y reinicio por nueva conversacion;
  preserva polling, decision backend e History API como fuente de verdad.

## 9. FIX-GUEST-WEB-SUPERVISED-APPROVAL-VISIBILITY-01

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

## 10. FIX-CONVERSATIONAL-CONTEXT-KB-FASTPATH-01

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
