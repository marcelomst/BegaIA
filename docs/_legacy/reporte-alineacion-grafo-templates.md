# Reporte de alineación entre nodos del grafo y templates

## Categorías y claves usadas en el grafo conversacional

- retrieval_based
- reservation
- reservation_snapshot
- reservation_verify
- amenities
- billing
- support

### Claves de template referenciadas en el wiring y nodos:

- modify_reservation
- reservation_snapshot
- reservation_verify
- arrivals_transport
- payments_and_billing
- contact_support
- breakfast_bar
- room_info
- ambiguity_policy
- kb_general
- amenities_list
- pool_gym_spa
- parking
- invoice_receipts
- cancellation_policy

## Claves de template definidas en `lib/prompts/templates.ts`

- kb_general
- room_info
- room_info_img
- ambiguity_policy
- modify_reservation
- amenities_list
- pool_gym_spa
- breakfast_bar
- parking
- payments_and_billing
- invoice_receipts
- contact_support
- cancellation_policy
- reservation_snapshot
- reservation_verify

## Desalineaciones detectadas

### Claves usadas en el grafo pero NO definidas en templates:

- arrivals_transport

### Claves definidas en templates pero NO referenciadas en el wiring:

- room_info_img

## Verificación de multilingüismo

Cada template debe tener versiones para los idiomas: `es`, `en`, `pt`.

### Siguiente paso sugerido

- Agregar el template `arrivals_transport` en `templates.ts` para todos los idiomas.
- Verificar si `room_info_img` debe usarse en algún nodo o eliminarlo si es obsoleto.
- Validar que cada clave tenga versiones en los tres idiomas.

---

Generado automáticamente el 31/10/2025.
