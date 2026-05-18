# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-EMAIL-IMAP-PROCESSED-FLAG-COMPAT-01

- Identificador: `FIX-EMAIL-IMAP-PROCESSED-FLAG-COMPAT-01`
- Nombre: `FIX-EMAIL-IMAP-PROCESSED-FLAG-COMPAT-01`
- Commit message: `FIX-EMAIL-IMAP-PROCESSED-FLAG-COMPAT-01`
- Hash: `eee569f3e8100d9b17eed5286f0d79c92927f954`
- Descripción breve: Se corrige el post-processing IMAP para mantener `\\Seen` como obligatorio y dejar `RAGBOT_PROCESSED` como keyword opcional best-effort cuando el proveedor no la soporta.

## 2. SEC-IGNORE-LOCAL-WWEBJS-SESSIONS-01

- Identificador: `SEC-IGNORE-LOCAL-WWEBJS-SESSIONS-01`
- Nombre: `SEC-IGNORE-LOCAL-WWEBJS-SESSIONS-01`
- Commit message: `SEC-IGNORE-LOCAL-WWEBJS-SESSIONS-01`
- Hash: `761fabe3da1cdad4263a609231c2e3a89366a079`
- Descripción breve: Se agregan reglas de ignore y se desindexan sesiones locales de `wwebjs` para evitar volver a versionar material sensible de autenticación legacy.

## 3. DOC-WHATSAPP-NUMBER-ONBOARDING-STRATEGY-01

- Identificador: `DOC-WHATSAPP-NUMBER-ONBOARDING-STRATEGY-01`
- Nombre: `DOC-WHATSAPP-NUMBER-ONBOARDING-STRATEGY-01`
- Commit message: `DOC-WHATSAPP-NUMBER-ONBOARDING-STRATEGY-01`
- Hash: `617d3ded7abcd3429a951645aab0149356a1cf3a`
- Descripción breve: Se crea la fuente canónica de onboarding de números WhatsApp para `BegaIA/Begasist`, separando demo, piloto, migración, coexistencia, Twilio y Meta Cloud API con wording prudente.

## 4. FIX-WHATSAPP-LEGACY-IGNORE-GROUPS-EXPLICIT-CONFIG-68

- Identificador: `FIX-WHATSAPP-LEGACY-IGNORE-GROUPS-EXPLICIT-CONFIG-68`
- Nombre: `FIX-WHATSAPP-LEGACY-IGNORE-GROUPS-EXPLICIT-CONFIG-68`
- Commit message: `FIX-WHATSAPP-LEGACY-IGNORE-GROUPS-EXPLICIT-CONFIG-68`
- Hash: `7521b4d51248980d4bec9558b75c7f75990db874`
- Descripción breve: Se vuelve explícita y testeable la configuración `channelConfigs.whatsapp.ignoreGroups` para WhatsApp legacy, manteniendo default seguro `true` y evitando la entrada de grupos al pipeline.

## 5. TEST-MULTICHANNEL-CANONICAL-GUEST-E2E-01

- Identificador: `TEST-MULTICHANNEL-CANONICAL-GUEST-E2E-01`
- Nombre: `TEST-MULTICHANNEL-CANONICAL-GUEST-E2E-01`
- Commit message: `TEST-MULTICHANNEL-CANONICAL-GUEST-E2E-01`
- Hash: `30bd88bd9f0b7b18307cc1d508d6a2b101593350`
- Descripción breve: Se agrega cobertura E2E multicanal para validar identidad canónica y continuidad entre Web, Email, WhatsApp y `guest_aliases`, estabilizando además dos specs con reloj determinístico.

## 6. DOC-ADR-WHATSAPP-TRANSPORT-TARGET-01

- Identificador: `DOC-ADR-WHATSAPP-TRANSPORT-TARGET-01`
- Nombre: `DOC-ADR-WHATSAPP-TRANSPORT-TARGET-01`
- Commit message: `DOC-ADR-WHATSAPP-TRANSPORT-TARGET-01`
- Hash: `974ccb3db7f8f419479969501b386ebb7e31c1bc`
- Descripción breve: Se materializa el ADR arquitectónico de transporte WhatsApp para formalizar identidad canónica, alias técnico, delivery, dedupe e interoperabilidad legacy + Twilio sin tocar runtime.

## 7. FIX-WHATSAPP-LEGACY-GUEST-ALIAS-RESOLUTION-67

- Identificador: `FIX-WHATSAPP-LEGACY-GUEST-ALIAS-RESOLUTION-67`
- Nombre: `FIX-WHATSAPP-LEGACY-GUEST-ALIAS-RESOLUTION-67`
- Commit message: `FIX-WHATSAPP-LEGACY-GUEST-ALIAS-RESOLUTION-67`
- Hash: `e59f490911209bc0178a33210f0c6ece8e6ffe8a`
- Descripción breve: Se corrige el path legacy de WhatsApp para dejar de usar `senderJid` como `guestId` operativo cuando existe resolución canónica, preservándolo solo como metadata técnica.

## 8. FIX-WHATSAPP-CHANNELMESSAGE-IDENTITY-PARITY-65

- Identificador: `FIX-WHATSAPP-CHANNELMESSAGE-IDENTITY-PARITY-65`
- Nombre: `FIX-WHATSAPP-CHANNELMESSAGE-IDENTITY-PARITY-65`
- Commit message: `FIX-WHATSAPP-CHANNELMESSAGE-IDENTITY-PARITY-65`
- Hash: `42cc3b69c4e75dbe21bc4d1945654cdce5a125c4`
- Descripción breve: Se corrige la paridad mínima de identidad en WhatsApp para preservar `guestId` en `UniversalEvent` y `ChannelMessage`, dejando deuda residual explícita por el fallback canal-específico.

## 9. DOC-DEMO-MULTICHANNEL-PARITY-VALIDATION-BEGAIA-64

- Identificador: `DOC-DEMO-MULTICHANNEL-PARITY-VALIDATION-BEGAIA-64`
- Nombre: `DOC-DEMO-MULTICHANNEL-PARITY-VALIDATION-BEGAIA-64`
- Commit message: `DOC-DEMO-MULTICHANNEL-PARITY-VALIDATION-BEGAIA-64`
- Hash: `df2a3780146104f7972498f674428289e22c92b9`
- Descripción breve: Se crea el documento draft versionable de validación multicanal de demo para `BegaIA`, con resultado prudente `Web aligned`, `Email aligned` y `WhatsApp partial`.

## 10. DOC-ARCHITECTURE-CONCIERGE-BEGAIA-63

- Identificador: `DOC-ARCHITECTURE-CONCIERGE-BEGAIA-63`
- Nombre: `DOC-ARCHITECTURE-CONCIERGE-BEGAIA-63`
- Commit message: `DOC-ARCHITECTURE-CONCIERGE-BEGAIA-63`
- Hash: `172e516f0f3e0a562c8137561fa7520ac7014234`
- Descripción breve: Se actualiza la arquitectura conceptual para presentar a `BegaIA` como materialización del concierge digital y explicitar límites comerciales prudentes.
