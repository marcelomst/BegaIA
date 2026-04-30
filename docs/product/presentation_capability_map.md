# DRAFT — Begasist Presentation Capability Map

## 1. Propósito del documento

Este documento consolida un mapa inicial de capacidades reales y presentables de Begasist para futuras piezas no técnicas:

- deck comercial
- one-pager
- guion de demo

No es una presentación final.
No redefine arquitectura ni producto.
No autoriza claims no validados.

---

## 2. Estado del documento

Documento: `DRAFT`

Uso permitido:

- preparar materiales de presentación
- alinear capacidad real versus wording comercial
- prevenir sobrepromesa

Uso no permitido:

- convertir wording prudente en promesa cerrada
- presentar límites actuales como capacidades productizadas
- agregar métricas o integraciones no verificadas

---

## 3. Mapa de capacidades

| Capacidad | Estado | Evidencia documental | Wording comercial seguro | Riesgo de sobrepromesa |
| --- | --- | --- | --- | --- |
| Concierge conversacional hotelero | Actual | `README.md` define Begasist como SaaS conversacional para hotelería y concierge digital multicanal. | “Begasist actúa como una capa conversacional especializada para hoteles.” | Bajo |
| Consultas operativas e informativas | Actual | `README.md` incluye responder consultas operativas e informativas. | “Puede asistir consultas frecuentes del huésped sobre operación e información del hotel.” | Medio si se dice “cualquier consulta”. |
| Flujos de reserva | Actual / validada documentalmente | `README.md` indica que puede guiar flujos de reserva. | “Guía conversaciones vinculadas a reservas.” | Alto si se dice “automatiza todo el booking”. |
| Follow-ups de reserva: snapshot, modify, cancel | Actual | `README.md` menciona snapshot, modify y cancel como follow-ups soportados. | “Permite continuar conversaciones sobre reservas: consultar, modificar o cancelar según contexto.” | Medio si se presenta como PMS completo. |
| Continuidad conversacional entre turnos | Actual | `README.md` lo lista como capacidad; `docs/architecture/message_pipeline.md` documenta `conv_state` y señales persistidas. | “Mantiene contexto conversacional para no tratar cada mensaje como aislado.” | Bajo |
| Operación asistida por humanos | Actual / posicionamiento seguro | `README.md` dice que puede integrarse con operación asistida cuando la automatización total no corresponde. | “Está pensado para convivir con operación humana cuando hace falta.” | Bajo |
| Runtime híbrido gobernado | Actual | `docs/architecture/message_pipeline.md` define pipeline híbrido con reglas, heurísticas, estado persistido, classifier, policy, graph y ejecutores. | “Combina reglas, contexto e interpretación semántica para gobernar conversaciones.” | Medio si se entra en tecnicismos. |
| Routing por dominio | Actual | `README.md` describe routing por dominio y ejecución de dominio. | “Distingue tipos de conversación para responder o actuar según el dominio correcto.” | Bajo |
| Estado canónico local de reservas | Actual / técnico | `README.md` menciona estado canónico local y separación con fuente externa. | “Mantiene una visión local consistente de la reserva durante la conversación.” | Alto si se explica demasiado a gerentes. |
| Multi-canalidad | Documentada | `README.md` menciona web, WhatsApp, email e integraciones externas conectadas cuando corresponda. | “Diseñado para operar en canales como web, WhatsApp, email e integraciones.” | Medio: separar “soportado/documentado” de “productizado”. |
| FAQ / amenities frecuentes | Actual | `docs/architecture/message_pipeline.md` documenta `stableIntentsGuard` para horarios, amenities y extensiones como desayuno, wifi o parking. | “Puede resolver consultas frecuentes del hotel como horarios o servicios.” | Medio si se dice que todo FAQ es determinístico. |
| Availability inquiry | Actual / endurecido recientemente | Cápsulas e hitos recientes documentan flujo de availability inquiry, respuesta de disponibilidad y handoff gobernado a reserva. | “Puede manejar consultas de disponibilidad y derivar hacia una reserva cuando el huésped lo expresa.” | Medio: validar wording antes del deck final. |
| Reference resolution | Actual / validada documentalmente | Roadmap e hitos del dominio reservation documentan reference resolution con existence y sufficiency validation. | “Puede manejar referencias contextuales a reservas sin actuar si falta claridad.” | Alto si se dice “entiende cualquier referencia”. |
| Ambiguity gating | Consolidada | Roadmap e hitos documentan detección de múltiples targets, bloqueo sin claridad y solicitud de aclaración. | “Ante ambigüedad, pide aclaración en lugar de ejecutar una acción riesgosa.” | Bajo |
| Range guards | Consolidada | Roadmap e hitos documentan validación de ordinal fuera de rango, bloqueo de ejecución inválida y aclaración. | “Evita ejecutar acciones sobre una reserva inexistente o mal referida.” | Bajo |
| Slot ingestion | Consolidada | Roadmap e hitos documentan ingestión completa en un turno y reducción de repreguntas redundantes. | “Puede aprovechar varios datos del huésped en el mismo mensaje.” | Bajo |
| Create sequencing | Consolidada | Roadmap e hitos documentan orden natural del flujo y prevención de propuesta prematura. | “Guía la reserva paso a paso sin adelantar propuestas cuando faltan datos.” | Bajo |
| Modify execution integrity | Consolidada | Roadmap e hitos la listan como capacidad consolidada del dominio reservation. | “Mantiene coherencia al modificar una reserva ya identificada.” | Medio |
| Cancel execution integrity | Consolidada | Roadmap e hitos la listan como capacidad consolidada del dominio reservation. | “Cancela solo cuando existe un target suficiente y gobernado.” | Medio |
| Pricing real por tarifa | Evitar / no actual | `docs/architecture/message_pipeline.md` lo lista como límite actual. | No usar como capacidad actual. | Alto |
| PMS real | Evitar / no actual | `docs/architecture/message_pipeline.md` lo lista como límite actual. | “No reemplaza al PMS.” | Alto |
| Coreferencia compleja libre | Evitar / no actual | `docs/architecture/message_pipeline.md` lista coreferencia compleja completa y resolución semántica abierta como límites. | “Maneja referencias acotadas y gobernadas, no cualquier referencia arbitraria.” | Alto |
| UI de selección de reserva | Evitar / no actual | `docs/architecture/message_pipeline.md` la lista como límite actual. | No presentar como existente. | Alto |
| Métricas de reducción de costos / aumento de reservas | Evitar | No hay evidencia documental de métricas. | “Apunta a reducir fricción operativa.” | Alto |

