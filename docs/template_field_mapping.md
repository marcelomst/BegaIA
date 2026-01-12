# Admin ↔ Template token mapping

Este documento mapea los campos del panel de Admin con las rutas de tokens de las plantillas usadas por el motor de hidratación. Úsalo para mantener alineados la UI, el modelo y los seeds.

## Payments and Billing

- payments.methods (array)
  - Template: [[join: payments.methods | sep: ,  -> [[item]]]
  - Admin: "Métodos de pago" input (comma or semicolon delimited). Stored as string[]
- payments.currencies (array) with fallback to payments.currency (string)
  - Template: [[join: payments.currencies | sep: ,  | default: [[key: payments.currency | default: ARS/USD/EUR]] -> [[item]]]]
  - Admin: TagSelect con sugerencias (USD, EUR, ARS, BRL, CLP, MXN, COP, PEN, UYU) y "Otro…"; el primer valor sincroniza payments.currency para compatibilidad.
  - Notas: si payments.currencies está vacío, se usa payments.currency; si también está vacío, el token aplica el default (ARS/USD/EUR). El motor tolera strings y arrays.
- payments.notes (string)
  - Template: [[key: payments.notes]]
  - Admin: "Notas de pago"
- payments.requiresCardForBooking (boolean)
  - Template: [[key: payments.requiresCardForBooking]]
  - Admin: checkbox "Solicitar tarjeta para garantizar"
- billing.issuesInvoices (boolean)
  - Template: [[key: billing.issuesInvoices]]
  - Admin: checkbox "Emitimos factura"
- billing.invoiceNotes (string)
  - Template: [[key: billing.invoiceNotes]]
  - Admin: "Notas de facturación"
- billing.documentTypes (array)
  - Template: [[join: billing.documentTypes | sep: ,  -> [[item]]]
  - Admin: N/A (future). Store as string[] when added

## Contact and Support

- contacts.phone, contacts.whatsapp, contacts.email, contacts.website, contacts.hours
  - Templates: [[key: contacts.<field>]]
  - Admin: Contacts block
- channelConfigs.<web|whatsapp|email>.enabled
  - Templates: Enabled channels display
  - Admin: Channels > each channel toggle
- contacts.otherChannels (array) [derived]
  - Templates: not shown (Option B)
  - Hydration: derived from social channelConfigs if not present

## Room Info

- rooms (array of room objects)
  - Template each: [[each: rooms -> ... [[name]] [[capacity]] [[beds]] ... [[join: images -> !img([[item]])]] ]]
  - Admin: Rooms list editor (highlights and images comma-separated)

## Arrivals & Transport

## Amenities

Modelo canónico (actual):

- amenities.tags (array de slugs canónicos)

  - Persistencia: se guardan slugs normalizados (ej.: wifi, gym, pool, reception24h, laundry, parking, etc.).
  - Visualización/Salida: los slugs se localizan sólo al renderizar (helper amenityLabel; es/en/pt).
  - Normalización: sinónimos y entradas libres se convierten al slug canónico cuando es posible.
  - Template base: [[join: amenities.tags | sep: ,  -> [[item]]]]
    - Nota: para mostrar etiquetas legibles, aplique el mapeo de slug → label antes de imprimir [[item]].

- amenities.notes (string)

  - Template: [[key: amenities.notes]]
  - Admin: textarea "Notas generales de amenities".

- amenities.schedules (map slug → string)

  - Formatos aceptados: HH:mm o "HH:mm a HH:mm"; se valida en Admin y bloquea "Guardar" si hay errores.
  - Claves típicas: pool, gym, spa, restaurant, bar, etc. (coinciden con los slugs de amenities.tags).
  - Template ejemplo: [[each: amenities.schedules -> [[key]]: [[item]]]]
    - Nota: [[key]] debe pasar por el helper de label para mostrar el nombre localizado del amenity.

- Migración legacy (nota): claves previas como "Piscina", "Gimnasio", "Spa" se mapean a slugs pool, gym, spa. Los flags booleanos antiguos quedan deprecados.

## Schedules (etiquetas y mapeo)

- schedules.checkIn → "Horario de check‑in" (Ej.: 15:00)
- schedules.checkOut → "Horario de check‑out" (Ej.: 11:00)
- schedules.breakfast → "Horario de desayuno" (Ej.: 07:30 a 10:30)
- schedules.quietHours → "Horas de silencio" (Ej.: 22:00 a 07:30)

Horarios asociados a amenities: usar amenities.schedules con los slugs correspondientes, por ejemplo:

- amenities.schedules.pool → "Horario de piscina"
- amenities.schedules.gym → "Horario de gimnasio"
- amenities.schedules.spa → "Horario de spa"

- transport.airports (array)
  - Template each: [[each: transport.airports -> ...]]
- transport.privateTransfer.available, transport.privateTransfer.notes
- transport.taxi.notes, transport.bus.notes
  - Admin: To be added via generator overrides or future fields

## Cancellation Policy (planned)

Estado: Implemented

- policies.cancellation.flexible (string)
  - Template: [[key: policies.cancellation.flexible]]
  - Admin: textarea "Tarifa flexible"
- policies.cancellation.nonRefundable (string)
  - Template: [[key: policies.cancellation.nonRefundable]]
  - Admin: textarea "Tarifa no reembolsable"
- policies.cancellation.channels (array or string)
  - Template: [[join: policies.cancellation.channels | sep: ,  -> [[item]]]
  - Admin: input (comma or semicolon delimited) to store as string[]; hydration tolerates string
- policies.cancellation.noShow (string)
  - Template: [[key: policies.cancellation.noShow]]
  - Admin: textarea "No-show"

Notas adicionales:

- `channels` admite string o array; el motor separa por coma/; o salto de línea.
- Si un campo está vacío, la sección correspondiente puede omitirse en la plantilla.
- El Admin separa esta sección dentro de "Políticas de reservas". Existe además un toggle para "Forzar pregunta canónica (reservas)" si se desea controlar comportamiento del bot.

Notes:

- Orden de hidratación: primero iteradores (each/join), luego keys simples.
- [[join]] es tolerante: si el valor es string se separa por coma, punto y coma o salto de línea.
- Localización: los slugs (p. ej., amenities.tags) se convierten a etiquetas legibles sólo al renderizar (no se persisten labels).
- Multi-moneda: si payments.currencies está vacío, se usa payments.currency; si ambos faltan, aplica default en el token.
- Validación de horarios: se aceptan HH:mm o "HH:mm a HH:mm"; en Admin, errores de formato bloquean "Guardar".
- Preferir tokens en el contenido guardado; los snapshots son opcionales (POST /api/hotel-content/persist-hydrated).

Ejemplo end‑to‑end (amenities):

- Admin guarda: amenities.tags = ["wifi","gym","pool"]; amenities.schedules.pool = "09:00 a 18:00"; amenities.notes = "Toallas disponibles en la piscina".
- Plantilla (tras localización): "Wi‑Fi gratis, Gimnasio, Piscina (Horario de piscina: 09:00 a 18:00). Toallas disponibles en la piscina."

## Referencia rápida: slugs de amenities y etiquetas

Para visualización, los slugs se convierten a etiquetas localizadas al renderizar. Lista canónica actual:

| slug            | ES                 | EN              | PT                |
| --------------- | ------------------ | --------------- | ----------------- |
| pool            | Piscina            | Pool            | Piscina           |
| gym             | Gimnasio           | Gym             | Academia          |
| spa             | Spa                | Spa             | Spa               |
| parking         | Estacionamiento    | Parking         | Estacionamento    |
| restaurant      | Restaurante        | Restaurant      | Restaurante       |
| bar             | Bar                | Bar             | Bar               |
| cafe            | Cafetería          | Cafe            | Cafeteria         |
| room_service    | Room service       | Room service    | Serviço de quarto |
| reception_24h   | Recepción 24h      | 24h Reception   | Recepção 24h      |
| free_wifi       | Wi‑Fi gratis       | Free Wi‑Fi      | Wi‑Fi grátis      |
| luggage_storage | Guardaequipaje     | Luggage storage | Guarda-volumes    |
| concierge       | Conserjería        | Concierge       | Concierge         |
| safe_box        | Caja de seguridad  | Safe box        | Cofre             |
| transfers       | Transfers          | Transfers       | Transfers         |
| tours           | Tours              | Tours           | Passeios          |
| bicycles        | Bicicletas         | Bicycles        | Bicicletas        |
| high_chairs     | Sillas altas       | High chairs     | Cadeiras altas    |
| cribs           | Cunas              | Cribs           | Berços            |
| sauna           | Sauna              | Sauna           | Sauna             |
| hot_tub         | Hidromasaje        | Hot tub         | Hidromassagem     |
| meeting_rooms   | Salas de reuniones | Meeting rooms   | Salas de reunião  |
| business_center | Business center    | Business center | Business center   |
| terrace         | Terraza            | Terrace         | Terraço           |
| garden          | Jardín             | Garden          | Jardim            |
| pet_friendly    | Pet‑friendly       | Pet‑friendly    | Pet‑friendly      |
| laundry         | Lavandería         | Laundry         | Lavanderia        |
| coworking       | Co‑working         | Co‑working      | Co‑working        |

Notas:

- Si aparece un slug con prefijo `custom_`, se formatea a partir del texto libre del usuario (ej.: `custom_terraza_rooftop` → "Terraza rooftop").
- Esta tabla debe mantenerse en sincronía con `lib/taxonomy/amenities.ts`.

### Cómo proponer un nuevo slug de amenity

Para mantener consistencia y localización correcta, seguí estos criterios al proponer nuevos slugs:

- Naming del slug:
  - minúsculas, separadores con guión bajo `_` (snake_case): `room_service`, `high_chairs`.
  - evitar caracteres especiales/acentos; máximo ~40 caracteres.
- i18n requerido:
  - proveer labels en ES, EN y PT.
  - pensar en la redacción pública (concisa, natural para el huésped).
- Sinónimos:
  - incluir variantes comunes en minúsculas y sin acentos (ej.: `wi fi`, `wifi gratis`, `internet rapido`).
  - contemplar regionalismos cuando aporte (ej.: `pileta` → `pool`).
- Revisión:
  - abrir PR que modifique `lib/taxonomy/amenities.ts` agregando el objeto { slug, i18n, synonyms }.
  - si el amenity admite horario, confirmar que su slug también pueda usarse en `amenities.schedules.<slug>`.
  - actualizar esta tabla de referencia en este documento.

### Snippet: mapear slug → label antes de [[join]]

Recomendado: derivar un array localizado en el generador y usarlo en la plantilla.

Ejemplo en el generador (TypeScript):

```ts
import { amenityLabel } from "@/lib/taxonomy/amenities";

function localizeAmenitiesTags(tags: string[], lang: "es" | "en" | "pt") {
  return tags.map((slug) => amenityLabel(slug, lang));
}

// En el payload para la plantilla:
const tagsLocalized = localizeAmenitiesTags(hotel.amenities.tags ?? [], lang);
// Guardar como campo derivado: hotel.amenities.tagsLocalized = tagsLocalized;
```

Uso en la plantilla (tokens):

```
[[join: amenities.tagsLocalized | sep: ,  -> [[item]]]]
```

Notas:

- Si no querés persistir `tagsLocalized`, podés generarlo on-the-fly en el paso previo a hidratar.
- Para `amenities.schedules`, aplicá el mismo enfoque mapeando la clave (slug) con amenityLabel al momento de renderizar.
