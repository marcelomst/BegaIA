# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. DOC-PRESENTATION-NARRATIVE-BASE-42

- Identificador: `DOC-PRESENTATION-NARRATIVE-BASE-42`
- Nombre: `DOC-PRESENTATION-NARRATIVE-BASE-42`
- Commit message: `DOC-PRESENTATION-NARRATIVE-BASE-42`
- Hash: `d2387d2928af4c4b49e728e2573572d98fb4000f`
- Descripción breve: Se crea la narrativa base draft para piezas no técnicas de Begasist, ordenando posicionamiento, claims seguros, prudentes, prohibidos y guardrails comerciales.

## 2. DOC-HITO-DISCIPLINA-PLANTILLAS-Y-APERTURA-CHAT-41

- Identificador: `DOC-HITO-DISCIPLINA-PLANTILLAS-Y-APERTURA-CHAT-41`
- Nombre: `DOC-HITO-DISCIPLINA-PLANTILLAS-Y-APERTURA-CHAT-41`
- Commit message: `DOC-HITO-DISCIPLINA-PLANTILLAS-Y-APERTURA-CHAT-41`
- Hash: `fd36f7334de724d60936690c2fd70b0965f72b59`
- Descripción breve: Se formaliza la disciplina de continuidad entre chats con una regla de orquestación low-token, una guía de apertura de chat nuevo y la plantilla obligatoria `HITO_TEMPLATE_V1`.

## 3. FIX-PENDING-PROPOSAL-CONFIRMATION-WITH-TEMPORAL-MODIFIER-40

- Identificador: `FIX-PENDING-PROPOSAL-CONFIRMATION-WITH-TEMPORAL-MODIFIER-40`
- Nombre: `FIX-PENDING-PROPOSAL-CONFIRMATION-WITH-TEMPORAL-MODIFIER-40`
- Commit message: `FIX-PENDING-PROPOSAL-CONFIRMATION-WITH-TEMPORAL-MODIFIER-40`
- Hash: `1c021baad49231a1725dd6d3f101617bd2b71531`
- Descripción breve: Se endurece la confirmación de proposals activas para que mensajes ambiguos con modificador temporal como `confirmar mañana` no disparen confirmación ni desvíen por error al flujo de fechas.

## 4. FIX-CONFIRMATION-PENDING-PROPOSAL-CORRECTIONS-39

- Identificador: `FIX-CONFIRMATION-PENDING-PROPOSAL-CORRECTIONS-39`
- Nombre: `FIX-CONFIRMATION-PENDING-PROPOSAL-CORRECTIONS-39`
- Commit message: `FIX-CONFIRMATION-PENDING-PROPOSAL-CORRECTIONS-39`
- Hash: `7761478f0a9574d2a99e291702a27ea3498ac8d4`
- Descripción breve: Se introduce gobernanza explícita sobre proposal pendiente previa a confirmación, endureciendo la confirmación, cortando loops con negación y recotizando correcciones válidas sin contaminar slots ajenos.

## 5. FIX-CREATE-RELATIVE-WEEKEND-RANGE-PARSING-38

- Identificador: `FIX-CREATE-RELATIVE-WEEKEND-RANGE-PARSING-38`
- Nombre: `FIX-CREATE-RELATIVE-WEEKEND-RANGE-PARSING-38`
- Commit message: `FIX-CREATE-RELATIVE-WEEKEND-RANGE-PARSING-38`
- Hash: `0506d8ccdee2c24e19349926b3877f571b9791f2`
- Descripción breve: Se corrige el parsing de rangos relativos de fin de semana en `create` explícito, absorbiendo `del sábado al domingo` y `este finde`, y preservando single-date como `checkIn` contextual sin generar rangos inválidos.

## 6. FIX-AVAILABILITY-HANDOFF-STRICT-AFFIRMATION-37

- Identificador: `FIX-AVAILABILITY-HANDOFF-STRICT-AFFIRMATION-37`
- Nombre: `FIX-AVAILABILITY-HANDOFF-STRICT-AFFIRMATION-37`
- Commit message: `FIX-AVAILABILITY-HANDOFF-STRICT-AFFIRMATION-37`
- Hash: `299929677943b21e4124888bef7fe1eb7573f266`
- Descripción breve: Se endurece el handoff desde `availability_inquiry` hacia `create` para aceptar solo intención explícita de reserva, agregando una aclaración para respuestas ambiguas y cobertura unitaria positiva/negativa.

## 7. FIX-AVAILABILITY-INQUIRY-CREATE-HANDOFF-36

- Identificador: `FIX-AVAILABILITY-INQUIRY-CREATE-HANDOFF-36`
- Nombre: `FIX-AVAILABILITY-INQUIRY-CREATE-HANDOFF-36`
- Commit message: `fix(reservation-runtime): hand off positive availability inquiry into create`
- Hash: `d840457080f257fe29d9ccb8e93bfad046caf96c`
- Descripción breve: Se ajusta el runtime de reservation en `messageHandler` para hacer handoff desde `availability_inquiry` a `create` cuando hubo disponibilidad positiva previa y el usuario expresa intención de avanzar, reutilizando slots y pidiendo el siguiente faltante real.

## 8. FIX-CREATE-AVAILABILITY-INQUIRY-POLICY-35

- Identificador: `FIX-CREATE-AVAILABILITY-INQUIRY-POLICY-35`
- Nombre: `FIX-CREATE-AVAILABILITY-INQUIRY-POLICY-35`
- Commit message: `FIX-CREATE-AVAILABILITY-INQUIRY-POLICY-35`
- Hash: `61a4327aac45ae468917f1d922c65e47413b9da1`
- Descripción breve: Se explicita la separación entre availability inquiry y `reservation.create` dentro de `messageHandler`, con modo inquiry, persistencia no transaccional y actualización de `message_pipeline.md`.

## 9. FIX-CREATE-CHECKIN-PROMPT-FRAMING-34

- Identificador: `FIX-CREATE-CHECKIN-PROMPT-FRAMING-34`
- Nombre: `FIX-CREATE-CHECKIN-PROMPT-FRAMING-34`
- Commit message: `FIX-CREATE-CHECKIN-PROMPT-FRAMING-34`
- Hash: `3a95433483a86f44b654bb42598e5e8d551334cb`
- Descripción breve: Se corrige el wording de prompts de fecha faltante en contexto `create`, evitando framing de `modify` cuando el flujo está iniciando una reserva o consulta de disponibilidad.

## 10. FIX-CREATE-CONTEXTUAL-DATE-FOLLOWUP-33

- Identificador: `FIX-CREATE-CONTEXTUAL-DATE-FOLLOWUP-33`
- Nombre: `FIX-CREATE-CONTEXTUAL-DATE-FOLLOWUP-33`
- Commit message: `FIX-CREATE-CONTEXTUAL-DATE-FOLLOWUP-33`
- Hash: `d3bc86b34fde60dd3ccc48bd87912d7f1bf3c45a`
- Descripción breve: Se corrige `create` para absorber una única fecha contextual relativa o explícita cuando el runtime espera `checkIn` o `checkOut`, persistiendo el draft parcial antes de decidir el siguiente prompt y evitando repreguntas del mismo slot.
