# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-CONFIRMATION-PENDING-PROPOSAL-CORRECTIONS-39

- Identificador: `FIX-CONFIRMATION-PENDING-PROPOSAL-CORRECTIONS-39`
- Nombre: `FIX-CONFIRMATION-PENDING-PROPOSAL-CORRECTIONS-39`
- Commit message: `FIX-CONFIRMATION-PENDING-PROPOSAL-CORRECTIONS-39`
- Hash: `7761478f0a9574d2a99e291702a27ea3498ac8d4`
- Descripción breve: Se introduce gobernanza explícita sobre proposal pendiente previa a confirmación, endureciendo la confirmación, cortando loops con negación y recotizando correcciones válidas sin contaminar slots ajenos.

## 2. FIX-CREATE-RELATIVE-WEEKEND-RANGE-PARSING-38

- Identificador: `FIX-CREATE-RELATIVE-WEEKEND-RANGE-PARSING-38`
- Nombre: `FIX-CREATE-RELATIVE-WEEKEND-RANGE-PARSING-38`
- Commit message: `FIX-CREATE-RELATIVE-WEEKEND-RANGE-PARSING-38`
- Hash: `0506d8ccdee2c24e19349926b3877f571b9791f2`
- Descripción breve: Se corrige el parsing de rangos relativos de fin de semana en `create` explícito, absorbiendo `del sábado al domingo` y `este finde`, y preservando single-date como `checkIn` contextual sin generar rangos inválidos.

## 3. FIX-AVAILABILITY-HANDOFF-STRICT-AFFIRMATION-37

- Identificador: `FIX-AVAILABILITY-HANDOFF-STRICT-AFFIRMATION-37`
- Nombre: `FIX-AVAILABILITY-HANDOFF-STRICT-AFFIRMATION-37`
- Commit message: `FIX-AVAILABILITY-HANDOFF-STRICT-AFFIRMATION-37`
- Hash: `299929677943b21e4124888bef7fe1eb7573f266`
- Descripción breve: Se endurece el handoff desde `availability_inquiry` hacia `create` para aceptar solo intención explícita de reserva, agregando una aclaración para respuestas ambiguas y cobertura unitaria positiva/negativa.

## 4. FIX-AVAILABILITY-INQUIRY-CREATE-HANDOFF-36

- Identificador: `FIX-AVAILABILITY-INQUIRY-CREATE-HANDOFF-36`
- Nombre: `FIX-AVAILABILITY-INQUIRY-CREATE-HANDOFF-36`
- Commit message: `fix(reservation-runtime): hand off positive availability inquiry into create`
- Hash: `d840457080f257fe29d9ccb8e93bfad046caf96c`
- Descripción breve: Se ajusta el runtime de reservation en `messageHandler` para hacer handoff desde `availability_inquiry` a `create` cuando hubo disponibilidad positiva previa y el usuario expresa intención de avanzar, reutilizando slots y pidiendo el siguiente faltante real.

## 5. FIX-CREATE-AVAILABILITY-INQUIRY-POLICY-35

- Identificador: `FIX-CREATE-AVAILABILITY-INQUIRY-POLICY-35`
- Nombre: `FIX-CREATE-AVAILABILITY-INQUIRY-POLICY-35`
- Commit message: `FIX-CREATE-AVAILABILITY-INQUIRY-POLICY-35`
- Hash: `61a4327aac45ae468917f1d922c65e47413b9da1`
- Descripción breve: Se explicita la separación entre availability inquiry y `reservation.create` dentro de `messageHandler`, con modo inquiry, persistencia no transaccional y actualización de `message_pipeline.md`.

## 6. FIX-CREATE-CHECKIN-PROMPT-FRAMING-34

- Identificador: `FIX-CREATE-CHECKIN-PROMPT-FRAMING-34`
- Nombre: `FIX-CREATE-CHECKIN-PROMPT-FRAMING-34`
- Commit message: `FIX-CREATE-CHECKIN-PROMPT-FRAMING-34`
- Hash: `3a95433483a86f44b654bb42598e5e8d551334cb`
- Descripción breve: Se corrige el wording de prompts de fecha faltante en contexto `create`, evitando framing de `modify` cuando el flujo está iniciando una reserva o consulta de disponibilidad.

## 7. FIX-CREATE-CONTEXTUAL-DATE-FOLLOWUP-33

- Identificador: `FIX-CREATE-CONTEXTUAL-DATE-FOLLOWUP-33`
- Nombre: `FIX-CREATE-CONTEXTUAL-DATE-FOLLOWUP-33`
- Commit message: `FIX-CREATE-CONTEXTUAL-DATE-FOLLOWUP-33`
- Hash: `d3bc86b34fde60dd3ccc48bd87912d7f1bf3c45a`
- Descripción breve: Se corrige `create` para absorber una única fecha contextual relativa o explícita cuando el runtime espera `checkIn` o `checkOut`, persistiendo el draft parcial antes de decidir el siguiente prompt y evitando repreguntas del mismo slot.

## 8. REFACTOR-RUNTIME-REFERENCE-RESOLUTION-ALIGNMENT-32

- Identificador: `REFACTOR-RUNTIME-REFERENCE-RESOLUTION-ALIGNMENT-32`
- Nombre: `REFACTOR-RUNTIME-REFERENCE-RESOLUTION-ALIGNMENT-32`
- Commit message: `REFACTOR-RUNTIME-REFERENCE-RESOLUTION-ALIGNMENT-32`
- Hash: `8728ac3d86aee21e1b062a8c2540096fda31b8ea`
- Descripción breve: Se explicita el boundary del slice reference resolution en `messageHandler`, separando el resultado de decisión de su consumo posterior sin mover lógica fuera del runtime local ni cambiar comportamiento observable.

## 9. REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-4

- Identificador: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-4`
- Nombre: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-4`
- Commit message: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-4`
- Hash: `0aafb17817f53ea57fd6f3a33a19d9d312c7edef`
- Descripción breve: Se estabilizan expectations de tests de `create` frente a rollover/calendario mediante actualización de fixtures de mes y uso de asserts menos frágiles para fechas.

## 10. REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-3

- Identificador: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-3`
- Nombre: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-3`
- Commit message: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-3`
- Hash: `942d54314c41ba139ee72ee5c51e54e64fc9973d`
- Descripción breve: Se agrega un sufficiency gating local en `messageHandler` para evitar activación prematura de `create` ante consultas vagas de disponibilidad o pedidos ambiguos para fin de semana.
