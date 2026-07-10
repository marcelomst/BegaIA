<!-- Path: docs/product/demo_script_core_first_admin_supervision_refresh.md -->

# DEMO BEGAIA — GUIÓN OPERATIVO DRAFT V5 POST KB/RICH ROOMS

## 1. STATUS

```yaml
document_id: demo_script_core_first_admin_supervision_refresh
version: v5_draft_after_kb_rich_rooms
status: draft
approved: false
canonical_final: false
repo_status: proposed_to_version_as_draft
current_use: "working draft versionado para análisis comercial y dry run medium"
document_hito_status: "pendiente hasta dry run limpio"

recommended_next_action:
  - versionar este draft como fuente de trabajo
  - ejecutar análisis comercial post KB/rich rooms
  - ensayar medium dry run
  - documentar versión final solo después de dry run limpio

demo_readiness:
  data_setup_ready: yes
  identity_model_ready: yes
  admin_channels_ready: yes
  admin_supervision_ready: yes
  email_in_demo_ready: yes
  modify_safe_flow_ready: yes
  room_visual_widget_ready: yes
  room_visual_admin_preview_ready: yes
  dry_run_ready: yes
  recommended_first_dry_run: medium

latest_relevant_hitos:
  - FIX-ROOM-INFO-IMG-PUBLICATION-ROUTING-RICH-01
  - FIX-ADMIN-ROOM-INFO-IMG-RICH-PREVIEW-01
  - FIX-KB-FASTPATH-SHARED-PRECEDENCE-POLICY-01
  - FIX-MESSAGEHANDLER-KB-FASTPATH-ARRIVALS-TRANSPORT-ROUTING-01
  - FIX-ADMIN-INBOX-SUPERVISED-EDIT-PREFILL-01
  - FIX-DEMO-ADMIN-CHANNELS-READPATH-AND-MOCK-DATA-01
  - FIX-EMAIL-INLINE-CONVERSATIONAL-ACTOR-PARITY-01

runtime_map:
  status: "no refresh requerido para este draft documental"
  note: "los hitos runtime ya fueron documentados en sus cierres respectivos"
```

### Lectura actual

La demo ya no debe mostrarse solo como conversación + reserva + administración. Después de los últimos hitos, también puede mostrar **experiencia visual de habitaciones** en el widget y **preview visual en Admin**.

La demo actual puede mostrar:

- Web core completo;
- saludo con branding;
- FAQ breve;
- exploración visual de habitaciones;
- disponibilidad sin reserva prematura;
- reserva guiada;
- confirmación explícita;
- snapshot/follow-up;
- Admin Channels con lectura real de configuración;
- modo automático/supervisado por canal;
- escena simple de supervisión Web;
- respuesta supervisada revisada por recepcionista y entregada al widget;
- Admin Inbox con preview visual de habitaciones cuando existe `rich`;
- Email como canal operativo controlado;
- WhatsApp si el entorno está estable;
- Admin Guests / Profile / Conversations;
- continuidad multicanal con snapshot consolidado;
- modify con flujo seguro por ordinal.

La recomendación operativa sigue siendo ensayar versión `medium`, pero incorporando una escena breve de habitaciones visuales y reduciendo escenas menos críticas para no saturar.

---

## 2. POSICIONAMIENTO COMERCIAL ACTUALIZADO

### Frase base

> “BegaIA no es un chatbot genérico. Es un Concierge Digital para hotelería: responde consultas, muestra información útil del hotel, acompaña reservas y ayuda a ordenar la operación con control humano.”

### Valor diferencial actualizado

```yaml
commercial_value:
  conversational:
    - responde consultas frecuentes
    - sostiene continuidad de conversación
    - distingue quién conversa de a nombre de quién queda la reserva

  transactional:
    - consulta disponibilidad sin crear reserva prematura
    - propone reserva con resumen
    - exige confirmación explícita
    - permite modificar con selección, preview y confirmación

  visual:
    - muestra habitaciones con fotos y características
    - evita bloques largos de markdown para inventario visual
    - permite al huésped explorar opciones antes de reservar
    - permite al Admin ver preview visual del mismo contexto

  operational:
    - Admin muestra guests, conversaciones, canales y supervisión
    - automatización graduable por canal
    - supervisión humana para respuestas operativas
    - Email y WhatsApp se muestran como canales controlados
```

### Claim central recomendado

> “BegaIA combina conversación, operación y control: el huésped puede consultar, explorar habitaciones y avanzar hacia una reserva; el hotel conserva supervisión y trazabilidad desde Admin.”

---

## 3. ESTRUCTURA FINAL DE DEMO

La estructura recomendada queda como:

```yaml
demo_structure: core_first_plus_visual_rooms_plus_admin_supervision
```

### Ruta estándar

1. Abrir con core demo en Web.
2. Mostrar valor visible: FAQ breve.
3. Mostrar exploración visual de habitaciones.
4. Mostrar disponibilidad sin reserva prematura.
5. Crear reserva Web con titular distinto.
6. Confirmar reserva.
7. Mostrar follow-up/snapshot breve.
8. Mostrar Admin Channels.
9. Mostrar escena breve de supervisión Web.
10. Mostrar en Admin que puede ver conversación y preview visual.
11. Transicionar a deep dive.
12. Reutilizar la reserva Web ya creada; no recrearla.
13. Crear reservas por WhatsApp y Email si el entorno acompaña.
14. Mostrar Admin Guests / Profile / Conversations.
15. Mostrar snapshot consolidado.
16. Mostrar modify usando flujo seguro por ordinal.
17. Cerrar con valor comercial: experiencia, control, continuidad y gobernanza.

### Orden narrativo

- valor visible primero;
- experiencia visual antes de transacción;
- control operativo después;
- multicanalidad como profundidad;
- supervisión como valor comercial, no como limitación;
- claims prudentes siempre;
- Email incluido por relevancia operativa hotelera;
- WhatsApp como demo controlada;
- Channel Manager como integración transaccional, no como chat;
- no mezclar interlocutor conversacional con titular transaccional;
- no convertir la demo en troubleshooting técnico;
- no sobreexplicar arquitectura interna.

### Duraciones

```yaml
durations:
  short: "10 a 12 min"
  medium: "18 a 24 min"
  full: "30 min"
```

