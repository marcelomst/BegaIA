<!-- Path: docs/product/presentation_use_cases_demo_selection.md -->

# BegaIA — Presentation Use Cases & Demo Selection

## 1. Estado

```yaml
document_status: validated_for_controlled_commercial_presentations
commercial_dry_run:
  date: 2026-07-22
  observed_duration: "17:05"
  observed_duration_including_farewell_response: "17:06"
strategic_reframe:
  id: COM-03-REFRAME-NARRATIVE-CAPABILITIES-DEMO-01
  main_question: "¿Qué hace BegaIA diferente de un bot hotelero competente?"
runtime_map_applies: false
```

Este documento define los recorridos oficiales de demo y qué capacidades pertenecen a cada uno.

La evidencia competitiva reciente obliga a reordenar el peso narrativo: FAQ, amenities, habitaciones, imágenes, disponibilidad, tarifas, links y handoff básico son capacidades útiles, pero no deben sostener la diferencia principal de BegaIA.

## 2. Objetivo De La Demo

La demo principal debe responder visualmente:

> ¿Qué hace BegaIA diferente cuando una conversación debe convertirse en una operación?

La respuesta esperada no es "BegaIA también responde". La respuesta debe ser:

```text
BegaIA permite conversaciones naturales y gobierna operaciones sensibles:
identidad, contexto, target, suficiencia, confirmación, supervisión y trazabilidad.
```

## 3. Principio De Diseño

Usar capacidades básicas como setup rápido:

- FAQ;
- habitaciones visuales;
- disponibilidad;
- tarifas.

Luego girar hacia el diferencial:

> Sí, BegaIA puede responder disponibilidad. Lo importante ocurre después: consultar no es reservar, entender no es ejecutar y decir "sí" no siempre autoriza una acción.

## 4. Recorrido A — Demo Comercial Breve Reencuadrada

```yaml
objective: "primer contacto con prospectos"
status: validated_baseline_reframed
observed_duration_previous_baseline: "17:05"
nominal_target: "15 minutos como referencia"
source: docs/product/demo-assets/demo_comercial_15_min_begaia.html
email_setup: "precargado fuera del cronómetro"
```

Secuencia recomendada:

1. Apertura Web muy breve.
2. Setup conversacional: FAQ o habitación visual en una escena corta.
3. Disponibilidad exploratoria: mostrar que consultar no crea reserva.
4. Giro narrativo: buenos asistentes hoteleros ya responden; BegaIA gobierna operaciones.
5. Reserva Web con titular distinto y confirmación explícita.
6. Identidad operativa y continuidad multicanal.
7. Snapshot consolidado de reservas.
8. Modify por ordinal con target explícito.
9. Preview y confirmación de modify.
10. Escena breve de guard: "sí" sin propuesta válida no confirma.
11. Supervisión humana: control antes de enviar.
12. Admin / trazabilidad visible según estado real.
13. Límites: no PMS, no CRM, no automatización total.
14. Piloto controlado.

## 5. Recorrido B — Demo Extendida

```yaml
objective: "profundización operativa, técnica o comercial"
status: available
source: docs/product/demo-assets/demo_extendida_begaia.html
```

Capacidades que puede profundizar:

- identidad canónica;
- aliases y consolidación multicanal;
- continuidad Web -> WhatsApp;
- target explícito;
- guards;
- confirmación explícita;
- supervisión y edición;
- trazabilidad visible;
- separación entre canal conversacional e integración transaccional;
- límites de PMS/CRM/Channel Manager;
- criterios de piloto controlado.

## 6. Clasificación De Demos

