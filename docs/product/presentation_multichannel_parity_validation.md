<!-- Path: docs/product/presentation_multichannel_parity_validation.md -->

# BegaIA — Multichannel Demo Validation

## 1. Status

```yaml
status: validated_for_controlled_commercial_demo
dry_run_date: 2026-07-22
scope: commercial_demo_validation
runtime_map_applies: false
```

Este documento registra la evidencia comercial validada para demo multicanal. No redefine arquitectura, no reemplaza ADRs técnicos y no declara paridad productiva absoluta.

## 2. Evidencia Base

```yaml
dry_run:
  date: 2026-07-22
  start: 2026-07-22T20:25:08.498Z
  objective_end_chau: 2026-07-22T20:42:13.646Z
  technical_end_final_reply: 2026-07-22T20:42:14.820Z
  duration_until_chau: 17m05s
  duration_including_final_reply: 17m06s
  avg_ai_latency: "~2.2s"
  max_ai_latency: "~8.2s"
  canonical_guestId: cfcd4116-356d-4865-ab6b-63e1f8acbdfc
```

## 3. Resultado Multicanal Validado

```yaml
channels:
  web:
    actor: Martin
    status: validated_in_demo
  email:
    actor: Martín P.
    status: validated_in_demo
    note: email_preloaded_before_clock_and_confirmed_during_demo
  whatsapp:
    actor: Martín Pérez
    status: validated_in_demo
    transport: Twilio

canonical_identity:
  guestId: cfcd4116-356d-4865-ab6b-63e1f8acbdfc
  demo_result: converged
```

Lectura correcta: Web, Email y WhatsApp fueron usados en la demo y quedaron representados en una vista consolidada del huésped. Esto valida el caso comercial controlado de multicanalidad, no una garantía general de paridad productiva para todos los escenarios.

## 4. Reservas Consolidadas

Orden canónico validado en snapshot:

1. `RES-A365BD` — Ana Rodríguez — Email precargado — triple — 2026-08-25 → 2026-08-27 — 3 huéspedes.
2. `RES-37A215` — Laura Gómez — Web — doble — 2026-08-14 → 2026-08-16 — 2 huéspedes.
3. `RES-77A568` — Martín Pérez — WhatsApp — simple — 2026-08-20 → 2026-08-22 — 1 huésped.

La referencia por ordinal quedó alineada con ese orden: “la primera reserva” apunta a Ana Rodríguez, no a Laura Gómez.

## 5. Separación De Alcances

### Demo Multicanal Validada

- Entrada por Web, Email y WhatsApp.
- Identidad consolidada bajo el mismo huésped canónico.
- Reservas visibles en snapshot consolidado.
- WhatsApp operó correctamente vía Twilio dentro del recorrido validado.
- Email operó como canal funcional, con setup precargado antes del cronómetro comercial.

### Arquitectura De Transporte

- Web, Email y WhatsApp tienen transportes distintos.
- Email conserva particularidades operativas de polling/envío.
- WhatsApp depende de Twilio y de la salud del webhook/túnel o despliegue.
- La validación comercial no sustituye auditoría de arquitectura ni monitoreo productivo.

### Readiness Productiva General

- La demo permite afirmar operación multicanal controlada.
- No permite afirmar cobertura exhaustiva de todos los edge cases por canal.
- No permite vender paridad productiva cerrada sin matices.

## 6. Claims Permitidos

- “BegaIA puede operar una demo multicanal controlada con Web, Email y WhatsApp.”
- “El huésped puede aparecer por distintos canales y el Admin puede mostrar una vista consolidada.”
- “La demo validó reservas creadas por Web, Email y WhatsApp bajo un mismo huésped canónico.”
- “WhatsApp está integrado vía Twilio para el escenario comercial validado.”
- “Email puede formar parte del flujo operativo, separando transporte de lógica conversacional.”

## 7. Claims No Permitidos

- “Todos los canales tienen paridad productiva total.”
- “WhatsApp y Email no tienen riesgos operativos de transporte.”
- “La identidad multicanal está resuelta para cualquier caso real sin supervisión.”
- “La demo prueba readiness masiva de producción.”

## 8. Conclusión

La validación del 2026-07-22 habilita presentar BegaIA como una solución multicanal controlada para demo comercial. La narrativa correcta es: experiencia conversacional unificada, operación visible desde Admin y control humano cuando corresponde, manteniendo prudencia sobre transporte y escala productiva.
