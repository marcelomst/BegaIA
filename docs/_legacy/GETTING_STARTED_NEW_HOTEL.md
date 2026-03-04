# Getting started: nuevo hotel asistido por IA

Este flujo te crea el set inicial de documentos KB en `docs/kb` a partir de un perfil canónico del hotel, listo para ser subido por la UI de Admin o por el script de carga.

## 1) Prepará el perfil canónico del hotel

- Esquema: `docs/hotel_profile.schema.json`
- Plantilla: `seeds/hotel_profiles/hotel_template.json`

Campos mínimos recomendados:

- Identidad: hotelId, hotelName, defaultLanguage, timezone
- Ubicación: address, city, country, (opcional lat/lng)
- Contacto: email, whatsapp, phone, website
- Horarios: checkIn, checkOut, (opcional) breakfast
- Amenities: parking/pool/gym/spa y notas
- Pagos y facturación: métodos, notas, factura sí/no
- Políticas: mascotas, humo, cancelación
- Transporte: aeropuertos cercanos, notas de transfer/taxi/bus
- Atracciones: puntos de interés próximos

## 2) Generá el set de KB

Usá el generador (crea `docs/kb/<hotelId>/...`):

```bash
pnpm tsx scripts/generate-kb-from-profile.ts seeds/hotel_profiles/hotel_template.json --out docs/kb
```

También hay alias:

```bash
pnpm run kb:scaffold seeds/hotel_profiles/hotel_template.json --out docs/kb
```

Qué se crea (archivos .txt listos para ingestión):

- amenities/
  - amenities_list.es.txt
  - breakfast_bar.es.txt
  - parking.es.txt
  - pool_gym_spa.es.txt
  - arrivals_transport.es.txt
- billing/
  - payments_and_billing.es.txt
  - invoice_receipts.es.txt
- support/
  - contact_support.es.txt
- Información general con PromptKey kb_general

Todos con encabezados `Categoria:` y `PromptKey:` correctos.

## 3) Subí los documentos a la KB del hotel

- Opción A: UI admin → Cargar KB (subí archivo por archivo)
- Opción B: script por lote:

```bash
HOTEL_ID=<tuHotelId> UPLOADER="<tuEmail>" API_BASE=http://localhost:3000 \
  ./scripts/upload-kb-batch.sh docs/kb
```

El servidor debe estar corriendo (Next.js en 3000).

## 4) Validá que quedó bien

- Ver lista: `/api/hotel-documents?hotelId=<tuHotelId>`
- Ver detalle/versión: `/api/hotel-document-details?hotelId=<tuHotelId>&originalName=breakfast_bar.es.txt`
- Smoke test del bot con:
  - "¿Qué medios de pago aceptan?" → billing/payments_and_billing
  - "¿Cómo los contacto por WhatsApp?" → support/contact_support
  - "¿A qué hora es el desayuno?" → amenities/breakfast_bar
  - "¿Qué aeropuerto tengo cerca?" → amenities/arrivals_transport

## 5) Qué info canónica conviene tener

Además de lo que ya cargás en `hotel_config` (nombre, ubicación, contacto):

- Horarios formales: check-in, check-out, desayuno, quiet hours
- Perfiles de amenities: parking (si hay, costo), piscina/gym/spa (horarios/reglas)
- Pagos y facturación: métodos, necesidad de tarjeta, si emiten factura y condiciones
- Políticas claras: mascotas, humo/tabaco, cancelación
- Transporte: aeropuertos relevantes, si coordinan transfer, tips de taxi/bus locales
- Atracciones: 3–5 lugares cercanos útiles para el huésped

## 6) Enriquecimiento automático (opcional)

Podemos agregar en el generador una bandera `--auto-enrich` para completar transporte/atracciones a partir de la ciudad/coords usando IA (requiere OPENAI_API_KEY). Está diseñado para ser opcional para mantener el proceso offline y controlado. Si te interesa, lo activamos.

## 7) Re-subidas y versiones

Cada vez que subís un .txt, se crea una nueva versión. El motor ya prioriza la versión más reciente por `PromptKey`, así que cualquier corrección (p.ej., horarios de desayuno) impacta de inmediato en las respuestas.

## Troubleshooting

- Si falta `Categoria:` o `PromptKey:` en un .txt, el script de carga lo reporta y salta ese archivo.
- Validá el perfil con el esquema JSON si querés mayor rigor.
- Si el bot insiste con reservas: revisá que esas preguntas estén en categorías de amenities/billing/support y no en reservas.