| Demo | Clasificación | Rol en presentación |
| --- | --- | --- |
| Apertura Web | SUPPORTING_DEMO | Iniciar conversación sin gastar tiempo diferencial |
| FAQ breve | SUPPORTING_DEMO | Mostrar utilidad básica; no diferenciar |
| Habitaciones rich | SUPPORTING_DEMO | Mostrar UX visual; no ocupar centro competitivo |
| Disponibilidad exploratoria | SUPPORTING_DEMO | Preparar distinción consultar vs reservar |
| Reserva Web con titular distinto | CORE_DEMO | Mostrar operación, contexto y separación de identidades |
| Confirmación explícita | CORE_DEMO | Mostrar ejecución responsable |
| "Sí" sin propuesta válida no confirma | CORE_DEMO | Mostrar guard memorable |
| Identidad canónica multicanal | CORE_DEMO | Mostrar continuidad operativa |
| Web -> WhatsApp | CORE_DEMO si el entorno está estable | Mostrar multicanalidad controlada |
| Snapshot consolidado | CORE_DEMO | Mostrar continuidad bajo una identidad |
| Modify por ordinal | CORE_DEMO | Mostrar target explícito |
| Preview de modify | CORE_DEMO | Mostrar acción sensible gobernada |
| Supervisión humana | CORE_DEMO | Mostrar control humano |
| Transición bot-humano clara | CORE_DEMO/PARTIAL | Mostrar control; no prometer más de lo visible |
| Trazabilidad | TECHNICAL_BACKUP/PARTIAL | Mostrar sólo lo real y visible |
| Cancel | TECHNICAL_BACKUP | Reservar para profundización si está estable |
| Amenities extensas | REMOVE_FROM_MAIN_DEMO | No diferencia frente al mercado observado |

## 7. Casos De Uso Presentables

### Consulta Frecuente

Valor: bajar fricción operativa en consultas repetidas.

Clasificación: `SUPPORTING_DEMO`.

Claim seguro: "BegaIA responde consultas frecuentes controladas del hotel."

Uso recomendado: escena breve de apertura, no eje diferencial.

### Exploración Visual De Habitaciones

Valor: mostrar opciones antes de reservar.

Clasificación: `SUPPORTING_DEMO`.

Claim seguro: "El huésped puede explorar habitaciones con fotos y características principales."

Uso recomendado: UX de apoyo. No presentarla como diferencial competitivo principal.

### Disponibilidad Sin Reserva Prematura

Valor: separar exploración de ejecución.

Clasificación: `SUPPORTING_DEMO` que prepara un `CORE_DEMO`.

Claim seguro: "BegaIA puede responder disponibilidad sin crear una reserva antes de tiempo."

Mensaje recomendado:

> Consultar disponibilidad no es reservar.

### Reserva Gobernada

Valor: guiar hacia una acción sensible con confirmación explícita.

Clasificación: `CORE_DEMO`.

Debe hacer visible:

- contexto;
- suficiencia de datos;
- propuesta;
- confirmación;
- ejecución.

Claim seguro: "BegaIA acompaña la reserva y confirma antes de ejecutar."

### Identidad Canónica Multicanal

Valor: mostrar que las conversaciones no quedan como hilos aislados.

Clasificación: `CORE_DEMO`.

Debe hacer visible:

- mismo huésped operativo;
- canales distintos;
- reservas consolidadas;
- continuidad bajo identidad común.

Claim seguro: "BegaIA ayuda a ordenar identidad operativa del huésped entre canales."

### Modify Con Target Y Preview

Valor: evitar modificar la reserva equivocada.

Clasificación: `CORE_DEMO`.

Debe mostrar:

- múltiples reservas;
- referencia natural;
- selección de target;
- preview;
- confirmación;
- modificación de la reserva correcta.

Claim seguro: "Antes de modificar, BegaIA identifica la reserva y muestra un preview."

### Guard: "Sí" Sin Propuesta Válida

Valor: explicar que entender una afirmación no es autorización suficiente para ejecutar.

Clasificación: `CORE_DEMO`.

Escena breve:

```text
Guest: sí
BegaIA: no confirma una operación si no existe propuesta válida o target suficiente.
```

Claim seguro:

> BegaIA no ejecuta acciones sensibles sólo porque detectó una intención afirmativa.

### Supervisión Humana

