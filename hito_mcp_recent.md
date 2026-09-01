# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-RUNTIME-RESERVATION-MODIFY-REPRICE-CONSISTENCY-01

- Identificador: `FIX-RUNTIME-RESERVATION-MODIFY-REPRICE-CONSISTENCY-01`
- Nombre: `FIX-RUNTIME-RESERVATION-MODIFY-REPRICE-CONSISTENCY-01`
- Commit message: `fix(runtime): enforce modify quote pricing consistency`
- Hash: `63045d886fa3410e60bfa428b9b92feb69d768d0`
- Descripción breve: Exige quote vigente de provider para modify, liga confirmación a `quoteId`/`quoteVersion`, bloquea mutaciones stale y requiere re-quote con segunda confirmación antes del update durable.

## 2. UPDATE-DEMO-COMMERCIAL-SPEECH-01

- Identificador: `UPDATE-DEMO-COMMERCIAL-SPEECH-01`
- Nombre: `UPDATE-DEMO-COMMERCIAL-SPEECH-01`
- Commit message: `docs(demo): refine commercial presentation speech`
- Hash: `5a2efa585a624479de3474d1ebb564b3cc6bed5e`
- Descripción breve: Refina el speech comercial del demo, separa Channel Manager de canales conversacionales y conserva la estructura de escenas compatible con el parser, sin cambios funcionales.

## 3. FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01

- Identificador: `FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01`
- Nombre: `FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01`
- Commit message: `fix(runtime): preserve complete reservation snapshot after modify`
- Hash: `3bb821a3240fcf92aebae3424ebde4ba92699780`
- Descripción breve: Preserva el snapshot completo tras modify mediante hidratación local de la misma reserva, dominancia de la confirmada actual y fallback guest-wide acotado; cierre Runtime Map diferido sin degradar la baseline más nueva.

## 4. TECH-TEST-CORE-BASELINE-RECOVERY-01

- Identificador: `TECH-TEST-CORE-BASELINE-RECOVERY-01`
- Nombre: `TECH-TEST-CORE-BASELINE-RECOVERY-01`
- Commit message: `fix(runtime): restore core baseline and honor modify exit`
- Hash: `0b8543ac6bc7c64cdb52fc5a7832d2294bb5e26f`
- Descripción breve: Recupera la baseline core y resuelve la salida explícita de `modify` antes del fast-path, sin reabrir el menú ni alterar intents modify válidos; refresca Runtime Map V1.

## 5. FIX-DEMO-CHANNEL-MANAGER-RESERVATION-DURABILITY-01

- Identificador: `FIX-DEMO-CHANNEL-MANAGER-RESERVATION-DURABILITY-01`
- Nombre: `FIX-DEMO-CHANNEL-MANAGER-RESERVATION-DURABILITY-01`
- Commit message: `fix(demo): persist channel manager reservations in Astra`
- Hash: `dc8e92a32ad4a57985fb51db0f84e1006ce2b9c8`
- Descripción breve: Sustituye el store volátil del Channel Manager demo/local por la tabla Astra `demo_cm_reservations`, aislada por hotel; preserva `conv_state` como proyección conversacional.

## 6. FIX-RUNTIME-RESERVATION-SNAPSHOT-GUEST-CONTINUITY-01

- Identificador: `FIX-RUNTIME-RESERVATION-SNAPSHOT-GUEST-CONTINUITY-01`
- Nombre: `FIX-RUNTIME-RESERVATION-SNAPSHOT-GUEST-CONTINUITY-01`
- Commit message: `fix(runtime): preserve guest-wide reservation reference continuity`
- Hash: `84ec3d229104c3e4e3bf6e0047f262fcc11b229d`
- Descripción breve: Extiende snapshot al guest canónico entre conversaciones y canales, preserva la dominancia de la reserva actual y resuelve referencias y target para preview/modify gobernado, con refresh de Runtime Map V1.

## 7. FIX-WEB-GUEST-IDENTITY-PERSISTENCE-01

- Identificador: `FIX-WEB-GUEST-IDENTITY-PERSISTENCE-01`
- Nombre: `FIX-WEB-GUEST-IDENTITY-PERSISTENCE-01`
- Commit message: `fix(web): persist guest identity by hotel across tabs`
- Hash: `364603387ba1a71fc4dd04d542d7fe77227ed385`
- Descripción breve: Persiste el `guestId` Web por hotel entre pestañas, mantiene `conversationId` aislado por sesión y migra identidad válida previa sin duplicar Guests; Widget y ChatPage comparten el contrato.

## 8. FIX-RUNTIME-GUEST-IDENTITY-CORRECTION-DOMINANCE-01

- Identificador: `FIX-RUNTIME-GUEST-IDENTITY-CORRECTION-DOMINANCE-01`
- Nombre: `FIX-RUNTIME-GUEST-IDENTITY-CORRECTION-DOMINANCE-01`
- Commit message: `fix(runtime): prioritize explicit guest identity corrections`
- Hash: `90497ac5d3037091b960d1f24b00db70fc1e1e63`
- Descripción breve: Prioriza la corrección explícita de identidad canónica y finaliza el turno antes del routing transaccional, preservando aliases, holder y estado de reserva; incluye refresh de Runtime Map V1 sin cambio arquitectónico.

## 9. FIX-DEMO-EMAIL-WORKER-STALE-LOCK-RESTART-01

- Identificador: `FIX-DEMO-EMAIL-WORKER-STALE-LOCK-RESTART-01`
- Nombre: `FIX-DEMO-EMAIL-WORKER-STALE-LOCK-RESTART-01`
- Commit message: `fix(demo): release email worker locks safely on shutdown`
- Hash: `aedc37859b1c7927013c3317beee2831be31310a`
- Descripción breve: Libera de forma atómica los locks Redis propietarios al apagar el email-worker, bloquea startups IMAP cancelados y preserva exclusión mutua y reacquisición segura, sin afectar el runtime conversacional.

## 10. FIX-ADMIN-CHANNEL-MODE-API-CONTRACT-01

- Identificador: `FIX-ADMIN-CHANNEL-MODE-API-CONTRACT-01`
- Nombre: `FIX-ADMIN-CHANNEL-MODE-API-CONTRACT-01`
- Commit message: `fix(admin): persist explicit channel mode via JSON API`
- Hash: `397858960e80aec7c1fb2e34e7a25bd852756c23`
- Descripción breve: Corrige el contrato Admin/API del modo por canal: el POST persiste el `mode` explícito, responde JSON `200` sin redirect y los callers Admin envían el modo solicitado, sin tocar el runtime conversacional.