### Recomendación actual

```yaml
first_rehearsal:
  version: medium
  include_visual_rooms: yes
  email: included
  whatsapp: optional_if_stable
  admin_supervision: included
  modify_flow: safe_ordinal_flow
  reason: >
    Valida experiencia huésped, inventario visual, control humano,
    multicanalidad, Email, snapshot consolidado y modify seguro sin saturar.
```

---

## 4. CORE SCRIPT V5

### Escena 1 — Apertura Concierge Digital

- duración estimada: 1 min
- pantalla/canal: Web
- texto hablado:

> “BegaIA no está pensado como un chatbot genérico. Lo presentamos como el Concierge Digital del hotel: responde consultas, muestra información útil, acompaña reservas y ayuda a sostener continuidad con el huésped, combinando automatización con control humano.”

### Input sugerido

```text
Hola
```

Luego:

```text
Jose
```

### Output esperado

```text
Hola, soy Selene, la asistente hotelera digital de Hotel Demo. ¿Cómo preferís que te llame?
```

Luego:

```text
Encantada, Jose. ¿En qué puedo ayudarte hoy?
```

### Claim reforzado

Concierge digital especializado en hotelería.

### Fallback

> “El saludo es solo la entrada. Lo importante es cómo maneja consultas y acciones del huésped.”

---

### Escena 2 — Consulta frecuente breve

- duración estimada: 45 segundos
- pantalla/canal: Web
- texto hablado:

> “Empiezo por algo simple y real: preguntas repetitivas que hoy consumen tiempo de recepción.”

### Input recomendado

```text
¿A qué hora es el check-in?
```

### Output esperado

```text
El check-in comienza a las 15:00.
```

### Claim reforzado

Puede asistir consultas frecuentes del huésped con respuestas breves y controladas.

### Observación

Para ahorrar tiempo en versión medium, usar solo una FAQ. La pregunta de parking queda como fallback.

### Fallback

```text
¿Tienen parking?
```

---

### Escena 3 — Exploración visual de habitaciones

- duración estimada: 1 a 1.5 min
- pantalla/canal: Web
- texto hablado:

> “Antes de reservar, el huésped muchas veces quiere explorar opciones. Acá BegaIA no responde con un bloque largo de texto: muestra tipos de habitación con fotos y características principales.”

### Input recomendado

```text
mostrame habitaciones
```

### Output esperado

```text
Estas son las habitaciones disponibles, con fotos y características principales. ¿Querés que te ayude a elegir una?
```

### Resultado visual esperado

```yaml
trace: retrieval_based/room_info_img
widget:
  rich_visible: yes
  raw_markdown_visible: no
  rooms_visible:
    - Single Standard
    - Doble
    - Twin
    - Triple
admin:
  preview_visual_available: yes
  format: grid
```

### Claim reforzado

BegaIA puede mostrar inventario visual de habitaciones desde contenido estructurado del hotel.

### Frase útil

> “Esto ayuda a pasar de una respuesta de texto a una experiencia más cercana a venta hotelera.”

### Observación

No prometer CMS completo de habitaciones. Mostrarlo como capacidad visual del concierge.

### Fallback

Si no cargan imágenes:

> “La intención de producto es que el huésped pueda explorar habitaciones visualmente. Si el entorno no carga imágenes ahora, sigo con disponibilidad y reserva, que es el flujo transaccional principal.”

---

### Escena 4 — Disponibilidad sin reserva prematura

- duración estimada: 1.5 min
- pantalla/canal: Web
- texto hablado:

> “Ahora paso a una consulta con intención comercial, pero sin asumir reserva antes de tiempo.”

### Input recomendado

```text
Quiero saber si tienen disponibilidad del 14 al 16 de agosto para dos personas.
```

### Output esperado

Puede pedir tipo de habitación:

```text
¿Cuál es el tipo de habitación?
```

Luego:

```text
doble
```

Output esperado:

```text
Tengo doble disponible. Tarifa por noche: 115 USD. Total 2 noches: 230 USD.

Si querés reservar, después puedo ayudarte a completar la reserva.
```

### Claim reforzado

Puede manejar disponibilidad sin abrir una reserva prematuramente.

### Fallback

```text
¿Tienen disponibilidad del 14 al 16 de agosto para dos personas en doble?
```

---

### Escena 5 — Handoff a reserva guiada con titular distinto

- duración estimada: 2 min
- pantalla/canal: Web
- texto hablado:

> “Lo importante acá es que solo avanza a reserva cuando el huésped lo expresa. Además, una persona puede conversar y reservar a nombre de otra.”

### Input recomendado

```text
Hola, soy Martín. Quiero reservar una habitación doble del 14 al 16 de agosto para dos personas, a nombre de Laura Gómez.
```

### Output esperado

```text
Martín, tengo doble disponible para Laura Gómez. Tarifa por noche: 115 USD. Total 2 noches: 230 USD.

¿Confirmás la reserva? Respondé “CONFIRMAR”.
```

### Resultado esperado estructural

```yaml
conversational_actor: Martín
guestName: Laura Gómez
roomType: doble
checkIn: 2026-08-14
checkOut: 2026-08-16
numGuests: 2
```

### Claim reforzado

Guía reservas conversacionales y distingue interlocutor vs titular transaccional.

### Fallback verbal

> “El interlocutor es Martín; la reserva queda a nombre de Laura Gómez.”

---

### Escena 6 — Confirmación explícita

- duración estimada: 1 min
- pantalla/canal: Web
- texto hablado:

> “En acciones sensibles, la lógica correcta no es adivinar ni ejecutar de más, sino proponer y confirmar.”

### Input

```text
Confirmar
```

### Output esperado

```text
✅ ¡Reserva confirmada! Código RES-XXXXXX.
Habitación doble, Fechas 2026-08-14 → 2026-08-16 · 2 huéspedes · Reserva a nombre de Laura Gómez.
```

### Claim reforzado

Confirmación explícita antes de cerrar una acción sensible.

### Fallback

> “Acá lo importante es que recién después de confirmar se genera la reserva.”

---

### Escena 7 — Follow-up breve

- duración estimada: 1 min
- pantalla/canal: Web
- texto hablado:

