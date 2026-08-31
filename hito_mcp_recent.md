# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. TECH-TEST-CORE-BASELINE-RECOVERY-01

- Identificador: `TECH-TEST-CORE-BASELINE-RECOVERY-01`
- Nombre: `TECH-TEST-CORE-BASELINE-RECOVERY-01`
- Commit message: `fix(runtime): restore core baseline and honor modify exit`
- Hash: `0b8543ac6bc7c64cdb52fc5a7832d2294bb5e26f`
- Descripción breve: Recupera la baseline core y resuelve la salida explícita de `modify` antes del fast-path, sin reabrir el menú ni alterar intents modify válidos; refresca Runtime Map V1.

## 2. FIX-DEMO-CHANNEL-MANAGER-RESERVATION-DURABILITY-01

- Identificador: `FIX-DEMO-CHANNEL-MANAGER-RESERVATION-DURABILITY-01`
- Nombre: `FIX-DEMO-CHANNEL-MANAGER-RESERVATION-DURABILITY-01`
- Commit message: `fix(demo): persist channel manager reservations in Astra`
- Hash: `dc8e92a32ad4a57985fb51db0f84e1006ce2b9c8`
- Descripción breve: Sustituye el store volátil del Channel Manager demo/local por la tabla Astra `demo_cm_reservations`, aislada por hotel; preserva `conv_state` como proyección conversacional.

## 3. FIX-RUNTIME-RESERVATION-SNAPSHOT-GUEST-CONTINUITY-01

- Identificador: `FIX-RUNTIME-RESERVATION-SNAPSHOT-GUEST-CONTINUITY-01`
- Nombre: `FIX-RUNTIME-RESERVATION-SNAPSHOT-GUEST-CONTINUITY-01`
- Commit message: `fix(runtime): preserve guest-wide reservation reference continuity`
- Hash: `84ec3d229104c3e4e3bf6e0047f262fcc11b229d`
- Descripción breve: Extiende snapshot al guest canónico entre conversaciones y canales, preserva la dominancia de la reserva actual y resuelve referencias y target para preview/modify gobernado, con refresh de Runtime Map V1.

## 4. FIX-WEB-GUEST-IDENTITY-PERSISTENCE-01

- Identificador: `FIX-WEB-GUEST-IDENTITY-PERSISTENCE-01`
- Nombre: `FIX-WEB-GUEST-IDENTITY-PERSISTENCE-01`
- Commit message: `fix(web): persist guest identity by hotel across tabs`
- Hash: `364603387ba1a71fc4dd04d542d7fe77227ed385`
- Descripción breve: Persiste el `guestId` Web por hotel entre pestañas, mantiene `conversationId` aislado por sesión y migra identidad válida previa sin duplicar Guests; Widget y ChatPage comparten el contrato.

## 5. FIX-RUNTIME-GUEST-IDENTITY-CORRECTION-DOMINANCE-01

- Identificador: `FIX-RUNTIME-GUEST-IDENTITY-CORRECTION-DOMINANCE-01`
- Nombre: `FIX-RUNTIME-GUEST-IDENTITY-CORRECTION-DOMINANCE-01`
- Commit message: `fix(runtime): prioritize explicit guest identity corrections`
- Hash: `90497ac5d3037091b960d1f24b00db70fc1e1e63`
- Descripción breve: Prioriza la corrección explícita de identidad canónica y finaliza el turno antes del routing transaccional, preservando aliases, holder y estado de reserva; incluye refresh de Runtime Map V1 sin cambio arquitectónico.

## 6. FIX-DEMO-EMAIL-WORKER-STALE-LOCK-RESTART-01

- Identificador: `FIX-DEMO-EMAIL-WORKER-STALE-LOCK-RESTART-01`
- Nombre: `FIX-DEMO-EMAIL-WORKER-STALE-LOCK-RESTART-01`
- Commit message: `fix(demo): release email worker locks safely on shutdown`
- Hash: `aedc37859b1c7927013c3317beee2831be31310a`
- Descripción breve: Libera de forma atómica los locks Redis propietarios al apagar el email-worker, bloquea startups IMAP cancelados y preserva exclusión mutua y reacquisición segura, sin afectar el runtime conversacional.

## 7. FIX-ADMIN-CHANNEL-MODE-API-CONTRACT-01

- Identificador: `FIX-ADMIN-CHANNEL-MODE-API-CONTRACT-01`
- Nombre: `FIX-ADMIN-CHANNEL-MODE-API-CONTRACT-01`
- Commit message: `fix(admin): persist explicit channel mode via JSON API`
- Hash: `397858960e80aec7c1fb2e34e7a25bd852756c23`
- Descripción breve: Corrige el contrato Admin/API del modo por canal: el POST persiste el `mode` explícito, responde JSON `200` sin redirect y los callers Admin envían el modo solicitado, sin tocar el runtime conversacional.

## 8. FIX-RUNTIME-DRAFT-HOLDER-CORRECTION-GUARD-01

- Identificador: `FIX-RUNTIME-DRAFT-HOLDER-CORRECTION-GUARD-01`
- Nombre: `FIX-RUNTIME-DRAFT-HOLDER-CORRECTION-GUARD-01`
- Commit message: `fix(runtime): guard draft holder correction and block confirmed holder changes`
- Hash: `98180396375f229d096c55753ba08eb9bff9d128`
- Descripción breve: Soporta corrección segura de titular en draft/proposal, preserva la separación entre identidad canónica y holder transaccional, y bloquea el cambio de titular sobre reserva confirmada, con refresh de Runtime Map V1 sin cambio arquitectónico.

## 9. FIX-RUNTIME-PROPOSAL-DOMINANCE-MODIFY-BOUNDARY-01

- Identificador: `FIX-RUNTIME-PROPOSAL-DOMINANCE-MODIFY-BOUNDARY-01`
- Nombre: `FIX-RUNTIME-PROPOSAL-DOMINANCE-MODIFY-BOUNDARY-01`
- Commit message: `fix(runtime): preserve proposal dominance over confirmed modify fallback`
- Hash: `d6656276b3bc1f4451cb5a178ec697d31311239b`
- Descripción breve: Corrige la frontera proposal-vs-confirmed en `modify`, evita fallback implícito sobre target confirmado cuando domina un draft/proposal y refresca Runtime Map V1 sin cambio arquitectónico.

## 10. TECH-DEMO-LOCAL-ORCHESTRATION-HEALTHCHECKS-01

- Identificador: `TECH-DEMO-LOCAL-ORCHESTRATION-HEALTHCHECKS-01`
- Nombre: `TECH-DEMO-LOCAL-ORCHESTRATION-HEALTHCHECKS-01`
- Commit message: `chore(demo): add local orchestration stack and healthchecks`
- Hash: `df8ee0dce93c28146e2524392852fae19ee4eaa5`
- Descripción breve: Consolida una unidad reproducible y observable para la demo local de BegaIA con Docker Compose, core mínimo `redis/suite/hotel-demo`, perfiles opcionales `email-worker/cloudflared`, healthchecks, smoke no destructivo y documentación operativa mínima, sin tocar el runtime conversacional.
