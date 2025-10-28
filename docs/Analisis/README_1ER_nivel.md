## messageHandler.ts — primer nivel

Propósito: manejar cada mensaje entrante por canal (web/email/WhatsApp), decidir la respuesta y persistirla.

Flujo:

Contexto e idempotencia:
Crea/actualiza Guest y Conversation, persiste el mensaje entrante (si aplica).
Construye historial reciente (lcHistory) y lee ConvState previo (reservationSlots, lastCategory, salesStage).
Pre/Body/Post pipeline:
preLLM: prepara “pre” con idioma, slots corrientes, playbook/prompt, hints.
bodyLLM: determina category + texto final con heurísticas para fechas/disponibilidad, y usa el grafo.
posLLM: asesoría/auditoría para decidir si requiere supervisión (si la fase está activada).
Reglas de disponibilidad/fechas (centralizadas):
Helpers en availability.ts: parseo de fechas, lado check-in/out, afirmativos, confirmación estricta, “consulta de estado”, etc.
runAvailabilityCheck: llama herramienta de disponibilidad, persiste lastProposal/salesStage y construye respuesta con totales si hay precio.
Casos cubiertos: pedir fecha faltante, ACK y verificación ante afirmativos, follow-up “¿pudiste verificar?” usando el rango propuesto.
Persistencia y envío:
upsertConvState con slots/propuesta/etapa.
Decide autosend vs pending por categoría, etapa y modo canal/guest.
Persiste mensaje AI y emite vía adaptador; si pending, envía aviso “revisado por recepcionista”.
Extras:
Detección de “enviar copia por WhatsApp” con normalización de teléfono y métricas ligeras.
Contratos mínimos:

Input: ChannelMessage con hotelId y content.
Efectos: persistencia de estado y envío de respuesta (o pending).
Errores: manejados con logs y fallbacks.

## graph.ts — primer nivel

Propósito: clasificar intención y guiar el turno por nodos de reserva, snapshot, verificación, cancelación, amenities, billing, soporte o retrieval (RAG).

Estructura:

GraphState: estado (mensajes, idioma, slots, salesStage, etc.).
Nodos:
classifyNode: decide category (heurística + LLM). Deriva preguntas de horario check-in/out a RAG.
handleReservationNode: slot-filling con fillSlotsWithLLM, normaliza señales (chrono), consulta disponibilidad (askAvailability), persiste lastProposal, y ofrece confirmar.
handleReservationSnapshotNode: arma snapshot desde ConvState.
handleReservationVerifyNode: pide código o datos alternativos.
Otros: cancel/amenities/billing/support → RAG + prompts.
Flujo de modificación: nodos ask_modify_field → ask_new_value → confirm_modification, con edges condicionales.
Políticas:

Si salesStage === close y no piden modificar/cancelar, deriva a retrieval.
Preguntas de horarios se desvían a retrieval (evita contaminar reserva).
Confirm intent light con slots completos → confirmación de reserva.
Persistencia:

upsertConvState con reservationSlots y lastProposal (+ toolCall), salesStage quote/followup/close.
Estado del refactor
Hecho:

Helpers de disponibilidad/fechas extraídos a availability.ts.
runAvailabilityCheck centralizado ahí; messageHandler.ts lo usa para follow-ups y afirmativos.
Limpieza de helpers duplicados en messageHandler.ts y arreglos de llaves/retornos.
Typecheck global: sin errores.
Sugerencia opcional:

Unificar también el nodo de disponibilidad del grafo para que use runAvailabilityCheck y así evitar divergencias de formato/persistencia; ahora usan caminos paralelos consistentes, pero centralizarlo más reduce drift.
¿Querés que adapte el nodo de reserva del grafo para usar runAvailabilityCheck y dejar una sola fuente de verdad para la verificación? Si te sirve, lo implemento en un paso corto y corro de nuevo el typecheck.

GPT-5 • 1x