> “La conversación no empieza de cero en cada turno. Ahora hago un follow-up simple.”

### Input

```text
Mostrame mi reserva.
```

### Output esperado

```text
Este es el resumen de tu reserva:
- Código: RES-XXXXXX
- Estado: Activa
- Nombre: Laura Gómez
- Habitación: doble
- Fechas: 14/08/2026 → 16/08/2026
- Huéspedes: 2
```

### Claim reforzado

Continuidad conversacional.

### Observación

El vocativo debe apuntar al interlocutor. El titular de la reserva sigue siendo Laura Gómez.

---

## 5. ADMIN CONTROL Y SUPERVISIÓN

### Escena 8 — Admin Channels: control por canal

- duración estimada: 1.5 min
- pantalla/canal: Admin Channels
- texto hablado:

> “El hotel no tiene que elegir entre todo automático o todo manual. Puede graduar el nivel de automatización por canal.”

### Qué mostrar

```yaml
channel_modes_example:
  web: automatic_or_supervised
  whatsapp: automatic_or_supervised
  email: automatic_or_supervised
  channel_manager: transactional_integration
```

Mostrar:

- canales configurados;
- canales no configurados sin datos heredados;
- badges de modo;
- Channel Manager como integración transaccional.

### Claim reforzado

Automatización graduable por canal.

### Fallback

> “El punto comercial es que el hotel conserva gobierno operativo por canal.”

---

### Escena 9 — Admin preview visual de habitaciones

- duración estimada: 45 segundos
- pantalla/canal: Admin Inbox / conversación
- texto hablado:

> “Y del lado operativo, recepción también puede ver el contexto visual. Si el huésped está explorando habitaciones, Admin no queda solamente con texto: puede ver una preview visual.”

### Acción

Abrir la conversación donde se respondió:

```text
mostrame habitaciones
```

### Output esperado en Admin

```yaml
admin_preview:
  trace: retrieval_based/room_info_img
  format: grid
  rooms_visible:
    - Single Standard
    - Doble
    - Twin
    - Triple
  images_visible: yes
```

### Claim reforzado

El Admin puede acompañar la conversación con contexto visual.

### Observación

No exigir carrusel. La grilla es válida para Admin.

### Fallback

> “El widget muestra la experiencia del huésped; Admin muestra una preview operativa suficiente para recepción.”

---

### Escena 10 — Modo supervisado Web

- duración estimada: 2 a 3 min
- pantalla/canal: Web + Admin Inbox
- texto hablado:

> “Ahora muestro un punto importante para operación hotelera. Supervisado no significa que todo queda bloqueado. El asistente puede manejar saludos o contexto simple, pero cuando aparece una intención operativa —como una reserva— el hotel puede revisar antes de enviar.”

### Preparación

Configurar canal Web en modo supervisado desde Admin Channels.

### Flujo en Widget Web

```text
GUEST: Hola
```

Output esperado:

```text
Hola, soy Selene, la asistente hotelera digital de Hotel Demo. ¿Cómo preferís que te llame?
```

Luego:

```text
GUEST: Martin
```

Output esperado:

```text
Encantada, Martin. ¿En qué puedo ayudarte hoy?
```

Luego:

```text
GUEST: Quiero hacer una reserva
```

Output esperado en Widget:

```text
🕓 Tu consulta está siendo revisada por un recepcionista.
```

### Flujo en Admin Inbox

Sugerencia esperada:

```text
¿Cuál es el tipo de habitación?
```

Marcelo hace click en:

```text
Editar y enviar
```

El textarea debe aparecer precargado con la sugerencia.

Texto posible:

```text
Martin, ¿cuál es el tipo de habitación que preferís?
```

Luego click en:

```text
Guardar y enviar
```

### Resultado esperado en Widget

```text
Martin, ¿cuál es el tipo de habitación que preferís?
```

Luego:

```text
GUEST: una doble
```

Output esperado:

```text
🕓 Tu consulta está siendo revisada por un recepcionista.
```

### Claim reforzado

El hotel puede combinar automatización y control humano: no se revisa cada saludo trivial, pero sí se puede supervisar una intención operativa.

### Fallback

> “El punto de producto es que la respuesta queda pendiente para revisión humana y luego se entrega al huésped.”

---

## 6. DEEP DIVE MULTICANAL

### Escena 11 — Marco multicanal sin duplicar reserva Web

- duración estimada: 45 segundos
- pantalla/canal: transición oral
- texto hablado:

> “Hasta acá vimos el caso Web completo y cómo el hotel puede gobernar la automatización. Para no duplicar pasos, uso la reserva Web ya creada como primera pieza del escenario multicanal. Ahora agrego otros puntos de entrada: WhatsApp y Email.”

### Claim reforzado

Multicanalidad con lógica común, sin repetir artificialmente el flujo.

---

### Escena 12 — Reserva Web semilla ya creada

- duración estimada: 30 segundos
- pantalla/canal: Web o transición oral
- texto hablado:

> “La primera reserva del escenario ya quedó creada en Web: Martín conversó, pero la reserva quedó a nombre de Laura Gómez.”

### Reserva esperada

```yaml
channel_origin: Web
conversational_actor: Martín
display_name: Martín
guestName: Laura Gómez
room_type: doble
dates: 14 al 16 de agosto
expected_dates_iso: 2026-08-14 → 2026-08-16
guests: 2
```

### Fallback

Si se empieza el deep dive desde base limpia:

```text
Hola, soy Martín. Quiero reservar una habitación doble del 14 al 16 de agosto para dos personas, a nombre de Laura Gómez.
```

---

### Escena 13 — Reserva WhatsApp

- duración estimada: 2 min
- pantalla/canal: WhatsApp
- texto hablado:

> “Ahora el mismo huésped aparece por otro canal, en un caso simple donde interlocutor y titular coinciden.”

### Input

```text
Hola, soy Martín Pérez. Quiero reservar una single del 20 al 22 de agosto para una persona.
```

### Output esperado

Puede pedir titular:

```text
¿A nombre de quién sería la reserva? (nombre y apellido)
```

Entonces:

```text
Martin Perez
```

Output:

```text
Martín, tengo simple disponible para Martin Perez. Tarifa por noche: 70 USD. Total 2 noches: 140 USD.

¿Confirmás la reserva? Respondé “CONFIRMAR”.
```

