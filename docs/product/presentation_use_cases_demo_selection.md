<!-- Path: docs/product/presentation_use_cases_demo_selection.md -->

# BegaIA — Presentation Use Cases & Demo Selection

## 1. Estado

```yaml
document_status: validated_for_controlled_commercial_presentations
commercial_dry_run:
  date: 2026-07-22
  observed_duration: "17:05"
  observed_duration_including_farewell_response: "17:06"
runtime_map_applies: false
```

Este documento define los recorridos oficiales de demo y qué capacidades pertenecen a cada uno.

## 2. Recorrido A — Demo Comercial Breve

```yaml
objective: "primer contacto con prospectos"
status: validated
observed_duration: "17:05"
nominal_target: "15 minutos como referencia"
source: docs/product/demo-assets/demo_comercial_15_min_begaia.html
email_setup: "precargado fuera del cronómetro"
```

Capacidades incluidas:

- apertura Web;
- FAQ breve;
- habitaciones visuales;
- disponibilidad exploratoria;
- reserva Web;
- confirmación explícita;
- follow-up;
- Admin Channels;
- preview visual;
- supervisión Web breve;
- transición multicanal;
- Email precargado;
- WhatsApp;
- conciliación de “Los Martin”;
- snapshot de tres reservas;
- modify por ordinal;
- confirmación de modify;
- farewell;
- cierre comercial.

Orden canónico del snapshot:

1. Ana Rodríguez — Email precargado — triple — 25/08/2026 al 27/08/2026.
2. Laura Gómez — Web — doble — 14/08/2026 al 16/08/2026.
3. Martín Pérez — WhatsApp — simple — 20/08/2026 al 22/08/2026.

Interpretación:

- la primera reserva es Ana Rodríguez;
- “la primera reserva” en modify debe resolver a Ana Rodríguez;
- el orden es correcto porque sigue el ingreso real;
- la reserva Email fue precargada y no consume cronómetro.

## 3. Recorrido B — Demo Extendida

```yaml
objective: "profundización operativa, técnica o comercial"
status: available
source: docs/product/demo-assets/demo_extendida_begaia.html
```

Capacidades que puede profundizar:

- explicación más lenta de Admin;
- supervisión y edición;
- identidad canónica;
- conciliación multicanal;
- rich previews;
- separación entre canal conversacional e integración transaccional;
- límites de PMS/CRM;
- criterios de piloto controlado.

## 4. Casos De Uso Presentables

### Consulta Frecuente

Valor: bajar fricción operativa en consultas repetidas.

Claim seguro: “BegaIA responde consultas frecuentes controladas del hotel.”

### Exploración Visual De Habitaciones

Valor: mostrar opciones antes de reservar.

Claim seguro: “El huésped puede explorar habitaciones con fotos y características principales.”

### Disponibilidad Sin Reserva Prematura

Valor: separar exploración de ejecución.

Claim seguro: “BegaIA puede responder disponibilidad sin crear una reserva antes de tiempo.”

### Reserva Gobernada

Valor: guiar a confirmación explícita.

Claim seguro: “BegaIA acompaña la reserva y confirma antes de ejecutar.”

### Multicanal Controlado

Valor: ordenar Web, Email y WhatsApp en una operación demo.

Claim seguro: “BegaIA puede operar un recorrido multicanal controlado.”

### Modify Con Preview

Valor: evitar cambios sensibles sin revisión.

Claim seguro: “Antes de modificar, BegaIA identifica la reserva y muestra un preview.”

## 5. Claims A Evitar

- producción masiva sin matices;
- PMS completo;
- CRM completo;
- automatización total;
- onboarding automático;
- paridad productiva absoluta;
- métricas de ahorro o conversión no validadas.
