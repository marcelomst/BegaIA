# ADR — Arquitectura Objetivo del Transporte WhatsApp

## Estado

Propuesto para revisión arquitectónica.

Hito:

`ADR-WHATSAPP-TRANSPORT-TARGET-01`

## Problema

Begasist ya trata WhatsApp como canal conversacional operativo, pero su
contrato de transporte sigue parcialmente implícito.

Los fixes recientes corrigieron la preservación mínima de identidad y evitaron
que `senderJid` siga operando como `guestId` canónico cuando existe resolución
de alias.

Eso cerró la brecha de identidad más urgente.

No cerró todavía el contrato objetivo completo de transporte WhatsApp.

Los vacíos vigentes son:

- semántica transicional de `conversationId`
- distinción formal entre `guestId` canónico y alias técnico de delivery
- definición explícita de `sourceMsgId` / `providerMessageId`
- frontera común entre WhatsApp legacy y WhatsApp Twilio
- contrato outbound/delivery separado del dominio conversacional

## Contexto

Principios ya vigentes en Begasist:

- `messageHandler` sigue siendo el runtime principal
- el pipeline central debe preservarse
- los canales convergen al pipeline conversacional común
- transporte y dominio no deben colapsarse
- `hotelId` debe permanecer explícito
- no deben crearse fuentes paralelas de identidad

Estado real actual:

- `handleChannelMessage(...)` resuelve identidad canónica antes del runtime
- `resolveGuestIdentity(...)` reutiliza `guest_aliases` como mecanismo de
  resolución
- WhatsApp legacy ya reutiliza esa resolución antes de delegar
- `UniversalEvent` preserva `guestId`, `conversationId` y `sourceMsgId`
- `senderJid` y `guestAlias` ya pueden viajar como metadata técnica
- Twilio ya entra por el pipeline central
- `conversationId` conserva semántica legacy compatible en parte del canal
- outbound legacy todavía expone una dependencia implícita entre delivery y
  campos históricos

Conclusión de contexto:

- el dominio conversacional unificado ya existe
- lo que debe formalizarse es la arquitectura objetivo del transporte WhatsApp

## Decisión

Se define como arquitectura objetivo:

- WhatsApp unificado en dominio
- WhatsApp especializado en transporte
- `messageHandler` preservado como runtime principal
- `handleChannelMessage(...)` preservado como entrada canónica del pipeline
  cuando aplique
- `guestId` en `ChannelMessage` entendido como guest canónico resuelto
- alias técnicos de canal preservados como artefactos de transporte
- dedupe/idempotencia gobernados por identificadores del provider
- delivery outbound desacoplado de `guestId`
- coexistencia de Twilio y legacy bajo el mismo contrato conceptual
- `UniversalEvent` + `ChannelMessage` suficientes por ahora
- no introducir todavía `WhatsAppInboundRecord`

Formulación explícita:

```text
Dominio conversacional: unificado
Transporte WhatsApp: especializado
guestId operativo: canónico
senderJid / teléfono / alias: transporte
conversationId: híbrido transicional
delivery outbound: separado de guestId
```

## Principios de diseño

- El transporte no debe duplicar lógica conversacional.
- El transporte puede preservar metadata técnica sin convertirla en identidad
  de dominio.
- La identidad de guest debe resolverse antes del runtime conversacional.
- `guest_aliases` es la vía admitida para alias técnico -> guest canónico.
- `conversationId` no debe redefinirse de forma incompatible mientras exista
  dependencia legacy operativa.
- La idempotencia inbound debe depender del provider y del mensaje técnico, no
  del guest.
- El contrato de delivery outbound no debe inferirse desde `guestId`.
- `hotelId` debe permanecer explícito en toda la cadena.
- Admin y consolidación consumen identidad canónica y aliases, pero no definen
  el transporte.

## Identidades técnicas

En WhatsApp no debe existir una sola noción de “id del mensaje” ni una sola
noción de “id del interlocutor”.

Deben distinguirse al menos estos artefactos:

- `guestId`
  - identidad canónica del huésped en Begasist
- `guestAlias`
  - alias técnico normalizado del canal, por ejemplo `whatsapp:+598...`
- `senderJid` / `phone` / equivalente provider
  - dirección técnica de transporte o delivery
