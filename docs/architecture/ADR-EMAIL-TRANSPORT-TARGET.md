# ADR — Arquitectura Objetivo del Transporte Email

## Estado

Aprobado a nivel de dirección arquitectónica.

Hito:

`ADR-EMAIL-TRANSPORT-TARGET-01`

## Problema

Begasist necesita tratar `email` como canal productivo de primera clase para:

- propuestas
- reservas
- contratos
- confirmaciones
- trazabilidad documental

El problema no está en el dominio conversacional compartido.

El problema está en la capa de transporte email.

La implementación actual basada en polling IMAP sobre inbox real fue útil para
validar el pipeline multicanal, pero presenta límites como base productiva:

- acoplamiento fuerte al inbox operativo del hotel
- semántica sensible de flags, keywords y labels del proveedor
- contención operativa frágil
- dificultad para hacer pruebas controladas sin contaminar una casilla real
- baja separación entre recepción, dedupe, estado técnico y dominio

## Contexto

Principios ya definidos:

- `email` sigue siendo un canal más en la capa de dominio conversacional
- el pipeline central debe preservarse
- no debe duplicarse lógica conversacional por canal
- debe mantenerse separación transporte vs dominio

Conclusión de contexto:

- el dominio conversacional unificado debe mantenerse
- lo que debe redefinirse es la arquitectura del adapter/transporte email

## Decisión

Se define como arquitectura objetivo:

- `email` unificado en dominio
- `email` especializado en transporte
- adapter/transporte desacoplado del inbox operativo
- arquitectura preferentemente event-driven / cloud-oriented para producción
- polling IMAP relegado a transición o fallback, no como estrategia principal

Formulación explícita:

```text
Dominio conversacional: unificado
Transporte email: especializado
Arquitectura objetivo: desacoplada del inbox operativo
Polling IMAP: transición / fallback
```

## Principios de diseño

- El inbox operativo del hotel no debe ser el centro técnico del procesamiento.
- La recepción de email debe estar desacoplada del estado operativo visible de la casilla.
- La idempotencia no debe depender solo del estado de una colección conversacional.
- Los metadatos RFC y del proveedor pertenecen al transporte, no al núcleo conversacional.
- La confiabilidad operativa de email importa más que en canales puramente informales.
- `hotelId` debe mantenerse explícito en toda la cadena.

## Identidades técnicas

En el canal email no debe existir una única noción de “id del mensaje”.

Deben distinguirse al menos estas identidades:

- `providerMessageId`
  - id técnico del proveedor o fuente de transporte
- `rfcMessageId`
  - valor del header RFC `Message-ID`
- `ingestionId`
  - id interno del evento técnico de ingestión/procesamiento
- `messageId`
  - id canónico del `ChannelMessage` en Begasist
- `conversationId`
  - id de conversación de dominio

Regla:

- identidad técnica del proveedor
- identidad RFC del correo
- evento interno de ingestión
- mensaje conversacional
- conversación de dominio

son artefactos distintos y no deben colapsarse en un único identificador.

## Entidad técnica intermedia

Antes de convertirse en `ChannelMessage`, el email debe poder existir como
registro técnico auditable con estado propio.

Nombre recomendado:

`EmailInboundRecord`

Rol:

- representar el evento técnico de transporte
- soportar parseo, dedupe, errores, retries y trazabilidad
- existir antes del binding al dominio conversacional

Ejemplos de contenido esperado:

- `hotelId`
- `provider`
- `providerMessageId`
- `rfcMessageId`
- `ingestionId`
- headers relevantes
- `from`, `to`, `cc`, `replyTo`
- subject y body raw/parsed/normalized
- `inReplyTo`
- `references`
- metadata de adjuntos
- estado de parseo
- estado de dedupe/idempotencia
- errores técnicos
- referencia posterior a `messageId`
- referencia posterior a `conversationId`

Principio:

- `EmailInboundRecord` no reemplaza `ChannelMessage`
- `ChannelMessage` nace después de recepción, parseo, normalización y dedupe técnico

## Responsabilidades por capa

### Transporte email

Responsabilidades:

- recepción desde proveedor/fuente
- autenticación y conectividad
- obtención del payload bruto
- captura de metadata técnica

### Normalización email

Responsabilidades:

- parsing del correo
- limpieza y estructuración
- extracción de headers relevantes
- preparación del mensaje canónico

### Control técnico

Responsabilidades:

- dedupe/idempotencia
- estado de procesamiento
- errores técnicos
- trazabilidad de retries
- relación entre provider message, RFC message e ingestión interna

### Dominio conversacional

Responsabilidades:

- resolución de guest
- binding conversacional
- persistencia de `messages` y `conversations`
- decisión conversacional y supervisión

### Salida email

Responsabilidades:

- envío de respuesta
- preservación de headers relevantes
- trazabilidad de entrega
- manejo de adjuntos

## Alternativas consideradas

### 1. Polling IMAP como estrategia principal

Ventajas:

- simple
- ya implementado
- útil para validar pipeline

Límites:

- acoplamiento fuerte al inbox real
- fragilidad operacional
- fuerte dependencia de semántica del proveedor

Decisión:

- no recomendada como arquitectura objetivo principal

### 2. Polling IMAP como transición o fallback

Ventajas:

- compatibilidad gradual
- menor fricción de transición

Límites:

- mantiene parte de la fragilidad del modelo actual

Decisión:

- aceptable solo como transición/fallback

#### Uso transicional del legacy email

Mientras se define e implementa la arquitectura objetivo del transporte email,
el runtime legacy puede mantenerse como mecanismo transitorio de onboarding y
quickstart operativo.

Este uso transicional es válido para:

- adopción inicial del primer hotel
- pruebas con remitentes o huéspedes de confianza
- pilotos controlados
- operación acotada de bajo volumen
- aprendizaje operativo del canal

Regla:

- el valor del runtime legacy en esta etapa es facilitar adopción y transición,
  no definir la arquitectura final del canal email

### 3. Adapter event-driven / cloud-based

Ventajas:

- mejor desacople
- mejor observabilidad
- mejor control de dedupe y retries
- más alineado con producción

Costo:

- requiere más diseño de integración

Decisión:

- opción recomendada como arquitectura objetivo

## Primer hotel y transición

El primer onboarding real probablemente no será greenfield.

Escenario esperado:

- casilla histórica existente
- operación humana previa
- infraestructura legacy o híbrida
- forwarding, alias y hábitos ya establecidos

Implicación:

- Begasist debe tolerar convivencia y transición
- no debe exigir reemplazo inmediato de la casilla histórica
- la trazabilidad técnica del inbound email es crítica desde el primer hotel

Esto refuerza la necesidad de:

- capa técnica intermedia
- dedupe independiente del inbox operativo
- auditoría fina de ingestión y procesamiento

## Recomendación concreta

Recomendación final:

- preservar el pipeline central como frontera de dominio
- rediseñar el transporte email como subsistema especializado
- no seguir considerando el polling IMAP sobre inbox real como arquitectura productiva final
- tratar la implementación actual como transición o fallback

## Próximos pasos sugeridos

1. Formalizar esta decisión como documento estable.
2. Abrir blueprint específico del transporte email productivo.
3. Definir estrategia de transición desde el adapter actual.

Siguiente hito sugerido:

`BLUEPRINT-EMAIL-INGESTION-01`

Objetivo:

- definir componentes concretos del adapter productivo
- estados técnicos
- eventos
- dedupe
- frontera exacta con el pipeline central
