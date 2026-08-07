<!-- Path: docs/product/presentation_capability_map.md -->

# BegaIA — Presentation Capability Map

## 1. Estado

```yaml
document_status: validated_for_controlled_commercial_presentations
commercial_dry_run:
  date: 2026-07-22
  duration_until_farewell_input: "17:05"
canonical_guest_id: "cfcd4116-356d-4865-ab6b-63e1f8acbdfc"
strategic_reframe:
  id: COM-03-REFRAME-NARRATIVE-CAPABILITIES-DEMO-01
  thesis: "Conversaciones naturales. Operaciones gobernadas."
runtime_map_applies: false
```

Este mapa separa capacidad técnica, peso comercial, visibilidad en demo, claim seguro, limitación vigente y riesgo de sobrepromesa.

La clasificación estratégica describe cómo usar una capacidad en presentación comercial. No degrada su valor técnico ni arquitectónico.

## 2. Taxonomía Estratégica

| Clasificación | Uso |
| --- | --- |
| CORE_DIFFERENTIATOR | Capacidad que debe sostener la diferenciación principal de BegaIA |
| SUPPORTING_CAPABILITY | Capacidad útil para la experiencia, pero no diferencial aislado |
| COMMODITIZED_CAPABILITY | Capacidad ya observada en bots hoteleros competentes |
| INTERNAL_VALUE_NOT_VISIBLE | Capacidad valiosa internamente, pero difícil de entender sin demo o UI |
| PARTIAL | Capacidad disponible de forma parcial o con visibilidad limitada |
| DESTINATION | Dirección documentada, no claim actual |
| DO_NOT_POSITION_COMPETITIVELY | Capacidad que no debe venderse como diferencia frente al mercado |
| TECHNICAL_BACKUP | Capacidad útil para profundización técnica o demo extendida, no núcleo de demo breve |

## 3. Mapa De Capacidades