Luego:

```text
confirmar
```

Confirmación:

```text
✅ ¡Reserva confirmada! Código RES-XXXXXX.
Habitación simple, Fechas 2026-08-20 → 2026-08-22 · 1 huésped · Reserva a nombre de Martin Perez.
```

### Claim reforzado

Puede operar también en WhatsApp en entorno controlado.

### Fallback

> “Para no convertir la reunión en troubleshooting del canal, sigo con Web, Email y Admin.”

---

### Escena 14 — Reserva Email

- duración estimada: 2 min
- pantalla/canal: Email
- texto hablado:

> “Email es importante en hotelería porque muchas interacciones llegan desde intermediarios, OTAs o cadenas de reenvío. Por eso lo mantengo dentro de la demo: no solo como canal de consulta, sino como punto real de entrada operativo.”

### Input

```text
Hola, soy Martín P. Quisiera reservar una triple del 25 al 27 de agosto para tres personas, a nombre de Ana Rodríguez.
```

### Output esperado

```text
Tengo triple disponible para Ana Rodríguez. Tarifa por noche: 140 USD. Total 2 noches: 280 USD.

¿Confirmás la reserva? Respondé “CONFIRMAR”.
```

Luego:

```text
confirmar
```

Confirmación:

```text
✅ ¡Reserva confirmada! Código RES-XXXXXX.
Habitación triple, Fechas 2026-08-25 → 2026-08-27 · 3 huéspedes · Reserva a nombre de Ana Rodríguez.
```

### Resultado esperado

```yaml
channel_origin: Email
conversational_actor: Martín P.
display_name: Martín P.
guestName: Ana Rodríguez
room_type: triple
dates: 25 al 27 de agosto
expected_dates_iso: 2026-08-25 → 2026-08-27
guests: 3
```

### Claim reforzado

Email puede operar como canal controlado dentro del flujo multicanal.

### Fallback

> “Email tiene particularidades de presentación y threading. El valor acá es que la intención se entiende y la operación queda registrada.”

---

## 7. ADMIN OPERATION SCRIPT

### Escena 15 — Admin overview

- duración estimada: 1.5 min
- pantalla/canal: Admin
- texto hablado:

> “Acá aparece la capa operativa del hotel. El valor no es solo responder: también ayudar a ordenar guests, conversaciones, canales y seguimiento.”

### Mostrar

- Guests;
- conversaciones generadas;
- guest profile;
- reservas visibles;
- Admin Channels si aporta valor;
- preview visual si está disponible.

### Claim reforzado

Admin como capa operativa.

### Fallback

> “La capa operativa existe para ordenar guests, conversaciones y reservas.”

---

### Escena 16 — Conciliación de guests

- duración estimada: 1.5 a 2 min
- pantalla/canal: Admin Guests
- estado: opcional en medium, recomendado en full
- texto hablado:

> “Si el mismo huésped aparece por más de un canal, el hotel puede consolidar identidad de forma operativa. No lo presento como CRM completo, sino como control útil.”

### Claim reforzado

Consolidación operativa de identidad.

### Fallback

> “No lo presento como CRM completo; lo presento como control operativo.”

---

### Escena 17 — Supervisión por guest

- duración estimada: 1 min
- pantalla/canal: Admin
- estado: opcional
- texto hablado:

> “Y ese control puede bajar a un huésped puntual, aunque el canal esté más automatizado.”

### Claim reforzado

Control operativo granular.

### Fallback

> “El control no es solamente por canal; también puede aplicarse a un huésped puntual.”

---

## 8. SNAPSHOT Y MODIFY

### Escena 18 — Snapshot consolidado

- duración estimada: 2 min
- pantalla/canal: Web
- texto hablado:

> “Ahora vuelvo a la conversación y pido ver las reservas después de haber trabajado con distintos canales.”

### Input

```text
Mostrame mis reservas.
```

### Output esperado

```text
Martín, estas son tus reservas:
1. RES-XXXXXX · activa · a nombre de Laura Gómez · habitación: doble · 14/08/2026 → 16/08/2026 · huéspedes: 2
2. RES-XXXXXX · activa · a nombre de Martín Pérez · habitación: simple · 20/08/2026 → 22/08/2026 · huésped: 1
3. RES-XXXXXX · activa · a nombre de Ana Rodríguez · habitación: triple · 25/08/2026 → 27/08/2026 · huéspedes: 3
```

### Claim reforzado

Continuidad multicanal con operación ordenada.

### Fallback

> “Después de consolidar identidad, la expectativa de producto es ordenar mejor la vista del huésped.”

---

### Escena 19 — Modify con preview usando flujo seguro por ordinal

- duración estimada: 3 min
- pantalla/canal: Web
- texto hablado:

> “Lo último que muestro es una acción sensible sobre una reserva ya identificada. Por diseño, no ejecuta directo: primero selecciona la reserva, luego muestra preview y recién después confirma.”

### Flujo seguro

```text
Mostrame mis reservas
```

Luego:

```text
Quiero cambiar la primera reserva
```

Output esperado:

```text
Ok, vamos a modificar esta reserva:
RES-XXXXXX · activa · a nombre de Laura Gómez · habitación: doble · 14/08/2026 → 16/08/2026 · huéspedes: 2.

Podemos modificar tu reserva confirmada. ¿Qué te gustaría cambiar?
- Fechas (check-in y check-out)
- Tipo de habitación
- Cantidad de huéspedes
Respondé: 'cambiar fechas', 'cambiar habitación' o 'cambiar huéspedes'.
```

Luego:

```text
cambiar fechas
```

Output:

```text
¿Cuáles serían las nuevas fechas de check-in y check-out? Podés enviarlas como 'dd/mm/aaaa a dd/mm/aaaa'.
```

Luego:

```text
del 15 al 17 de agosto
```

Output:

```text
Antes de aplicar el cambio, revisá cómo quedaría la reserva:
Reserva RES-XXXXXX
- Fechas: 14/08/2026 → 16/08/2026 => 15/08/2026 → 17/08/2026
- Disponibilidad: doble disponible
- Tarifa por noche: 115 USD
¿Confirmás estos cambios? Respondé "CONFIRMAR".
```

### Claim reforzado

