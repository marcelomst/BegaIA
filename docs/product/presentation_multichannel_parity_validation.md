# DRAFT — BegaIA Multichannel Demo Parity Validation

## 1. Propósito del documento

Este documento captura la validación técnica mínima y versionable del estado multicanal de demo para BegaIA.

Su objetivo es dejar evidencia reutilizable para:

- deck
- one-pager
- guion de demo
- decisiones prudentes de positioning multicanal

No redefine arquitectura.
No cierra paridad productiva.
No sustituye ADRs técnicos.

## 2. Estado documental

Documento: `DRAFT`

Uso permitido:

- respaldar wording prudente de demo
- registrar evidencia mínima por canal
- distinguir soporte documentado de validación parcial

Uso no permitido:

- vender paridad cerrada donde no existe
- convertir validación puntual en claim comercial amplio
- usarlo como prueba de arquitectura objetivo final

## 3. Naming

Convención para este documento:

- `BegaIA` = branding externo para demo/presentación
- `Begasist` = nombre interno/histórico del sistema

## 4. Alcance de la validación

Esta validación cubre:

- puntos de entrada por canal
- convergencia hacia el runtime vigente
- preservación razonable del contrato interno
- evidencia mínima mediante inspección y tests relevantes

Canales auditados:

- Web
- Email
- WhatsApp

Contrato interno observado:

- `ChannelMessage`
- `handleChannelMessage`
- `handleIncomingMessage` / `messageHandler`

Campos mínimos observados:

- `hotelId`
- `channel`
- `guestId`
- `conversationId`

## 5. Resultado por canal

- Web: `aligned`
- Email: `aligned`
- WhatsApp: `partial`

## 6. Evidencia técnica resumida por canal

### 6.1 Web

Path observado:

`/api/chat` → `handleChannelMessage` → `handleIncomingMessage`

Evidencia:

- el entrypoint Web converge al contrato central
- resuelve y preserva identidad conversacional dentro del camino principal
- la batería reciente de demo 56–60 se validó sobre ese runtime

Interpretación:

- Web es el canal más sólido para demo actual

### 6.2 Email

Path observado:

`email service` → `parseEmailToChannelMessage` → `handleChannelMessage`

Evidencia:

- Email converge al dominio conversacional unificado por el camino central
- la arquitectura observada es consistente con `docs/architecture/ADR-EMAIL-TRANSPORT-TARGET.md`
- el transporte sigue siendo especializado y el polling IMAP permanece como transición/fallback

Interpretación:

- Email está alineado a nivel de dominio conversacional
- eso no implica que el transporte email ya esté en arquitectura objetivo final

### 6.3 WhatsApp

Path observado:

`whatsapp service` → `parseWhatsAppToChannelMessage` → `universalChannelEventHandler` → `handleIncomingMessage`

Evidencia:

- WhatsApp converge al runtime vigente
- pero no pasa por `handleChannelMessage`
- en el path actual, `ChannelMessage` se normaliza sin `guestId` dentro de `universalChannelEventHandler`

Interpretación:

- WhatsApp está relacionado e integrable con la demo
- pero no puede presentarse todavía como paridad cerrada con Web y Email

## 7. Tests ejecutados

Comandos reportados como `PASS`:

```bash
npx vitest run test/api.chat.route.spec.ts test/integration/api_chat.test.ts test/unit/messageHandler.guest_name_capture.spec.ts
npx vitest run test/unit/email.pipelineIdentity.spec.ts test/unit/email.smtpAuthFallback.spec.ts
npx vitest run test/golden/guestIdentity.golden.spec.ts test/unit/messageHandler.whatsapp_copy.test.ts
```

Resultado:

- Web: PASS
- Email: PASS
- WhatsApp-related: PASS

Lectura prudente:

- PASS no equivale automáticamente a paridad total
- la evidencia debe interpretarse junto con la inspección del path técnico

## 8. Interpretación para demo

### 8.1 Web

Web puede sostenerse como canal principal de demo.

Razón:

- convergencia central clara
- cobertura fuerte sobre el runtime reciente

### 8.2 Email

Email puede mostrarse como canal alineado al dominio conversacional unificado, con transporte especializado.

Razón:

- la evidencia técnica acompaña el ADR vigente
- la narrativa correcta es dominio unificado + transporte especializado

### 8.3 WhatsApp

WhatsApp puede mostrarse como canal relacionado con la solución, pero no como paridad multicanal cerrada al mismo nivel que Web.

Razón:

- hay convergencia al runtime
- pero persiste una brecha técnica de identidad/camino de entrada

## 9. Claims seguros

- BegaIA tiene evidencia sólida de demo sobre Web.
- Email converge al dominio conversacional unificado y su transporte requiere lectura especializada.
- WhatsApp está integrado al runtime vigente, aunque su paridad no está cerrada al mismo nivel que Web.
- La multicanalidad puede presentarse como orientación real del producto, con distinto nivel de validación según canal.

## 10. Claims no permitidos todavía

- “Web, Email y WhatsApp están validados por igual.”
- “WhatsApp ya tiene paridad cerrada con el contrato central.”
- “Email ya está resuelto en su arquitectura objetivo final.”
- “La demo multicanal está productivamente validada por igual en todos los canales.”

## 11. Brecha WhatsApp detectada

Brecha principal:

- WhatsApp no converge por `handleChannelMessage`
- su entrada actual usa `universalChannelEventHandler`
- en ese path, el `ChannelMessage` construido sin `guestId` debilita evidencia para features recientes de guest identity/consolidation

Consecuencia:

- no conviene elevar WhatsApp a claim fuerte de paridad demo sin un hito técnico separado

## 12. Recomendaciones

- crear un hito separado de paridad WhatsApp
- crear a futuro un ADR específico de transporte/arquitectura WhatsApp si la solución lo requiere
- considerar una spec adicional de Email si se quiere mostrar saludo/branding por ese canal en demo
- usar este documento como respaldo prudente para materiales no técnicos, sin convertirlo en claim comercial amplio

## 13. Resultado

```text
DOC-DEMO-MULTICHANNEL-PARITY-VALIDATION-BEGAIA-64
estado: draft documental creado
agente externo: no usado
runtime: no tocado
documento destino: docs/product/presentation_multichannel_parity_validation.md
```
