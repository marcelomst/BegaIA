<!-- Path: docs/product/presentation_narrative_base.md -->

# BegaIA — Presentation Narrative Base

## 1. Propósito

Este documento define la narrativa base para speech, deck, one-pager y reuniones con prospectos.

No es un deck final, no redefine arquitectura, no define pricing y no reemplaza los documentos estratégicos de evidencia competitiva.

## 2. Estado

```yaml
document_status: validated_for_controlled_commercial_presentations
commercial_dry_run:
  date: 2026-07-22
  duration_until_farewell_input: "17:05"
  duration_including_farewell_response: "17:06"
demo_assets:
  commercial: docs/product/demo-assets/demo_comercial_15_min_begaia.html
  extended: docs/product/demo-assets/demo_extendida_begaia.html
strategic_reframe:
  id: COM-03-REFRAME-NARRATIVE-CAPABILITIES-DEMO-01
  basis:
    - docs/product/pxsol_begaia_competitive_analysis.md
    - docs/product/hotel_conversational_market_observation.md
runtime_map_applies: false
```

La demo comercial breve fue validada en dry run real. El objetivo nominal de 15 minutos queda como referencia comercial, no como medición exacta.

## 3. Tesis Comercial

```text
Conversaciones naturales. Operaciones gobernadas.
```

BegaIA no debe presentarse como un chatbot genérico ni como "IA para hoteles".

La evidencia competitiva reciente muestra que varias capacidades conversacionales visibles ya aparecen cubiertas por proveedores reales del mercado: FAQ, amenities, horarios, habitaciones, imágenes, disponibilidad, tarifas, políticas, links, formularios, recomendaciones básicas y handoff.

Por eso, la tesis comercial de BegaIA no debe ser que el sistema responde. La tesis debe ser que ayuda a gobernar qué ocurre cuando una conversación debe convertirse en una operación del hotel.

Formulación recomendada:

> BegaIA es el Concierge Digital del hotel: permite conversaciones naturales con huéspedes y ayuda a convertirlas en operaciones gobernadas, con contexto, identidad, confirmación explícita, supervisión humana y límites claros.

## 4. Conversación Natural vs Operación Gobernada

### Conversación Natural

El huésped escribe como quiere, sin tener que adaptarse desde el inicio a formularios rígidos.

BegaIA puede responder consultas, orientar al huésped, mostrar información útil y acompañar recorridos de reserva.

Estas capacidades son necesarias, pero no bastan como diferencial comercial principal.

### Operación Gobernada

El sistema no ejecuta simplemente porque interpretó una intención.

Antes de actuar, debe preservar contexto, identificar la operación, identificar el target correcto, validar suficiencia de datos, aplicar guards y pedir confirmación cuando corresponde.

Secuencia conceptual para explicar la idea:

```text
El huésped escribe libremente
-> BegaIA interpreta
-> conserva contexto
-> identifica la operación
-> identifica target
-> valida suficiencia
-> aplica guards
-> solicita confirmación cuando corresponde
-> ejecuta
-> registra resultado
-> permite supervisión
```

Esta secuencia es una explicación comercial de gobernanza. No es un diagrama literal exhaustivo del runtime.

## 5. Narrativa Base

El problema no termina cuando la IA entiende al huésped.

El problema empieza cuando esa interpretación debe convertirse en una acción responsable sobre la operación del hotel: crear una reserva, modificarla, seleccionar una reserva entre varias, mantener continuidad entre canales o decidir cuándo debe intervenir recepción.

BegaIA se posiciona como una capa conversacional y operativa para hotelería. Su valor no está en reemplazar la hospitalidad humana, sino en ampliar la capacidad del equipo manteniendo control, contexto y trazabilidad.

Relato corto recomendado:

> BegaIA ayuda al hotel a atender conversaciones naturales y convertirlas en operaciones gobernadas. El huésped puede consultar, avanzar hacia una reserva o pedir cambios; el hotel mantiene control mediante identidad operativa, confirmación explícita, supervisión humana y límites claros.

## 6. Capacidades Demostradas En La Demo Comercial