Valor: control operativo.

Clasificación: `CORE_DEMO`.

No mostrar sólo handoff. Mostrar:

- modo supervisado;
- control humano;
- claridad de quién responde;
- posibilidad de intervención;
- continuidad según estado real demostrado.

Claim seguro: "El hotel mantiene control humano cuando corresponde."

### Trazabilidad Visible

Valor: explicar qué queda registrado y visible para operación.

Clasificación: `TECHNICAL_BACKUP/PARTIAL`.

Uso recomendado: mostrar sólo lo que hoy sea real y visible. No inventar UI futura.

## 8. Orden Canónico Del Snapshot

Orden validado del baseline anterior:

1. Ana Rodríguez — Email precargado — triple — 25/08/2026 al 27/08/2026.
2. Laura Gómez — Web — doble — 14/08/2026 al 16/08/2026.
3. Martín Pérez — WhatsApp — simple — 20/08/2026 al 22/08/2026.

Interpretación:

- la primera reserva es Ana Rodríguez;
- "la primera reserva" en modify debe resolver a Ana Rodríguez;
- el orden es correcto porque sigue el ingreso real;
- la reserva Email fue precargada y no consume cronómetro.

## 9. Qué Debe Ver El Prospecto

En menos de 60 segundos por bloque diferencial, el prospecto debe poder entender:

- quién es el huésped operativo;
- qué conversación/canal está activo;
- qué operación se intenta realizar;
- qué reserva es el target;
- qué datos faltan o son suficientes;
- cuándo BegaIA pide confirmación;
- cuándo BegaIA bloquea;
- cuándo interviene recepción;
- qué resultado queda visible.

## 10. Demos A Mantener Pero Recontextualizar

Mantener:

- snapshot consolidado;
- reserva Web con titular distinto;
- modify por ordinal;
- preview + confirmación;
- Admin Channels;
- supervised mode;
- habitaciones rich;
- disponibilidad exploratoria.

Recontextualización:

- habitaciones y disponibilidad preparan el terreno;
- identidad, target, confirmación y supervisión demuestran la diferencia.

## 11. Demos A Bajar De Peso

- FAQ extensa;
- amenities;
- habitaciones visuales como escena larga;
- disponibilidad/tarifas como demostración principal;
- handoff básico sin control visible.

## 12. Wording De Demo

Wording recomendado:

- "Eso ya lo hacen buenos asistentes hoteleros; lo importante es qué pasa cuando hay que operar."
- "Consultar no es reservar."
- "Entender un 'sí' no alcanza para ejecutar."
- "BegaIA primero identifica el target y después permite confirmar."
- "El hotel mantiene control humano cuando corresponde."

Wording a evitar:

- "Somos mejores que PXSol."
- "Un proveedor específico no puede resolver esto."
- "Ningún bot hotelero tiene esta capacidad."
- "Esto sustituye al equipo de recepción."
- "Esto ya es un PMS/CRM/Channel Manager."

## 13. COM-03 -> COM-04 Gate

Antes de avanzar a COM-04, COM-03 debe dejar definido:

- propuesta de valor principal;
- claims fuertes;
- claims seguros;
- claims prohibidos;
- capacidades core;
- capacidades supporting;
- capacidades commodity;
- core demo;
- orden de demo;
- explicación comprensible de operaciones gobernadas;
- límites;
- framing frente a stacks existentes.

COM-04 no debe desarrollarse en este documento. Quedan fuera:

- mensajes por prospecto;
- secuencia de contacto;
- canal de abordaje;
- prioridad individual;
- discovery de hoteles específicos.

## 14. Claims A Evitar

- producción masiva sin matices;
- PMS integral;
- suite CRM integral;
- gestor integral de canales;
- automatización total;
- onboarding automático;
- paridad productiva absoluta;
- métricas de ahorro o conversión no validadas;
- superioridad general frente a PXSol o Asksuite;
- afirmaciones sobre capacidades internas de competidores sin evidencia suficiente.
