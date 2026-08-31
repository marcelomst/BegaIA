# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-RUNTIME-RESERVATION-SNAPSHOT-GUEST-CONTINUITY-01

- Identificador: `FIX-RUNTIME-RESERVATION-SNAPSHOT-GUEST-CONTINUITY-01`
- Nombre: `FIX-RUNTIME-RESERVATION-SNAPSHOT-GUEST-CONTINUITY-01`
- Commit message: `fix(runtime): preserve guest-wide reservation reference continuity`
- Hash: `84ec3d229104c3e4e3bf6e0047f262fcc11b229d`
- Descripción breve: Extiende snapshot al guest canónico entre conversaciones y canales, preserva la dominancia de la reserva actual y resuelve referencias y target para preview/modify gobernado, con refresh de Runtime Map V1.

## 2. FIX-WEB-GUEST-IDENTITY-PERSISTENCE-01

- Identificador: `FIX-WEB-GUEST-IDENTITY-PERSISTENCE-01`
- Nombre: `FIX-WEB-GUEST-IDENTITY-PERSISTENCE-01`
- Commit message: `fix(web): persist guest identity by hotel across tabs`
- Hash: `364603387ba1a71fc4dd04d542d7fe77227ed385`
- Descripción breve: Persiste el `guestId` Web por hotel entre pestañas, mantiene `conversationId` aislado por sesión y migra identidad válida previa sin duplicar Guests; Widget y ChatPage comparten el contrato.

## 3. FIX-RUNTIME-GUEST-IDENTITY-CORRECTION-DOMINANCE-01

- Identificador: `FIX-RUNTIME-GUEST-IDENTITY-CORRECTION-DOMINANCE-01`
- Nombre: `FIX-RUNTIME-GUEST-IDENTITY-CORRECTION-DOMINANCE-01`
- Commit message: `fix(runtime): prioritize explicit guest identity corrections`
- Hash: `90497ac5d3037091b960d1f24b00db70fc1e1e63`
- Descripción breve: Prioriza la corrección explícita de identidad canónica y finaliza el turno antes del routing transaccional, preservando aliases, holder y estado de reserva; incluye refresh de Runtime Map V1 sin cambio arquitectónico.

## 4. FIX-DEMO-EMAIL-WORKER-STALE-LOCK-RESTART-01

- Identificador: `FIX-DEMO-EMAIL-WORKER-STALE-LOCK-RESTART-01`
- Nombre: `FIX-DEMO-EMAIL-WORKER-STALE-LOCK-RESTART-01`
- Commit message: `fix(demo): release email worker locks safely on shutdown`
- Hash: `aedc37859b1c7927013c3317beee2831be31310a`
- Descripción breve: Libera de forma atómica los locks Redis propietarios al apagar el email-worker, bloquea startups IMAP cancelados y preserva exclusión mutua y reacquisición segura, sin afectar el runtime conversacional.

## 5. FIX-ADMIN-CHANNEL-MODE-API-CONTRACT-01

- Identificador: `FIX-ADMIN-CHANNEL-MODE-API-CONTRACT-01`
- Nombre: `FIX-ADMIN-CHANNEL-MODE-API-CONTRACT-01`
- Commit message: `fix(admin): persist explicit channel mode via JSON API`
- Hash: `397858960e80aec7c1fb2e34e7a25bd852756c23`
- Descripción breve: Corrige el contrato Admin/API del modo por canal: el POST persiste el `mode` explícito, responde JSON `200` sin redirect y los callers Admin envían el modo solicitado, sin tocar el runtime conversacional.

## 6. FIX-RUNTIME-DRAFT-HOLDER-CORRECTION-GUARD-01

- Identificador: `FIX-RUNTIME-DRAFT-HOLDER-CORRECTION-GUARD-01`
- Nombre: `FIX-RUNTIME-DRAFT-HOLDER-CORRECTION-GUARD-01`
- Commit message: `fix(runtime): guard draft holder correction and block confirmed holder changes`
- Hash: `98180396375f229d096c55753ba08eb9bff9d128`
- Descripción breve: Soporta corrección segura de titular en draft/proposal, preserva la separación entre identidad canónica y holder transaccional, y bloquea el cambio de titular sobre reserva confirmada, con refresh de Runtime Map V1 sin cambio arquitectónico.

## 7. FIX-RUNTIME-PROPOSAL-DOMINANCE-MODIFY-BOUNDARY-01

- Identificador: `FIX-RUNTIME-PROPOSAL-DOMINANCE-MODIFY-BOUNDARY-01`
- Nombre: `FIX-RUNTIME-PROPOSAL-DOMINANCE-MODIFY-BOUNDARY-01`
- Commit message: `fix(runtime): preserve proposal dominance over confirmed modify fallback`
- Hash: `d6656276b3bc1f4451cb5a178ec697d31311239b`
- Descripción breve: Corrige la frontera proposal-vs-confirmed en `modify`, evita fallback implícito sobre target confirmado cuando domina un draft/proposal y refresca Runtime Map V1 sin cambio arquitectónico.

## 8. TECH-DEMO-LOCAL-ORCHESTRATION-HEALTHCHECKS-01

- Identificador: `TECH-DEMO-LOCAL-ORCHESTRATION-HEALTHCHECKS-01`
- Nombre: `TECH-DEMO-LOCAL-ORCHESTRATION-HEALTHCHECKS-01`
- Commit message: `chore(demo): add local orchestration stack and healthchecks`
- Hash: `df8ee0dce93c28146e2524392852fae19ee4eaa5`
- Descripción breve: Consolida una unidad reproducible y observable para la demo local de BegaIA con Docker Compose, core mínimo `redis/suite/hotel-demo`, perfiles opcionales `email-worker/cloudflared`, healthchecks, smoke no destructivo y documentación operativa mínima, sin tocar el runtime conversacional.

## 9. FIX-ADMIN-BEGAIA-DOCUMENT-TITLE-01

- Identificador: `FIX-ADMIN-BEGAIA-DOCUMENT-TITLE-01`
- Nombre: `FIX-ADMIN-BEGAIA-DOCUMENT-TITLE-01`
- Commit message: `FIX-ADMIN-BEGAIA-DOCUMENT-TITLE-01`
- Hash: `1f1775d4e7f21b72420fec406fc7cf0261eddba8`
- Descripción breve: Corrige exclusivamente la grafía canónica del título global del documento en `app/layout.tsx`, cambiando `BegAI` por `BegaIA` sin tocar favicon, widget, runtime ni otras ocurrencias fuera de alcance.

## 10. IMPROVE-APP-DEMO-FAVICONS-01

- Identificador: `IMPROVE-APP-DEMO-FAVICONS-01`
- Nombre: `IMPROVE-APP-DEMO-FAVICONS-01`
- Commit message: `IMPROVE-APP-DEMO-FAVICONS-01`
- Hash: `634ee69fcf269e3403a3e1a21c16c599d47fc9be`
- Descripción breve: Alinea los favicons finales de BegaIA/Admin y Hotel Demo, usa el asset oficial `begaia-favicon-base-512.png` para la app principal, regenera `app/favicon.ico` en 16x16, 32x32 y 48x48, y agrega favicon HD propio al Hotel Demo.