---

## 4. Capacidades principales para presentación

Para una presentación no técnica, priorizar estas siete capacidades:

1. Concierge conversacional especializado para hoteles.
2. Respuestas a consultas frecuentes y operativas.
3. Guía de flujos de reserva.
4. Continuidad conversacional entre turnos.
5. Follow-ups sobre reservas: consultar, modificar, cancelar.
6. Gobernanza ante ambigüedad.
7. Operación asistida cuando la automatización total no corresponde.

Estas siete capacidades alcanzan para construir una propuesta de valor clara sin caer en tecnicismo ni sobrepromesa.

---

## 5. Capacidades técnicas para anexo o traducción ejecutiva

Estos conceptos no deberían ir como eje de slides principales para audiencia gerencial:

- `messageHandler`
- estado canónico local
- `conv_state`
- reference resolution
- ambiguity gating
- range guards
- quote gating
- domain governance
- hybrid runtime

Sí pueden traducirse a lenguaje ejecutivo:

| Técnico | Traducción comercial |
| --- | --- |
| Estado persistido | “Recuerda el contexto útil de la conversación.” |
| Domain governance | “Evita mezclar temas y acciones incompatibles.” |
| Ambiguity gating | “Si no está claro, pregunta antes de actuar.” |
| Reference resolution | “Entiende referencias como ‘esa reserva’ cuando el contexto lo permite.” |
| Canonical state | “Mantiene consistencia sobre qué reserva se está tratando.” |
| Quote gating | “No avanza a propuesta si faltan datos necesarios.” |

---

## 6. Wording comercial recomendado

### 6.1 Versión corta

```text
Begasist para hoteles es un concierge conversacional que ayuda a responder consultas, guiar reservas y sostener continuidad con huéspedes, combinando automatización gobernada y operación asistida cuando hace falta.
```

### 6.2 Versión más conservadora

```text
Begasist es una capa conversacional especializada para hoteles, diseñada para asistir conversaciones reales con huéspedes y gobernar flujos como consultas, reservas y seguimiento de reservas.
```

### 6.3 Versión para inversores

```text
Begasist combina conversación, estado persistido y ejecución por dominio para resolver casos operativos reales de hotelería, empezando por atención conversacional y flujos vinculados a reservas.
```

Nota:
Usar `Begasist` como nombre interno actual.
No cerrar naming comercial en este documento.

---

## 7. Claims seguros para deck

Estos claims pueden usarse con seguridad razonable en materiales base:

- Especializado en hotelería.
- Diseñado para conversaciones reales con huéspedes.
- Mantiene continuidad entre turnos.
- Guía flujos vinculados a reservas.
- Soporta seguimiento de reservas: consultar, modificar, cancelar.
- Puede resolver consultas frecuentes del hotel.
- Pide aclaración cuando el contexto no alcanza para actuar.
- Convive con operación humana cuando la automatización total no corresponde.

---

## 8. Claims pendientes de validación antes de usar en deck

Estos claims requieren revisión puntual antes de quedar en una presentación:

- “Disponible en WhatsApp.”
  Estado: confirmar estado productivo real.

- “Disponible en email.”
  Estado: confirmar estado productivo real.

- “Integrado con Channel Manager.”
  Estado: confirmar alcance exacto.

- “Consulta disponibilidad real.”
  Estado: confirmar fuente y límites.

- “Reserva confirmada automáticamente.”
  Estado: confirmar si aplica o si corresponde a demo o simulación.

- “Listo para onboarding de hoteles.”
  Estado: requiere validación comercial y operativa.

---

## 9. Claims que no deben usarse

Estos claims no deben aparecer en deck, one-pager ni demo comercial:

- Reemplaza al PMS.
- Reemplaza al recepcionista.
- Automatiza toda la operación hotelera.
- Aumenta reservas en X%.
- Reduce costos en X%.
- Resuelve cualquier consulta del huésped.
- Entiende cualquier referencia o contexto libre.
- Hace pricing real por tarifa.
- Está migrado a graph como runtime principal.

---

## 10. Criterio de uso para presentación

Al preparar materiales no técnicos:

- usar capacidades actuales o consolidadas como base
- mantener wording prudente en integraciones, disponibilidad real y automatización
- evitar convertir capacidades técnicas en promesas comerciales absolutas
- separar explícitamente lo documentado de lo productizado

---

## 11. Resultado

```text
DOC-PRESENTATION-CAPABILITY-MAP-43
estado: draft documental creado
agente externo: no usado
runtime: no tocado
documento destino: docs/product/presentation_capability_map.md
```
