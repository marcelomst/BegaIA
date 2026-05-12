# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. TEST-MULTICHANNEL-CANONICAL-GUEST-E2E-01

- Identificador: `TEST-MULTICHANNEL-CANONICAL-GUEST-E2E-01`
- Nombre: `TEST-MULTICHANNEL-CANONICAL-GUEST-E2E-01`
- Commit message: `TEST-MULTICHANNEL-CANONICAL-GUEST-E2E-01`
- Hash: `30bd88bd9f0b7b18307cc1d508d6a2b101593350`
- Descripción breve: Se agrega cobertura E2E multicanal para validar identidad canónica y continuidad entre Web, Email, WhatsApp y `guest_aliases`, estabilizando además dos specs con reloj determinístico.

## 2. DOC-ADR-WHATSAPP-TRANSPORT-TARGET-01

- Identificador: `DOC-ADR-WHATSAPP-TRANSPORT-TARGET-01`
- Nombre: `DOC-ADR-WHATSAPP-TRANSPORT-TARGET-01`
- Commit message: `DOC-ADR-WHATSAPP-TRANSPORT-TARGET-01`
- Hash: `974ccb3db7f8f419479969501b386ebb7e31c1bc`
- Descripción breve: Se materializa el ADR arquitectónico de transporte WhatsApp para formalizar identidad canónica, alias técnico, delivery, dedupe e interoperabilidad legacy + Twilio sin tocar runtime.

## 3. FIX-WHATSAPP-LEGACY-GUEST-ALIAS-RESOLUTION-67

- Identificador: `FIX-WHATSAPP-LEGACY-GUEST-ALIAS-RESOLUTION-67`
- Nombre: `FIX-WHATSAPP-LEGACY-GUEST-ALIAS-RESOLUTION-67`
- Commit message: `FIX-WHATSAPP-LEGACY-GUEST-ALIAS-RESOLUTION-67`
- Hash: `e59f490911209bc0178a33210f0c6ece8e6ffe8a`
- Descripción breve: Se corrige el path legacy de WhatsApp para dejar de usar `senderJid` como `guestId` operativo cuando existe resolución canónica, preservándolo solo como metadata técnica.

## 4. FIX-WHATSAPP-CHANNELMESSAGE-IDENTITY-PARITY-65

- Identificador: `FIX-WHATSAPP-CHANNELMESSAGE-IDENTITY-PARITY-65`
- Nombre: `FIX-WHATSAPP-CHANNELMESSAGE-IDENTITY-PARITY-65`
- Commit message: `FIX-WHATSAPP-CHANNELMESSAGE-IDENTITY-PARITY-65`
- Hash: `42cc3b69c4e75dbe21bc4d1945654cdce5a125c4`
- Descripción breve: Se corrige la paridad mínima de identidad en WhatsApp para preservar `guestId` en `UniversalEvent` y `ChannelMessage`, dejando deuda residual explícita por el fallback canal-específico.

## 5. DOC-DEMO-MULTICHANNEL-PARITY-VALIDATION-BEGAIA-64

- Identificador: `DOC-DEMO-MULTICHANNEL-PARITY-VALIDATION-BEGAIA-64`
- Nombre: `DOC-DEMO-MULTICHANNEL-PARITY-VALIDATION-BEGAIA-64`
- Commit message: `DOC-DEMO-MULTICHANNEL-PARITY-VALIDATION-BEGAIA-64`
- Hash: `df2a3780146104f7972498f674428289e22c92b9`
- Descripción breve: Se crea el documento draft versionable de validación multicanal de demo para `BegaIA`, con resultado prudente `Web aligned`, `Email aligned` y `WhatsApp partial`.

## 6. DOC-ARCHITECTURE-CONCIERGE-BEGAIA-63

- Identificador: `DOC-ARCHITECTURE-CONCIERGE-BEGAIA-63`
- Nombre: `DOC-ARCHITECTURE-CONCIERGE-BEGAIA-63`
- Commit message: `DOC-ARCHITECTURE-CONCIERGE-BEGAIA-63`
- Hash: `172e516f0f3e0a562c8137561fa7520ac7014234`
- Descripción breve: Se actualiza la arquitectura conceptual para presentar a `BegaIA` como materialización del concierge digital y explicitar límites comerciales prudentes.

## 7. DOC-PRESENTATION-USE-CASES-DEMO-SELECTION-BEGAIA-62

- Identificador: `DOC-PRESENTATION-USE-CASES-DEMO-SELECTION-BEGAIA-62`
- Nombre: `DOC-PRESENTATION-USE-CASES-DEMO-SELECTION-BEGAIA-62`
- Commit message: `DOC-PRESENTATION-USE-CASES-DEMO-SELECTION-BEGAIA-62`
- Hash: `e90402f18ac12bf376f42d4082e0f917ffb15e69`
- Descripción breve: Se crea el documento fuente draft para selección de casos de uso y recorridos de demo no técnica de `BegaIA`, con claims seguros y límites comerciales explícitos.

## 8. DOC-DEMO-PRESENTATION-RESYNC-BEGAIA-61

- Identificador: `DOC-DEMO-PRESENTATION-RESYNC-BEGAIA-61`
- Nombre: `DOC-DEMO-PRESENTATION-RESYNC-BEGAIA-61`
- Commit message: `DOC-DEMO-PRESENTATION-RESYNC-BEGAIA-61`
- Hash: `fda64cc150c3432b58d0ac982e4b2a16b0bd44f4`
- Descripción breve: Se resincronizan los documentos de presentación/demo para usar `BegaIA` como branding externo y actualizar narrativa y capability map al estado real validado hasta el hito 60.

## 9. FEAT-ASSISTANT-BRANDING-ACKNOWLEDGEMENT-COPY-60

- Identificador: `FEAT-ASSISTANT-BRANDING-ACKNOWLEDGEMENT-COPY-60`
- Nombre: `FEAT-ASSISTANT-BRANDING-ACKNOWLEDGEMENT-COPY-60`
- Commit message: `FEAT-ASSISTANT-BRANDING-ACKNOWLEDGEMENT-COPY-60`
- Hash: `249ca2ca2f36f11915645f8baa5486bdc2e171cc`
- Descripción breve: Se extiende `assistantBranding` con `acknowledgementLabel` como copy controlado, fallback seguro a `Encantado` y limpieza canónica completa al vaciar branding base.

## 10. FEAT-ADMIN-ASSISTANT-BRANDING-UI-59

- Identificador: `FEAT-ADMIN-ASSISTANT-BRANDING-UI-59`
- Nombre: `FEAT-ADMIN-ASSISTANT-BRANDING-UI-59`
- Commit message: `FEAT-ADMIN-ASSISTANT-BRANDING-UI-59`
- Hash: `e7bc0c32a7f0466254c8ddbe6e25e00a33cebeb1`
- Descripción breve: Se agrega mantenimiento operativo desde la UI canónica de edición de hotel para `assistantBranding`, con validación centralizada, preview compartido con runtime y fallback seguro.