| Capacidad | Estado BegaIA | Clasificación estratégica | Evidencia | Claim comercial seguro | Limitación vigente | Riesgo |
| --- | --- | --- | --- | --- | --- | --- |
| Concierge Digital hotelero | Demostrada | CORE_DIFFERENTIATOR | Dry run comercial 2026-07-22 | "BegaIA es un Concierge Digital para hotelería: conversaciones naturales, operaciones gobernadas." | Debe explicarse sin sonar a chatbot genérico. | Medio |
| Chat web | Demostrada | COMMODITIZED_CAPABILITY | Widget Web demo | "Web es uno de los puntos de entrada de la demo." | Chat web no diferencia por sí solo. | Alto si se vende como diferencial |
| FAQ breve | Demostrada | COMMODITIZED_CAPABILITY | Check-in/parking en demo | "Responde consultas frecuentes controladas." | No cubre cualquier FAQ libre. | Medio |
| Habitaciones rich en Widget | Demostrada | SUPPORTING_CAPABILITY | Demo comercial y assets versionados | "El huésped puede explorar habitaciones con fotos." | Depende de KB/configuración vigente; no es diferencial aislado. | Medio |
| Preview rich en Admin | Demostrada | SUPPORTING_CAPABILITY | Admin Inbox en dry run | "Recepción puede ver contexto visual, no sólo texto." | No es editor visual completo. | Medio |
| Disponibilidad exploratoria | Demostrada | SUPPORTING_CAPABILITY | Flujo Web de disponibilidad | "Distingue consultar disponibilidad de crear una reserva." | No equivale a motor de revenue management. | Medio |
| Tarifas en contexto de demo | Demostrada | SUPPORTING_CAPABILITY | Flujo Web de disponibilidad | "Puede mostrar tarifas en el recorrido controlado." | No prometer pricing productivo universal. | Alto si se sobrevende |
| Reserva Web guiada | Demostrada | SUPPORTING_CAPABILITY | RES-37A215 | "Guía una reserva Web." | Si se muestra sola, no diferencia suficientemente. | Medio |
| Reserva gobernada | Demostrada | CORE_DIFFERENTIATOR | Reserva + confirmación explícita | "Guía la reserva y confirma antes de ejecutar." | No reemplaza PMS. | Alto si se sobrevende |
| Interlocutor distinto del titular | Demostrada | CORE_DIFFERENTIATOR | Martin conversa, Laura Gómez titular | "Separa quién conversa de a nombre de quién queda la reserva." | No equivale a una suite CRM integral. | Medio |
| Identidad canónica | Demostrada | CORE_DIFFERENTIATOR | Guest canónico en demo | "Ayuda a ordenar una identidad operativa entre canales." | No prometer matching universal. | Medio |
| Aliases | Implementada/documentada | INTERNAL_VALUE_NOT_VISIBLE | `guest_identity_model.md` | "Permite representar identificadores por canal dentro del modelo operativo." | Poco visible para prospecto sin UI o explicación. | Medio |
| Guest consolidation | Demostrada | CORE_DIFFERENTIATOR | Web Martin, Email Martín P., WhatsApp Martín Pérez | "El hotel puede consolidar contexto operativo del huésped." | No vender como suite CRM integral. | Alto si se exagera |
| Continuidad multicanal | Demostrada en demo controlada | CORE_DIFFERENTIATOR | Snapshot consolidado | "Puede operar un recorrido multicanal controlado bajo una identidad operativa común." | No implica paridad productiva absoluta. | Medio |
| Reserva WhatsApp Twilio | Demostrada en demo controlada | SUPPORTING_CAPABILITY | RES-77A568 | "WhatsApp puede operar como punto de entrada controlado." | Readiness productivo general requiere validaciones adicionales. | Medio |
| Email operativo | Demostrada con precarga | SUPPORTING_CAPABILITY | RES-A365BD | "Email puede integrarse como canal operativo controlado en demo." | En demo breve se usa fuera del cronómetro; transporte productivo destino no debe presentarse como actual. | Alto |
| Snapshot consolidado | Demostrada | CORE_DIFFERENTIATOR | Ana -> Laura -> Martín | "Muestra reservas asociadas al huésped en orden operativo." | Orden depende del ingreso real. | Bajo |
| Target explícito de reserva | Demostrada | CORE_DIFFERENTIATOR | Modify por ordinal | "Identifica la reserva correcta antes de modificar." | Debe mostrarse visualmente para ser entendido. | Medio |
| Modify por ordinal | Demostrada | CORE_DIFFERENTIATOR | "la primera reserva" resuelve a Ana Rodríguez | "Permite modificar por referencia contextual gobernada." | No cualquier coreferencia libre. | Medio |
| Preview y confirmación de modify | Demostrada | CORE_DIFFERENTIATOR | Preview antes de aplicar cambio | "No ejecuta cambios sensibles sin preview y confirmación." | No cubre todos los cambios posibles. | Bajo |
| Confirmación explícita | Demostrada | CORE_DIFFERENTIATOR | Reserva y modify | "Antes de ejecutar acciones sensibles, valida contexto y pide confirmación." | Debe distinguirse de un simple 'sí' ambiguo. | Bajo |
| Guards deterministas | Implementada/documentada | INTERNAL_VALUE_NOT_VISIBLE | `message_pipeline.md`, roadmap | "El sistema puede bloquear ejecución cuando falta claridad o suficiencia." | Requiere demo específica para ser comercialmente visible. | Medio |
| "Sí" sin propuesta válida no confirma | Demostrable | CORE_DIFFERENTIATOR | Contrato de confirmación/guards | "Entender una afirmación no es autorización suficiente para ejecutar." | Requiere escena breve de demo. | Bajo |
| Estado gobernado | Implementada/documentada | INTERNAL_VALUE_NOT_VISIBLE | `message_pipeline.md` | "BegaIA conserva contexto operativo para continuar correctamente." | No usar términos internos como `conv_state` en presentación general. | Medio |
| Trazabilidad | Parcial | PARTIAL | Admin/messages/conversations | "El sistema conserva historial operativo visible en Admin." | No prometer auditoría completa si no se muestra. | Medio |
| Control humano por canal | Demostrada | CORE_DIFFERENTIATOR | Admin Channels / modo supervisado | "Permite graduar automatización por canal." | No prometer políticas empresariales completas. | Medio |
| Control humano por guest | Documentada/demostrable | TECHNICAL_BACKUP | Admin/guest mode según configuración | "Puede aplicarse supervisión por huésped cuando corresponde." | No densificar demo breve si no aporta. | Medio |
| Supervised mode | Demostrada | CORE_DIFFERENTIATOR | Admin supervised flow | "El hotel puede revisar antes de enviar cuando corresponde." | Diferenciarlo de handoff genérico. | Medio |
| Handoff básico | Disponible como patrón operativo | COMMODITIZED_CAPABILITY | Observado también en mercado | "La operación puede escalar a humano." | No vender como diferencial aislado. | Alto |
| Farewell natural | Demostrada | SUPPORTING_CAPABILITY | Cierre "chau" medido | "Cierra la conversación sin reabrir flujos residuales." | No implica localización completa de todo el runtime. | Bajo |
| Channel Manager | Documentada como integración transaccional | DESTINATION/TECHNICAL_BACKUP | Admin Channels | "Se muestra como integración transaccional, no como canal conversacional." | No presentar como PMS ni como gestor integral de canales. | Alto |
| Cancel | Implementada/documentada | TECHNICAL_BACKUP | Runtime reservation domain | "Puede formar parte de flujos gobernados de reserva." | No es core de demo breve mientras no sea visible y estable comercialmente. | Medio |