- `sourceMsgId`
  - identificador técnico de mensaje inbound usado para dedupe/idempotencia
- `providerMessageId`
  - identificador técnico del provider cuando exista y sea distinto del
    `sourceMsgId`
- `messageId`
  - identificador del `ChannelMessage` persistido por Begasist
- `conversationId`
  - identificador de conversación operativa del dominio

Regla:

- identidad canónica
- alias técnico
- dirección de delivery
- evento técnico del provider
- mensaje conversacional
- conversación de dominio

son artefactos distintos y no deben colapsarse.

## Responsabilidades por capa

### Transporte WhatsApp

Responsabilidades:

- recepción desde provider
- autenticación o validación técnica del webhook o cliente
- captura del payload bruto
- preservación de ids técnicos del provider
- preservación de alias o dirección técnica de origen/destino

### Normalización WhatsApp

Responsabilidades:

- adaptación del payload del provider
- normalización a `UniversalEvent` o entrada compatible
- preservación de `hotelId`, `channel`, `sourceMsgId` y metadata técnica
  relevante

### Resolución de identidad

Responsabilidades:

- resolver alias técnico hacia guest canónico
- reutilizar `guest_aliases`
- no crear fuentes paralelas de identidad

### Binding conversacional

Responsabilidades:

- reutilizar continuidad existente cuando haya `conversationId` explícito o
  binding compatible
- apoyar continuidad conversacional por `guestId` canónico en el pipeline
  central

### Runtime conversacional

Responsabilidad principal:

- `messageHandler`

### Salida / delivery

Responsabilidades:

- enviar respuestas por la dirección técnica de transporte adecuada
- preservar correlación técnica con el provider
- registrar resultado de entrega sin convertir dirección técnica en identidad
  canónica

## Inbound

Contrato objetivo inbound:

1. el provider entrega el evento técnico
2. el adapter de transporte normaliza el mensaje
3. se preserva `hotelId`
4. se preserva `sourceMsgId` o equivalente del provider
5. se preserva alias técnico de origen
6. se resuelve `guestId` canónico por `guest_aliases`
7. se entrega al pipeline central con `guestId` canónico
8. el runtime conversacional opera sobre identidad canónica, no sobre alias
   técnico

Regla explícita:

`senderJid` o equivalente puede entrar como dato crudo de transporte, pero no
debe llegar al runtime como sustituto de `guestId` cuando existe resolución
canónica.

## Outbound / delivery

Contrato objetivo outbound:

- la respuesta conversacional nace desde el runtime central
- el transporte decide la entrega usando dirección técnica o `deliveryAddress`
  equivalente
- la dirección de entrega no debe inferirse desde `guestId`
- el guest canónico y la dirección de transporte pueden correlacionarse, pero
  no son el mismo campo

Regla explícita:

`guestId` no debe ser tratado como dirección de envío outbound.

Si un provider requiere teléfono, JID o address específico, ese dato pertenece
al transporte o a metadata técnica resoluble, no al contrato canónico de
identidad del huésped.

## Dedupe / idempotencia

Regla objetivo:

- dedupe inbound por provider y por identificador técnico del mensaje
- no dedupe por guest
- no dedupe por conversación como fuente primaria

Aplicación:

- `sourceMsgId` o identificador equivalente del provider es la clave primaria
  operativa de dedupe inbound
- controles adicionales de guardado o guardas internas pueden coexistir, pero
  no reemplazan esa regla

## conversationId

Se formaliza un contrato híbrido transicional.

Definición:

- `conversationId` sigue pudiendo preservar semántica legacy por canal/alias
  donde hoy existe dependencia operativa
- la continuidad real del sistema debe apoyarse cada vez más en `guestId`
  canónico dentro del pipeline

Esto implica:

- no forzar una migración inmediata de todos los hilos históricos
- no redefinir todavía `conversationId` como puro identificador por guest
  canónico
- mantener compatibilidad con bindings históricos donde siga siendo necesario
- preservar capacidad de convergencia cross-channel mediante `guestId` cuando
  el pipeline central lo permita

## Legacy y Twilio

Ambos providers pueden coexistir.

### WhatsApp legacy

Queda aceptado como transporte transicional siempre que:

- preserve ids técnicos del provider
- resuelva `guestId` canónico antes del runtime
- trate `senderJid` como metadata técnica
- no use alias técnico como identidad de dominio