Preview antes de modificar.

### Fallback

> “Cuando hay varias reservas, la conducta correcta es pedir identificación antes de ejecutar.”

---

### Escena 20 — Confirmación de modify

- duración estimada: 1 min
- pantalla/canal: Web
- texto hablado:

> “La modificación se cierra recién después de confirmar.”

### Input

```text
Confirmar
```

### Output esperado

```text
✅ Reserva actualizada correctamente.
```

### Claim reforzado

Confirmación explícita en acciones sensibles.

### Fallback

> “El punto clave ya quedó mostrado en el preview: no ejecuta una modificación sensible sin revisión y confirmación.”

---

## 9. IDENTITY MODEL PARA DEMO

### Definiciones

```yaml
conversational_actor:
  definition: "persona que conversa por el canal en ese momento"
  physical_source: "conversations.guestId → guests.guestId"

display_name:
  definition: "nombre visible derivado del actor conversacional, usado para trato o vocativo"
  physical_source: "guests.name / guests.firstName"
  note: "No necesariamente existe como campo físico independiente"

guestName:
  definition: "titular transaccional de la reserva"
  physical_source:
    - "conv_state.reservationSlots.guestName"
    - "conv_state.lastReservation.guestName"
    - "conv_state.reservationHistory[].guestName"
```

### Reglas

- El interlocutor puede reservar a nombre de otra persona.
- El vocativo conversacional debe seguir al interlocutor canónico.
- El titular de la reserva debe conservarse dentro de la reserva.
- No presentar `guestName` como identidad conversacional activa.
- No convertir esta distinción en el eje de la demo; mencionarla solo cuando aporte claridad.

### Cómo se muestra

```yaml
web:
  conversational_actor: Martín
  display_name: Martín
  guestName: Laura Gómez

whatsapp:
  conversational_actor: Martín Pérez
  display_name: Martín Pérez
  guestName: Martín Pérez

email:
  conversational_actor: Martín P.
  display_name: Martín P.
  guestName: Ana Rodríguez

supervised_web_scene:
  conversational_actor: Martin
  display_name: Martin
  guestName: "todavía no definido al inicio de la reserva"
```

### Frase útil

> “Acá distingo entre quién conversa y a nombre de quién queda registrada la reserva.”

### Qué no decir

- No usar lenguaje de CRM total.
- No presentar conciliación como identity resolution universal.
- No decir que el sistema siempre identifica perfectamente a una persona entre todos los canales.
- No afirmar que el `guestName` reemplaza automáticamente al interlocutor conversacional.

---

## 10. EMAIL EN DEMO

### Razón para mantener Email

Email queda dentro de la demo porque en hotelería es un canal operativo central. Muchas comunicaciones llegan desde intermediarios, agencias, OTAs o cadenas de reenvío.

### Frase sugerida

> “Mantengo Email dentro de la demo porque en hoteles muchas conversaciones llegan desde intermediarios, agencias, OTAs o cadenas de reenvío. No lo muestro como promesa universal cerrada, sino como parte del modelo multicanal controlado.”

### Claim permitido

> “BegaIA puede operar Email como canal controlado dentro del flujo multicanal del hotel.”

### Claim prohibido

> “Email ya resuelve perfectamente cualquier formato, threading o reenvío de OTA.”

### Fallback

> “El formato final por canal requiere una capa de presentación específica. El valor que quiero mostrar acá es que la intención se entiende y la operación queda registrada.”

---

## 11. CHANNEL MANAGER

### Definición narrativa

Channel Manager no debe presentarse como canal conversacional igual a WhatsApp o Email. Debe presentarse como integración transaccional.

### Frase sugerida

> “El Channel Manager no es un chat con el huésped. Es la capa por donde pueden entrar o sincronizarse transacciones de reservas provenientes de OTAs o sistemas externos.”

### Claim permitido

> “Channel Manager se entiende como integración transaccional, no como chat.”

### Qué no decir

- No decir que BegaIA ya reemplaza un PMS.
- No decir que ya integra cualquier Channel Manager.
- No presentar Channel Manager como chat.

---

## 12. CLAIMS MATRIX

### Claims seguros

```yaml
safe_claims:
  - BegaIA puede asistir consultas frecuentes del huésped.
  - BegaIA puede mostrar habitaciones con fotos y características en el widget.
  - BegaIA puede mostrar preview visual de habitaciones en Admin.
  - BegaIA puede consultar disponibilidad sin crear reserva prematura.
  - BegaIA puede guiar una reserva con confirmación explícita.
  - BegaIA puede distinguir entre interlocutor y titular de reserva.
  - BegaIA puede operar Web como canal principal de demo.
  - BegaIA puede operar Email como canal controlado dentro de la demo.
  - BegaIA puede mostrar WhatsApp en condiciones controladas si el entorno está estable.
  - BegaIA permite automatización o supervisión por canal.
  - BegaIA permite revisión humana antes de enviar respuestas operativas.
  - BegaIA puede mostrar continuidad de reservas y snapshot.
  - BegaIA puede modificar una reserva mediante selección, preview y confirmación.
  - Channel Manager se presenta como integración transaccional, no como chat.
```

### Claims prudentes

```yaml
prudent_claims:
  - BegaIA puede ayudar a mejorar la experiencia previa a la reserva.
  - BegaIA puede reducir fricción en consultas frecuentes.
  - BegaIA puede ayudar a ordenar operación multicanal.
  - BegaIA puede ayudar a recepción con contexto visual y conversacional.
  - BegaIA puede ser base para un piloto controlado en hoteles.
  - BegaIA puede evolucionar hacia integraciones más profundas según alcance.
```

### Claims prohibidos

```yaml
forbidden_claims:
  - BegaIA garantiza más reservas.
  - BegaIA reemplaza recepción.
  - BegaIA resuelve cualquier consulta del huésped.
  - BegaIA entiende cualquier mensaje libre sin errores.
  - BegaIA ya es CRM completo.
  - BegaIA ya es PMS completo.
  - BegaIA ya es Channel Manager completo.
  - BegaIA opera WhatsApp universalmente sin onboarding o validación.
  - BegaIA resuelve perfectamente cualquier Email, OTA o threading.
  - BegaIA elimina la necesidad de supervisión humana.
  - BegaIA identifica perfectamente a una persona entre todos los canales.
```