## 4. Capacidades Core

Estas capacidades deben sostener la diferencia principal de BegaIA:

- identidad canónica;
- continuidad multicanal controlada;
- target explícito de reserva;
- confirmación explícita;
- guards de ejecución;
- reserva y modify gobernados;
- supervisión humana controlada;
- separación entre conversación natural y ejecución responsable.

## 5. Capacidades De Soporte

Estas capacidades ayudan a la experiencia, pero no deben ocupar el centro de la diferenciación:

- FAQ;
- habitaciones rich;
- imágenes;
- disponibilidad;
- tarifas;
- reserva Web si se muestra sin gobernanza;
- Email/WhatsApp como canales de demo controlada;
- Admin visual.

## 6. Capacidades Comoditizadas

La evidencia de mercado muestra que varias capacidades visibles ya aparecen en bots hoteleros competentes:

- IA/chat;
- lenguaje natural básico;
- FAQ;
- amenities;
- horarios;
- habitaciones;
- imágenes;
- disponibilidad;
- tarifas;
- políticas;
- links de reserva;
- formularios;
- recomendaciones básicas;
- handoff genérico.

Estas capacidades pueden mostrarse, pero no deben presentarse como prueba principal de diferenciación.

## 7. Valor Interno Que Debe Hacerse Visible

Capacidades valiosas que necesitan demo, UI o explicación:

- aliases;
- estado gobernado;
- guards;
- target lifecycle;
- persistencia operacional;
- trazabilidad;
- límite entre interpretar y ejecutar.

Pregunta guía:

> ¿Un gerente de hotel puede entender por qué esto le importa después de verlo durante 60 segundos?

Si la respuesta es no, la capacidad debe traducirse a una escena visible.

## 8. Claims Fuertes

- "BegaIA no sólo conversa: gobierna cuándo una conversación puede convertirse en una operación."
- "Antes de ejecutar acciones sensibles, BegaIA valida contexto y pide confirmación."
- "BegaIA ayuda a ordenar identidad operativa del huésped entre canales."
- "El hotel mantiene control humano cuando corresponde."

## 9. Claims Seguros

- "BegaIA es un Concierge Digital especializado en hotelería."
- "La demo validada opera Web, Email y WhatsApp en un recorrido controlado."
- "El sistema guía reservas y modificaciones con confirmación explícita."
- "El sistema conserva continuidad multicanal bajo una identidad operativa común."
- "El hotel puede graduar automatización y supervisión."

## 10. Claims Prudentes

- "Validado en demo controlada" no significa "listo para producción masiva".
- "Identidad canónica" no significa "suite CRM integral".
- "Reservas guiadas" no significa "PMS integral".
- "WhatsApp y Email demostrados" no significa "paridad productiva absoluta".
- "Rich rooms" depende de KB y configuración correctamente regeneradas.
- "Trazabilidad" debe mostrarse sólo en el nivel visible y real disponible.

## 11. Claims A Evitar

- producción masiva sin matices;
- PMS integral;
- suite CRM integral;
- gestor integral de canales;
- automatización total;
- onboarding automático;
- paridad productiva absoluta;
- métricas de ahorro o conversión no validadas;
- superioridad general frente a PXSol o Asksuite;
- afirmaciones sobre mecanismos internos de competidores sin evidencia pública suficiente.

## 12. Uso Recomendado

Usar este mapa para deck, one-pager, speech y preparación de demo.

La pregunta que debe gobernar su uso es:

> ¿Esta capacidad demuestra qué hace BegaIA diferente cuando una conversación debe convertirse en una operación?

Si la respuesta es no, la capacidad debe tratarse como soporte, contexto o backup técnico.
