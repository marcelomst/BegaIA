<!-- Path: docs/product/demo_script_core_first_admin_supervision_refresh.md -->

# Demo BegaIA — Guion Canónico Post Dry Run Comercial

## 1. Estado Documental

```yaml
document_id: demo_script_core_first_admin_supervision_refresh
version: v6_post_commercial_dry_run
status: validated_for_controlled_commercial_presentations
approved_for_mass_production_claims: false
dry_run_date: 2026-07-22
observed_duration_until_farewell_input: 17m05s
observed_duration_including_farewell_response: 17m06s
nominal_target_duration: "15 minutos como referencia comercial, no como medición exacta"
runtime_map_applies: false
```

Este documento deja cerrado el estado documental de la demo comercial validada el 22/07/2026. La demo queda lista para presentaciones comerciales controladas con prospectos, sin presentarse como despliegue productivo masivo ni como promesa de automatización total.

## 2. Assets Versionados

- Demo comercial breve: [demo_comercial_15_min_begaia.html](demo-assets/demo_comercial_15_min_begaia.html)
- Demo extendida: [demo_extendida_begaia.html](demo-assets/demo_extendida_begaia.html)

La demo comercial es el recorrido recomendado para primer contacto. La demo extendida queda disponible para profundización operativa, técnica o comercial cuando el prospecto necesita ver más detalle.

## 3. Evidencia Del Dry Run

```yaml
dry_run:
  date: 2026-07-22
  start:
    at: 2026-07-22T20:25:08.498Z
    event: "primer mensaje Web: Hola"
  objective_end:
    at: 2026-07-22T20:42:13.646Z
    event: "mensaje Web: chau"
  technical_end:
    at: 2026-07-22T20:42:14.820Z
    event: "respuesta AI de farewell"
  duration_until_chau: "17:05"
  duration_including_farewell_response: "17:06"
  avg_ai_latency_observed: "aprox. 2,2s"
  max_ai_latency_observed: "aprox. 8,2s"
  canonical_guest_id: "cfcd4116-356d-4865-ab6b-63e1f8acbdfc"
```

## 4. Canales Y Conciliación

```yaml
channels:
  web: "Martin"
  email: "Martín P."
  whatsapp: "Martín Pérez"
result:
  multichannel_demo: validated
  canonical_guest: "cfcd4116-356d-4865-ab6b-63e1f8acbdfc"
  admin_guest_consolidation: validated_for_demo
```

Email se usa como reserva precargada fuera del cronómetro. Esta decisión mantiene la demo breve sin perder la evidencia multicanal.

## 5. Orden Real Del Snapshot

El orden correcto del snapshot consolidado siguió el orden real de ingreso. No hubo fallo del motor ordinal.

```yaml
reservations_order:
  - reservation_id: RES-A365BD
    guestName: "Ana Rodríguez"
    origin_channel: "Email precargado"
    roomType: "triple"
    dates: "2026-08-25 → 2026-08-27"
    guests: 3
  - reservation_id: RES-37A215
    guestName: "Laura Gómez"
    origin_channel: "Web"
    roomType: "doble"
    dates: "2026-08-14 → 2026-08-16"
    guests: 2
  - reservation_id: RES-77A568
    guestName: "Martín Pérez"
    origin_channel: "WhatsApp"
    roomType: "simple"
    dates: "2026-08-20 → 2026-08-22"
    guests: 1
```

La frase “la primera reserva” debe resolver a Ana Rodríguez, porque la reserva Email precargada fue la primera ingresada. La desincronización previa estaba en la chuleta, no en el runtime ordinal.

## 6. Recorrido Oficial — Demo Comercial Breve

Objetivo: primer contacto comercial con prospectos.

Fuente operativa: `docs/product/demo-assets/demo_comercial_15_min_begaia.html`

Secuencia:

1. Apertura Web y saludo.
2. FAQ breve.
3. Habitaciones visuales.
4. Disponibilidad sin reserva prematura.
5. Reserva Web con interlocutor distinto del titular.
6. Confirmación explícita.
7. Follow-up.
8. Admin Channels.
9. Preview visual en Admin Inbox.
10. Supervisión Web breve.
11. Transición multicanal.
12. Email precargado fuera del cronómetro.
13. WhatsApp.
14. Conciliación de “Los Martin”.
15. Snapshot de tres reservas.
16. Modify por ordinal sobre Ana Rodríguez.
17. Confirmación de modify.
18. Farewell.
19. Cierre comercial.

## 7. Recorrido Oficial — Demo Extendida

Objetivo: profundización operativa, técnica o comercial.

Fuente operativa: `docs/product/demo-assets/demo_extendida_begaia.html`

La demo extendida permite abrir más tiempo en:

- supervisión;
- consola Admin;
- identidad canónica;
- conciliación multicanal;
- richer previews;
- explicación de límites;
- lectura de arquitectura operativa sin prometer PMS/CRM completo.

## 8. Capacidades Demostradas

- Concierge Digital especializado en hotelería.
- Habitaciones visuales en widget.
- Preview visual en Admin.
- Disponibilidad exploratoria sin create prematuro.
- Reserva guiada y gobernada.
- Interlocutor conversacional distinto del titular transaccional.
- Web, Email y WhatsApp en demo controlada.
- Guest canónico multicanal.
- Admin como consola operativa.
- Automatización graduable por canal y supervisión.
- Snapshot consolidado.
- Modify por referencia ordinal.
- Preview antes de modificación.
- Confirmación explícita antes de acciones sensibles.
- Farewell natural como cierre medible.

## 9. Claims Permitidos

- BegaIA es un Concierge Digital para hotelería.
- Puede asistir consultas, disponibilidad y reservas guiadas.
- Puede operar una demo multicanal controlada con Web, Email y WhatsApp.
- Puede mostrar habitaciones visuales y contexto visual en Admin.
- Puede preservar continuidad bajo una identidad operativa común en la demo.
- Puede combinar automatización con supervisión humana.
- Puede pedir aclaración o confirmación antes de ejecutar acciones sensibles.

## 10. Claims No Permitidos

- No presentar como producción masiva lista sin matices.
- No presentar como onboarding automático completo.
- No presentar como PMS completo.
- No presentar como CRM completo.
- No prometer paridad productiva absoluta entre canales.
- No prometer automatización total.
- No incorporar métricas de ahorro, conversión o aumento de reservas.
- No incorporar pricing comercial no aprobado.

## 11. Cierre

La fase de preparación y validación de la demo comercial queda documentalmente cerrada. El próximo paso es usar el recorrido breve en presentaciones comerciales controladas y reservar el recorrido extendido para profundización.