Capacidades core para explicar diferenciación:

- identidad operativa del huésped entre canales;
- continuidad multicanal en demo controlada;
- reserva guiada con confirmación explícita;
- interlocutor conversacional distinto del titular de reserva;
- snapshot consolidado de reservas;
- modify por referencia ordinal;
- preview antes de modify;
- supervisión humana desde Admin;
- automatización graduable;
- piloto controlado, no despliegue masivo sin matices.

Capacidades de soporte para construir la experiencia:

- apertura Web;
- consulta frecuente breve;
- exploración visual de habitaciones;
- disponibilidad exploratoria;
- tarifas en contexto de demo;
- Admin como consola operativa;
- Email precargado fuera del cronómetro;
- WhatsApp Twilio como punto de entrada controlado;
- farewell natural como cierre medible.

## 7. Recorte De Uso Comercial

### Demo Comercial Breve

Uso recomendado:

- primer contacto con prospectos;
- conversación inicial con dirección o gerencia;
- mostrar valor visible sin densificar arquitectura;
- demostrar por qué BegaIA es distinto de un bot hotelero competente.

Fuente:

- `docs/product/demo-assets/demo_comercial_15_min_begaia.html`

La demo breve debe usar FAQ, habitaciones y disponibilidad como setup. El núcleo debe mostrar operación gobernada: identidad, target, confirmación, modify y supervisión.

### Demo Extendida

Uso recomendado:

- profundización operativa;
- conversación técnica o comercial más larga;
- revisión de Admin, supervisión, identidad multicanal, target y trazabilidad;
- explicación prudente de límites frente a PMS, CRM y Channel Manager.

Fuente:

- `docs/product/demo-assets/demo_extendida_begaia.html`

## 8. Claims Fuertes

- "BegaIA no sólo conversa: gobierna cuándo una conversación puede convertirse en una operación."
- "Antes de ejecutar acciones sensibles, BegaIA valida contexto y pide confirmación."
- "BegaIA ayuda a ordenar identidad operativa del huésped entre canales."
- "El hotel mantiene control humano cuando corresponde."

## 9. Claims Seguros

- "Concierge Digital para hotelería."
- "Demo controlada con Web, Email y WhatsApp."
- "Disponibilidad exploratoria sin crear reserva prematura."
- "Reserva guiada con confirmación explícita."
- "Piloto controlado para validar operación y valor con el hotel."

## 10. Claims De Soporte

Estos claims pueden usarse para explicar la experiencia, pero no como diferenciadores competitivos principales:

- responde consultas frecuentes;
- muestra habitaciones e imágenes;
- informa disponibilidad y tarifas en demo;
- acompaña recorridos de reserva;
- permite intervención humana.

## 11. Wording A Evitar

- "Automatiza todo el hotel."
- "Sustituye al equipo de recepción."
- "Funciona como suite CRM integral."
- "Funciona como PMS integral."
- "Funciona como Channel Manager integral."
- "Paridad productiva absoluta en todos los canales."
- "Onboarding automático sin operación."
- "Aumenta reservas en X%."
- "Reduce costos en X%."
- "BegaIA queda por encima de cualquier proveedor específico."
- "BegaIA queda por encima de asistentes hoteleros especializados."
- "Los competidores carecen de mecanismos internos de control."
- "Cualquier hotel necesita BegaIA."

## 12. Posicionamiento Competitivo Prudente

No conviene presentar COM-03 como "BegaIA vs PXSol" o "BegaIA vs Asksuite".

Framing recomendado:

> El mercado ya dispone de buenas herramientas conversacionales para hoteles. BegaIA pone el foco en la capa que decide cómo pasar de conversación a operación con control, confirmación, identidad y trazabilidad.

Este framing evita atacar competidores y concentra la conversación en el problema operativo.

## 13. Cierre Narrativo

Frase final sugerida:

> BegaIA se plantea como demo comercial y piloto controlado: una forma concreta de validar cómo el hotel puede convertir conversaciones naturales en operaciones gobernadas, sin prometer automatización total ni reemplazo de recepción.
