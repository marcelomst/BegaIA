// Path: docs/product/whatsapp_number_onboarding_strategy.md

# BegaIA / Begasist — Estrategia de Onboarding de Números WhatsApp

## 1. Propósito

Este documento define la estrategia de onboarding de números WhatsApp para
hoteles en BegaIA/Begasist.

Su objetivo es separar con claridad:

- demo
- piloto
- producción
- migración del número real del hotel
- coexistencia potencial
- Meta Cloud API directo
- Twilio como BSP/proveedor

No redefine la arquitectura de transporte.
Esa arquitectura ya queda gobernada por
`docs/architecture/ADR-WHATSAPP-TRANSPORT-TARGET.md`.

Este documento define la capa comercial-operativa prudente para onboarding del
número.

Nota de naming:

- `BegaIA` = branding externo recomendado
- `Begasist` = nombre interno/histórico

## 2. Decisión actual para demo/dev

La decisión actual para demo/dev es usar un número Twilio nuevo.

Motivos:

- no tocar el WhatsApp actual de ningún hotel
- evitar riesgo operativo
- validar el canal oficial Twilio
- no depender de WhatsApp legacy QR
- mantener legacy en freezer

## 3. WhatsApp legacy congelado

WhatsApp legacy QR queda congelado como canal operativo de prueba.

Motivos:

- problemas en la capa `whatsapp-web.js`
- dependencia de Puppeteer/Chromium
- sesión web que autentica pero no estabiliza correctamente
- bajo valor operativo para un hotel real
- Twilio es el canal objetivo

## 4. Número actual del hotel

Es lógico que un hotel quiera conservar su número actual de WhatsApp Business.

Pero debe quedar explícito que conservar el número actual no equivale a
“puentear” mensajes hacia otro número.

Aclaraciones:

- una telefónica puede ayudar con llamadas tradicionales, portabilidad o
  recepción de OTP
- una telefónica no puede redirigir mensajes WhatsApp de un número a otro como
  si fueran llamadas
- WhatsApp es una identidad registrada en Meta, no un flujo telefónico
  tradicional

## 5. Opción A: número nuevo Twilio

Esta es la opción recomendada para demo/piloto.

Características:

- no toca la operación actual del hotel
- requiere comunicar un nuevo número
- permite validar BegaIA sin riesgo operativo
- es el camino actual de validación

## 6. Opción B: migrar número actual del hotel a Twilio WhatsApp API

Esta opción permite conservar el número del hotel.

Debe evaluarse cuidadosamente porque:

- requiere verificar si el número está actualmente en WhatsApp Business App
- puede exigir liberar o desregistrar el número de la app tradicional
- con Twilio clásico, normalmente el número pasa a operar vía API/plataforma

Regla prudente:

no debe prometerse que la app WhatsApp Business seguirá funcionando salvo
validación explícita del proveedor.

## 7. Opción C: Meta Cloud API directo

Meta Cloud API directo es una alternativa a Twilio.

Ventajas relativas:

- más control técnico
- menor dependencia de BSP

Pero no debe tratarse como variante menor de Twilio.

Requeriría provider propio y trabajo específico sobre:

- webhooks Meta
- tokens
- WABA
- phone number ID
- plantillas
- envío
- delivery/status
- observabilidad

Si se decide avanzar, requeriría ADR/hito separado.

## 8. Opción D: coexistencia WhatsApp Business App + API

La coexistencia es posible bajo ciertos flujos de Meta/partner.

Pero no debe asumirse universalmente.

Depende de:

- elegibilidad
- país
- partner/BSP
- tipo de cuenta
- número

Podría permitir que el hotel mantenga app y plataforma/API, pero no debe
afirmarse sin confirmación real.

## 9. Dependencia de país/elegibilidad

Debe distinguirse:

- WhatsApp API normal con número nuevo no depende centralmente del país del
  hotel
- coexistencia App + API sí puede depender de país, proveedor, elegibilidad y
  rollout de Meta

Para Uruguay no se debe prometer coexistencia sin validación previa.

## 10. Criterio comercial prudente

Frase permitida:

```text
Podemos iniciar sin tocar el WhatsApp actual del hotel. Si luego quieren conservar su número principal, se evalúa migración o coexistencia según elegibilidad de Meta/proveedor.
```

Frases prohibidas o peligrosas:

```text
No prometer: “la telefónica redirige WhatsApp de un número a otro”.
No prometer: “pueden usar siempre la app y la API con el mismo número”.
No prometer: “migrar el número actual no afecta la operación”.
No prometer: “Meta Cloud API directo conserva siempre la app”.
No prometer: “Twilio permite conservar el número sin impacto”.
```

## 11. Estrategia recomendada por fases

### Fase 1: demo/piloto con número Twilio nuevo

- validar BegaIA sin tocar el número actual del hotel

### Fase 2: piloto controlado con hotel real sin tocar número actual

- medir operación y adopción antes de decidir migración o coexistencia

### Fase 3: evaluación de producción

- mantener número nuevo
- migrar número actual a API
- explorar coexistencia con partner compatible
- evaluar Meta Cloud API directo como provider futuro

## 12. Impacto arquitectónico en Begasist

En Begasist:

- `guestId` sigue siendo identidad canónica
- el número WhatsApp es alias/delivery técnico
- el provider puede ser:
  - `twilio`
  - `meta_cloud` futuro
  - `legacy` congelado/dev

No debe contaminarse la identidad canónica con teléfono, sender o proveedor.

Este criterio debe respetar
`docs/architecture/ADR-WHATSAPP-TRANSPORT-TARGET.md`.

## 13. Estado actual operativo

Estado prudente actual:

- sender viejo Twilio `+15558847361 / BegaIA`: bloqueado por Twilio/Meta
- nuevo número Twilio comprado: pendiente de registro como WhatsApp Sender
- A2P 10DLC: no requerido para WhatsApp-only, pero la consola Twilio puede
  empujar indebidamente ese flujo
- soporte Twilio: involucrado
- Astra/.env: no actualizar hasta que el nuevo sender esté operativo

## 14. Próximos pasos

- resolver registro del nuevo número como WhatsApp Sender
- configurar webhook:
  - `https://wa-dev.begam.uy/api/webhooks/whatsapp/twilio`
  - método `POST`
- actualizar `hotel_config` / `.env` solo después de sender activo
- retomar `MANUAL-MULTICHANNEL-CANONICAL-GUEST-PARITY-01`
- dejar `legacy` en freezer