---

## 13. DATA SETUP FINAL

### Hotel demo

```yaml
hotel_demo: hotel999
```

### Escena visual rooms

```yaml
channel_origin: Web
query: "mostrame habitaciones"
expected_trace: retrieval_based/room_info_img
expected_rooms:
  - Single Standard
  - Doble
  - Twin
  - Triple
admin_preview: yes
```

### Web core

```yaml
channel_origin: Web
conversational_actor: Martín
display_name: Martín
guestName: Laura Gómez
room_type: doble
dates: "14 al 16 de agosto"
expected_dates_iso: "2026-08-14 → 2026-08-16"
guests: 2
```

Input:

```text
Hola, soy Martín. Quiero reservar una habitación doble del 14 al 16 de agosto para dos personas, a nombre de Laura Gómez.
```

### Web supervisado

```yaml
channel_origin: Web
mode: supervised
conversational_actor: Martin
display_name: Martin
initial_intent: reservation
first_pending_question: "¿Cuál es el tipo de habitación?"
```

Inputs:

```text
Hola
```

```text
Martin
```

```text
Quiero hacer una reserva
```

Luego:

```text
una doble
```

### WhatsApp

```yaml
channel_origin: WhatsApp
conversational_actor: Martín Pérez
display_name: Martín Pérez
guestName: Martín Pérez
room_type: single
dates: "20 al 22 de agosto"
expected_dates_iso: "2026-08-20 → 2026-08-22"
guests: 1
```

Input:

```text
Hola, soy Martín Pérez. Quiero reservar una single del 20 al 22 de agosto para una persona.
```

### Email

```yaml
channel_origin: Email
conversational_actor: Martín P.
display_name: Martín P.
guestName: Ana Rodríguez
room_type: triple
dates: "25 al 27 de agosto"
expected_dates_iso: "2026-08-25 → 2026-08-27"
guests: 3
```

Input:

```text
Hola, soy Martín P. Quisiera reservar una triple del 25 al 27 de agosto para tres personas, a nombre de Ana Rodríguez.
```

### Modify target

```yaml
channel_origin: Web
conversational_actor: Martín
guestName: Laura Gómez
room_type: doble
original_dates: "14 al 16 de agosto"
new_dates: "15 al 17 de agosto"
safe_modify_flow:
  - Mostrame mis reservas
  - Quiero cambiar la primera reserva
  - cambiar fechas
  - del 15 al 17 de agosto
  - Confirmar
```

---

## 14. SCREEN ORDER

### Medium recomendado

1. Web — apertura
2. Web — FAQ breve
3. Web — exploración visual de habitaciones
4. Web — disponibilidad
5. Web — reserva guiada
6. Web — confirmación
7. Web — follow-up
8. Admin — Channels
9. Admin — preview visual de habitaciones
10. Web + Admin Inbox — supervisión Web
11. Transición oral — deep dive sin duplicar reserva Web
12. WhatsApp — reserva simple si estable
13. Email — reserva con titular distinto
14. Admin overview — vistas confiables
15. Admin Guests / Profile / Conversations
16. Web — snapshot consolidado
17. Web — modify preview por ordinal
18. Web — confirmación de modify

### Opcionales en medium

- conciliación de guests;
- supervisión por guest;
- Channel Manager detallado;
- WhatsApp si el entorno no está estable.

### Canal final para snapshot

```yaml
snapshot_channel: Web
```

### Canal final para modify

```yaml
modify_channel: Web
```

---

## 15. SHORT / MEDIUM / FULL

### short_10_12_min

Incluir:

- apertura;
- FAQ breve;
- habitaciones visuales;
- disponibilidad;
- reserva guiada;
- confirmación;
- snapshot breve;
- mención verbal de Admin/supervisión.

Omitir:

- deep dive;
- WhatsApp;
- Email;
- Admin profundo;
- conciliación;
- modify.

Uso recomendado:

```yaml
audiencia:
  - primer contacto
  - gerente con poco tiempo
  - reunión exploratoria
```

---

### medium_18_24_min

Incluir:

- core abreviado;
- habitaciones visuales;
- Admin Channels breve;
- Admin preview visual breve;
- escena supervisada Web;
- Email como canal incluido;
- WhatsApp si está estable;
- Admin overview solo en vistas confiables;
- snapshot consolidado;
- modify usando flujo seguro por ordinal.

Omitir o verbalizar:

- Channel Manager profundo;
- explicación técnica interna;
- conciliación si consume tiempo;
- supervisión por guest si no se entiende rápido.

Uso recomendado:

```yaml
audiencia:
  - gerente interesado
  - potencial piloto
  - conversación comercial seria
```

---

### full_30_min

Incluir:

- core completo;
- habitaciones visuales;
- Admin Channels;
- Admin preview visual;
- supervisión Web completa;
- WhatsApp;
- Email;
- Admin;
- conciliación;
- supervisión canal;
- supervisión guest;
- snapshot;
- modify con preview y confirmación;
- explicación breve de Channel Manager como integración transaccional.

Condición para habilitar:

- medium dry run exitoso;
- Admin claro;
- snapshot consolidado limpio;
- WhatsApp y Email estables;
- modify seguro limpio;
- supervisión Web entregando al widget.

---

## 16. DRY RUN CHECKLIST BEFORE

Antes del ensayo:

- base limpia;
- hotel demo correcto: `hotel999`;
- branding visible;
- Web operativo;
- imágenes de habitaciones accesibles;
- Widget renderiza habitaciones visuales;
- Admin renderiza preview visual en grilla;
- Web configurado según escena;
- WhatsApp operativo si se muestra;
- Email operativo;
- Admin accesible;
- Admin Channels visualmente claro;
- Admin Inbox operativo;
- SSE operativo para entrega Widget desde supervisión;
- nombres y fechas cargados en chuleta;
- `guestName` y `conversational_actor` diferenciados;
- reserva Web objetivo de modify definida;
- ruta Admin anotada;
- frases prudentes preparadas;
- criterio de abortar deep dive decidido;
- servidor reiniciado si hubo cambios recientes;
- smoke test mínimo realizado;
- evitar conversaciones viejas con nombres mezclados.

