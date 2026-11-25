# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

recent_hitos_count: 10

## 1. INFRA-DEMO-CODE-ISOLATION-01

- Identificador: `INFRA-DEMO-CODE-ISOLATION-01`
- Nombre: `record Demo code isolation contract`
- Commit tecnico: `bdcc555ecef56bfac12e371f952ac6146659fb2d`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Incorpora un contrato Docker alternativo para construir
  una imagen Demo identificada por el commit fuente, con contexto futuro desde
  `git archive` y Compose sin build automatico ni bind mounts de codigo; no
  acredita una imagen final, publicacion, promocion, cutover ni Demo Comercial
  congelada.

## 2. DOC-AGPT-TASK-UPDATE-01

- Identificador: `DOC-AGPT-TASK-UPDATE-01`
- Nombre: `record AGPT task tracker update`
- Commit tecnico: `b656e6d1d0b97569ddb66b5659fb4b58cd9ae237`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Actualiza el tracker auxiliar a la version 0.8, registra
  `ENV-01` como analisis completado sin aislamiento implementado, mantiene
  `INFRA-DEMO-CODE-ISOLATION-01` sin autorizacion de implementacion e incorpora
  `OBS-EMAIL-HEARTBEAT-WITHOUT-LOCK` como observacion P2 pendiente y separada.

## 3. DOC-AGPT-TASK-TRACKING-01

- Identificador: `DOC-AGPT-TASK-TRACKING-01`
- Nombre: `record AGPT operational task tracker`
- Commit tecnico: `b2695259c95ee473a3322f8c49a4f9828297c70d`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Incorpora `docs/development/TASK.md` como tracker
  operativo auxiliar subordinado al System Operating Model, separando
  planificacion, evidencia operacional Email y backlog historico sin autorizar
  implementacion, Git write, configuracion externa ni despliegues.

## 4. SEC-EMAIL-WORKER-SMTP-RECIPIENT-ALLOWLIST-01

- Identificador: `SEC-EMAIL-WORKER-SMTP-RECIPIENT-ALLOWLIST-01`
- Nombre: `enforce SMTP recipient allowlist`
- Commit tecnico: `8663e8f3d0889137b1500782bab34daba78172e0`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Aplica una allowlist SMTP opcional en el único punto
  productivo de envío y falla de forma cerrada ante configuración inválida o
  destinatarios ambiguos; no acredita ejecución del Email Worker, conexiones
  o envíos SMTP reales ni configuración operacional de la allowlist.

## 5. FIX-EMAIL-WORKER-SENDING-DISABLED-GATE-01

- Identificador: `FIX-EMAIL-WORKER-SENDING-DISABLED-GATE-01`
- Nombre: `enforce sending-disabled SMTP gate`
- Commit tecnico: `6bbad30c63da015e96e73ac2c8ee3fc620ea0907`.
- Push tecnico: confirmado sobre `origin/main`.
- Estado documental: `DOCUMENTACION_PREPARADA`; cierre sujeto a commit, push y
  validacion postcommit mediante HDOC(CLOSE).
- Descripcion breve: Centraliza la única llamada productiva a `sendMail` bajo
  `EMAIL_SENDING_ENABLED`, preserva el payload cuando está habilitado y evita
  registrar como enviada una respuesta bloqueada; no acredita conexiones
  reales, ejecución del Email Worker ni readiness operacional o comercial.

## 6. SEC-EMAIL-WORKER-IMAP-TLS-HARDENING-01

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

## 7. FIX-EMAIL-IMAP-PROBE-TLS-SERVERNAME-01

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

## 8. OPS-EMAIL-EXACT-TARGET-PROBE-01

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

## 9. SEC-INFRA-EMAIL-CONNECTIVITY-PROBE-01

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

## 10. SEC-INFRA-DEMO-COMPOSE-ENV-SOURCE-CONTRACT-01

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
