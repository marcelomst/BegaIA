<!-- Path: docs/product/presentation_capability_map.md -->

# BegaIA — Presentation Capability Map

## 1. Estado

```yaml
document_status: validated_for_controlled_commercial_presentations
commercial_dry_run:
  date: 2026-07-22
  duration_until_farewell_input: "17:05"
canonical_guest_id: "cfcd4116-356d-4865-ab6b-63e1f8acbdfc"
runtime_map_applies: false
```

Este mapa separa capacidad demostrada, capacidad documentada, claim comercial seguro, limitación vigente y riesgo de sobrepromesa.

## 2. Mapa De Capacidades

| Capacidad | Estado | Evidencia | Claim comercial seguro | Limitación vigente | Riesgo |
| --- | --- | --- | --- | --- | --- |
| Concierge Digital hotelero | Demostrada | Dry run comercial 2026-07-22 | “BegaIA actúa como Concierge Digital para hotelería.” | No reemplaza recepción. | Bajo |
| Habitaciones rich en Widget | Demostrada | Demo comercial y assets versionados | “El huésped puede explorar habitaciones con fotos.” | Depende de KB generada desde configuración vigente. | Medio |
| Preview rich en Admin | Demostrada | Admin Inbox en dry run | “Recepción puede ver contexto visual, no solo texto.” | No es editor visual completo. | Medio |
| FAQ breve | Demostrada | Check-in/parking en demo | “Responde consultas frecuentes controladas.” | No cubre cualquier FAQ libre. | Medio |
| Disponibilidad sin create prematuro | Demostrada | Flujo Web de disponibilidad | “Distingue exploración de reserva.” | No equivale a motor de revenue management. | Medio |
| Reserva Web | Demostrada | RES-37A215 | “Guía una reserva Web con confirmación explícita.” | No reemplaza PMS. | Alto si se sobrevende |
| Interlocutor distinto del titular | Demostrada | Martin conversa, Laura Gómez titular | “Separa quién conversa de a nombre de quién queda la reserva.” | No es CRM completo. | Medio |
| Reserva WhatsApp Twilio | Demostrada en demo controlada | RES-77A568 | “WhatsApp puede operar como punto de entrada controlado.” | Readiness productivo general requiere validaciones adicionales. | Medio |
| Email operativo | Demostrada con precarga | RES-A365BD | “Email puede integrarse como canal operativo controlado.” | En demo breve se usa fuera del cronómetro. | Medio |
| Identidad canónica | Demostrada | `cfcd4116-356d-4865-ab6b-63e1f8acbdfc` | “Ayuda a ordenar una identidad operativa entre canales.” | No prometer matching universal. | Medio |
| Guest consolidation | Demostrada | Web Martin, Email Martín P., WhatsApp Martín Pérez | “El hotel puede consolidar contexto operativo del huésped.” | No vender como CRM completo. | Alto si se exagera |
| Snapshot consolidado | Demostrada | Ana → Laura → Martín | “Muestra reservas asociadas al huésped en orden operativo.” | Orden depende de ingreso real. | Bajo |
| Modify por ordinal | Demostrada | “la primera reserva” resuelve a Ana Rodríguez | “Permite modificar por referencia contextual gobernada.” | No cualquier coreferencia libre. | Medio |
| Preview y confirmación de modify | Demostrada | Preview antes de aplicar cambio | “No ejecuta acciones sensibles sin confirmación.” | No cubre todos los cambios posibles. | Bajo |
| Farewell natural | Demostrada | Cierre “chau” medido | “Cierra la conversación sin reabrir flujos residuales.” | No implica localización completa de todo el runtime. | Bajo |
| Control humano por canal | Demostrada | Admin Channels / modo supervisado | “Permite graduar automatización por canal.” | No prometer políticas empresariales completas. | Medio |
| Control humano por guest | Documentada / demostrable | Admin/guest mode según configuración | “Puede aplicarse supervisión por huésped cuando corresponde.” | No densificar demo breve si no aporta. | Medio |
| Channel Manager | Documentada como integración transaccional | Admin Channels | “Se muestra como integración transaccional, no como canal conversacional.” | No presentar como PMS completo. | Alto |

## 3. Claims Actualizados

Claims seguros para presentación:

- BegaIA es un Concierge Digital especializado en hotelería.
- La demo validada opera Web, Email y WhatsApp en un recorrido controlado.
- El sistema puede mostrar habitaciones visuales y contexto visual en Admin.
- El sistema guía reservas y modificaciones con confirmación explícita.
- El sistema conserva continuidad multicanal bajo una identidad operativa común.
- El hotel puede graduar automatización y supervisión.

## 4. Claims Prudentes

- “Validado en demo controlada” no significa “listo para producción masiva”.
- “Identidad canónica” no significa “CRM completo”.
- “Reservas guiadas” no significa “PMS completo”.
- “WhatsApp y Email demostrados” no significa “paridad productiva absoluta”.
- “Rich rooms” depende de KB y configuración correctamente regeneradas.

## 5. Uso Recomendado

Usar este mapa para deck, one-pager y speech. No convertirlo en promesa contractual sin revisión comercial y técnica.