### Smoke test mínimo

```yaml
smoke_test:
  web:
    - saludo
    - mostrame habitaciones
    - disponibilidad
    - reserva con interlocutor distinto de titular
    - confirmación
    - snapshot
  admin_visual:
    - conversación con room_info_img visible
    - preview en grilla visible
  admin_supervision:
    - web supervised
    - saludo no bloqueado
    - reserva queda pendiente
    - Admin Inbox muestra sugerencia
    - Editar y enviar precarga texto
    - Guardar y enviar entrega al widget
  email:
    - reserva simple con guestName distinto
    - confirmación
  admin:
    - guests visibles
    - conversación visible
    - reservas visibles
    - channels visibles
  optional:
    - whatsapp simple
```

---

## 17. DRY RUN CHECKLIST DURING

Durante el ensayo:

- medir tiempo por escena;
- verificar narrativa comercial y no técnica;
- verificar salida visual de habitaciones;
- verificar que Admin preview se entienda rápido;
- verificar outputs correctos en Web;
- observar mezcla entre interlocutor y titular;
- observar snapshot con tres `guestName`;
- observar modify inequívoco;
- observar estabilidad WhatsApp y Email;
- observar claridad de supervisión;
- verificar Admin Inbox entrega al Widget;
- ensayar al menos un fallback;
- no entrar en troubleshooting;
- si Admin consume tiempo, volver al relato de producto;
- si modify se vuelve ambiguo, volver al ordinal;
- si Email muestra formato imperfecto, usar frase prudente.

---

## 18. DRY RUN CHECKLIST AFTER

Después del ensayo:

- registrar duración total;
- marcar escenas lentas o confusas;
- registrar si habitaciones visuales aportaron valor;
- registrar si Admin preview fue clara;
- marcar mezclas entre interlocutor y titular;
- registrar si supervisión fue clara;
- registrar si Admin Inbox entregó al widget;
- registrar si snapshot consolidado fue correcto;
- registrar si modify necesitó reformulación;
- registrar estabilidad WhatsApp y Email;
- registrar calidad visual Email;
- registrar si Admin Channels se entiende;
- decidir si full queda habilitada o conviene medium;
- congelar wording final;
- registrar fallbacks usados;
- decidir si hay bug técnico real o solo ajuste de guion;
- si todo sale limpio, abrir hito documental final.

---

## 19. SUCCESS CRITERIA

La demo se considera lista si:

- `core` entra en 10 a 12 minutos;
- `medium` entra en 18 a 24 minutos;
- narrativa clara y comercial;
- habitaciones visuales se muestran limpias en Widget;
- Admin muestra preview visual suficiente;
- outputs correctos en Web;
- separación clara entre `conversational_actor` y `guestName`;
- Admin Channels se entiende como gobierno por canal;
- supervisión Web muestra valor comercial sin fricción;
- Admin Inbox permite revisar, editar, enviar y cancelar;
- Widget recibe la respuesta supervisada;
- Email queda mostrado como canal operativo controlado;
- snapshot consolidado muestra tres reservas si se ejecuta deep dive;
- cada reserva conserva su titular transaccional;
- modify se ejecuta sobre target inequívoco usando flujo seguro;
- WhatsApp estable si se muestra;
- Email estable si se muestra;
- ningún claim cae en sobrepromesa;
- Marcelo no entra en explicación técnica interna;
- Admin se entiende rápido o se reemplaza por explicación verbal breve.

---

## 20. ABORT OR SKIP CRITERIA

### Abortar deep dive y quedarse con core si:

- WhatsApp no está estable y era pieza clave;
- Email no está estable;
- Admin no carga;
- escena supervisada falla;
- snapshot consolidado no sale limpio;
- modify requiere demasiada aclaración;
- Marcelo se pasa del tiempo previsto;
- audiencia muestra poco interés técnico-operativo después del core.

### Saltar partes puntuales

- Saltar WhatsApp si el canal no está confiable.
- No saltar Email salvo falla operativa real.
- Saltar supervisión si Admin Inbox o SSE no responden.
- Saltar supervisión por guest si la UI no se entiende rápido.
- Saltar conciliación si Admin no la muestra con claridad.
- Saltar modify si snapshot consumió demasiado tiempo.
- Saltar Channel Manager detallado si distrae.
- Si falla la imagen visual, mantener el claim de inventario visual como validado en entorno controlado y seguir con reserva.

---

## 21. FALLBACK LINES

### Habitaciones visuales no cargan

> “La intención de producto es que el huésped pueda explorar habitaciones con fotos y características. Si el entorno no carga las imágenes ahora, sigo con disponibilidad y reserva, que es el flujo transaccional principal.”

### Admin preview visual no aparece

> “El widget muestra la experiencia del huésped; Admin puede mostrar una preview operativa. Para no desviarnos, sigo con la parte de supervisión y reservas.”

### WhatsApp falla

> “Para no convertir la reunión en troubleshooting del canal, sigo con Web, Email y Admin, que muestran la misma lógica de producto.”

### Email falla

> “Email es parte importante del modelo porque en hotelería muchas comunicaciones llegan por intermediarios. Si el entorno no acompaña ahora, mantengo el foco en Web y lo dejamos como canal a validar en piloto.”

### Email muestra formato imperfecto

> “El formato final por canal requiere una capa de presentación específica. El valor que quiero mostrar acá es que la intención se entiende y la operación queda registrada.”

### Admin falla

> “La capa operativa existe para ordenar guests y conversaciones. Para no desviarnos en navegación, vuelvo a la parte conversacional.”

### Supervisión falla

> “El mensaje importante es que el hotel conserva control y puede graduar automatización sin elegir entre todo automático o todo manual.”

### Snapshot falla

> “Después de consolidar identidad, la expectativa de producto es ordenar mejor la vista del huésped. Paso ahora al caso de cambio de reserva.”

### Modify falla

> “El punto clave acá es la gobernanza de acciones sensibles: preview y confirmación antes de ejecutar.”

### Confusión entre interlocutor y `guestName`

> “Acá distingo entre quién está conversando y a nombre de quién queda registrada la reserva.”

### Entorno/túnel falla

> “Para no depender del entorno en vivo, vuelvo al recorrido más controlado y sigo mostrando valor de producto.”