### WhatsApp Twilio

Queda aceptado bajo el mismo contrato conceptual, aunque use otra superficie
técnica:

- dedupe por `MessageSid`
- routing por `To`
- delivery por `From` / dirección técnica del provider
- entrada al pipeline central con identidad canónica resuelta

Regla:

la diferencia entre legacy y Twilio es de adapter/proveedor, no de modelo de
dominio.

## Admin / guest consolidation

Admin y consolidación de guests:

- consumen `guestId` canónico y `guest_aliases`
- pueden mostrar aliases técnicos asociados al guest
- pueden consolidar aliases o guests según gobernanza existente

Este ADR no redefine:

- UX/Admin
- política de merge
- CRM completo
- estrategia de consolidación manual o automática

## Alternativas consideradas

### 1. Mantener el estado actual solo documentado en hitos

Ventajas:

- cero trabajo documental adicional

Límites:

- deja implícitos los contratos más sensibles
- no cierra la semántica de outbound/delivery
- no alinea WhatsApp con el nivel de explicitud ya definido para Email

Decisión:

- insuficiente

### 2. Introducir ya una entidad técnica `WhatsAppInboundRecord`

Ventajas:

- mayor trazabilidad técnica futura
- mejor base para retries, auditoría y observabilidad avanzada

Límites:

- sobre-especifica una necesidad todavía no obligatoria
- empuja diseño hacia implementación prematura

Decisión:

- no adoptada por ahora

### 3. Formalizar el transporte WhatsApp con `UniversalEvent` + `ChannelMessage`

Ventajas:

- compatible con el runtime vigente
- suficiente para cerrar contratos esenciales
- incremental y alineado con el estado real del repo

Límites:

- deja deuda residual en observabilidad y delivery avanzado
- mantiene `conversationId` en transición híbrida

Decisión:

- recomendada

## Decisión recomendada

Se recomienda formalizar ahora `ADR-WHATSAPP-TRANSPORT-TARGET-01` con alcance
documental mínimo y suficiente.

La decisión no es implementar otra arquitectura.

La decisión es fijar el contrato objetivo para que:

- identidad
- alias
- `conversationId`
- `sourceMsgId`
- dedupe
- delivery

queden explícitos y gobernados bajo una misma semántica entre Twilio y legacy.

## Consecuencias positivas

- consolida WhatsApp como transporte y no como dominio separado
- evita reintroducir `senderJid` como identidad canónica
- aclara la frontera entre identity y delivery
- alinea WhatsApp con el nivel arquitectónico ya documentado para Email
- preserva compatibilidad con `messageHandler`
- preserva compatibilidad con `guest_aliases`
- permite cerrar deuda conceptual sin refactor amplio

## Consecuencias negativas

- `conversationId` sigue con semántica híbrida transicional
- no resuelve por sí solo todas las variantes históricas de delivery legacy
- no crea aún una entidad técnica intermedia con trazabilidad extendida
- deja trabajo posterior de tests E2E y hardening de contratos outbound

## Deuda residual

Permanece explícitamente fuera de cierre total:

- posible formalización futura de `providerMessageId` separado de `sourceMsgId`
  si el provider lo exige
- posible entidad técnica tipo `WhatsAppInboundRecord` si aparecen necesidades
  reales de auditoría/retries
- normalización más fuerte de delivery address outbound en
  almacenamiento/persistencia
- reducción futura de dependencia legacy en `conversationId`

## Condiciones para declarar multicanalidad completamente resuelta

Solo podrá declararse internamente cuando:

- todos los canales entren al runtime con identidad canónica resuelta por el
  mismo criterio conceptual
- ningún alias técnico de canal opere como `guestId` de dominio
- `hotelId`, `channel`, `guestId`, `conversationId` y `sourceMsgId` tengan
  semántica explícita y testeada
- outbound use dirección técnica explícita, separada de `guestId`
- dedupe/idempotencia inbound estén formalizados por provider
- WhatsApp legacy y Twilio cumplan el mismo contrato conceptual
- Web, Email y WhatsApp tengan cobertura suficiente de identidad y continuidad
  conversacional
- Admin consuma guest canónico y aliases sin fuente paralela
- no queden fallbacks implícitos que colapsen transporte con dominio