---

## 22. OBJECTIONS FINAL ANSWERS

### “¿Esto reemplaza recepción?”

> “No. La propuesta no es reemplazar recepción, sino ordenar parte de la conversación y permitir distintos niveles de supervisión.”

### “¿Qué pasa si el sistema no sabe?”

> “Ahí entra la supervisión humana. No está diseñado para simular certeza donde no la hay.”

### “¿Puede vender más habitaciones?”

> “La demo muestra una experiencia más ordenada y visual antes de la reserva. No prometo aumento de ventas sin medirlo en piloto.”

### “¿WhatsApp ya queda listo para cualquier hotel?”

> “Se puede mostrar en demo controlada. No lo presentamos como universalmente resuelto sin validar onboarding y operación.”

### “¿Email resuelve cualquier caso de OTA?”

> “Email es relevante porque muchas comunicaciones hoteleras llegan por intermediarios. Lo tratamos como canal controlado, no como promesa universal cerrada.”

### “¿Es un PMS?”

> “No lo posicionamos como PMS. La demo está enfocada en la capa conversacional y la operación asistida.”

### “¿Es un Channel Manager?”

> “No. El Channel Manager no es un chat; es una integración transaccional por donde pueden sincronizarse reservas o cambios desde OTAs o sistemas externos.”

### “¿Qué pasa con ambigüedades?”

> “Ante ambigüedad, la conducta correcta es pedir aclaración antes de ejecutar una acción sensible.”

### “¿Es producción lista?”

> “Lo correcto hoy es hablar de demo comercial y piloto controlado, no de despliegue masivo sin matices.”

---

## 23. RECOMMENDATION

La demo queda lista para nuevo `medium dry run` con la escena visual incorporada.

### Decisión recomendada

```yaml
next_action:
  run: medium_dry_run
  include_visual_rooms: yes
  include_admin_visual_preview: yes
  email: included
  whatsapp: optional_if_stable
  admin_channels: included_briefly
  admin_supervision_web: included
  modify_flow: safe_ordinal_flow
  objective: "validar demo comercial final antes de documentar versión aprobada"
  output_expected:
    - duración real
    - escenas PASS/FAIL
    - habitaciones visuales PASS/FAIL
    - Admin preview PASS/FAIL
    - estabilidad Email
    - estabilidad WhatsApp si aplica
    - entrega supervisada al Widget
    - snapshot consolidado
    - modify seguro
    - lista de fallbacks usados
```

### Decisión documental

```yaml
documentation:
  version_this_doc_now_as_draft: yes
  final_doc_hito_now: no
  after_clean_dry_run:
    proposed_id: DOC-DEMO-SCRIPT-REFRESH-AFTER-KB-RICH-ROOMS-01
    classification: solo_documentacion
    objective:
      - congelar guion actualizado
      - incorporar escena visual de habitaciones
      - incorporar Admin rich preview
      - actualizar claims
      - retirar advertencias obsoletas
      - dejar versiones short / medium / full listas
```

---

## 24. NEXT STEPS

```yaml
technical_next_steps:
  immediate: none
  reason: "Primero ejecutar dry run final."

commercial_next_steps:
  immediate:
    - revisar este draft
    - versionarlo como draft si Marcelo lo aprueba
    - ejecutar análisis comercial post KB/rich rooms
    - correr medium dry run

conditional_after_dry_run:
  if_clean:
    - DOC-DEMO-SCRIPT-REFRESH-AFTER-KB-RICH-ROOMS-01

  if_bug_found:
    - abrir hito técnico específico según síntoma observado

  if_too_long:
    - recortar escenas opcionales
    - mantener visual rooms y reserva core
    - mover conciliación/supervisión guest a full
```

---

## 25. CHULETA RÁPIDA PARA MARCELO

### Apertura

> “BegaIA no es un chatbot genérico. Es un Concierge Digital para hotelería: responde, muestra información útil, acompaña reservas y ayuda a ordenar la operación.”

### Habitaciones visuales

> “Antes de reservar, el huésped muchas veces quiere explorar opciones. Acá puede ver habitaciones con fotos y características principales.”

### Admin visual

> “Recepción también puede ver el contexto visual en Admin, no solo el texto de la conversación.”

### Admin Channels

> “El hotel no tiene que elegir entre todo automático o todo manual.”

### Supervisión

> “Supervisado no significa que todo se frena; significa que el hotel puede revisar respuestas operativas antes de que lleguen al huésped.”

### Core → Deep Dive

> “La reserva Web que acabamos de crear queda como primera pieza del caso multicanal. Ahora agrego otros canales reales de operación: WhatsApp y Email.”

### Identidad

> “Acá distingo entre quién está conversando y a nombre de quién queda registrada la reserva.”

### Email

> “Email es importante porque muchas comunicaciones hoteleras llegan desde intermediarios, agencias u OTAs. Lo muestro como canal operativo controlado.”

### Channel Manager

> “El Channel Manager no es un chat; es una integración transaccional.”

### Modify seguro

> “Cuando hay varias reservas, primero identifico cuál se modifica. Después el sistema muestra preview y recién ahí permite confirmar.”

### Límite prudente

> “Esto lo planteamos como demo comercial y piloto controlado, no como despliegue masivo sin matices.”

### Si algo falla

> “Para no convertir la reunión en troubleshooting, sigo por el recorrido más controlado y mantengo el foco en el valor de producto.”

---

## 26. VERSION TAG

```yaml
document_id: demo_script_core_first_admin_supervision_refresh
version: v5_draft_after_kb_rich_rooms
status: draft
approved: false
canonical_final: false
recommended_repo_path: docs/product/demo_script_core_first_admin_supervision_refresh.md
document_hito: pending_after_clean_dry_run

incorporated_capabilities:
  - room_info_img visual routing
  - widget room cards/images
  - admin room-info-img preview grid
  - kb fastpath precedence improvements
  - arrivals_transport routing hardening
  - admin supervision inbox
  - admin channels governance
  - email inline conversational actor parity
  - safe modify ordinal flow

updated_focus:
  - visual_room_inventory
  - admin_visual_context
  - commercial_claims_prudent
  - medium_dry_run_with_visual_scene
  - no_final_documentation_before_clean_dry_run
```
