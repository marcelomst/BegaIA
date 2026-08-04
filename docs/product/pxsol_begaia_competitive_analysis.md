<!-- Path: docs/product/pxsol_begaia_competitive_analysis.md -->

# PXSol vs BegaIA — Analisis estrategico comparativo V2

```yaml
STATUS: REFERENCE
DOCUMENT_TYPE: PRODUCT_STRATEGY_ANALYSIS
CANONICALITY: STRATEGIC_REFERENCE_NON_NORMATIVE
TIME_SENSITIVE: true
CUT_OFF_DATE: 2026-08-04
```

## 1. Proposito

Materializar una version de referencia estrategica del analisis comparativo PXSol vs BegaIA, orientada a preparar decisiones comerciales, diagnostico de prospectos y ajustes futuros de materiales de producto.

Este documento conserva la conclusion central de la V2: PXSol debe analizarse como un ecosistema hotelero amplio, no como un bot simple; BegaIA debe diferenciarse por gobernanza conversacional, acciones sensibles controladas, identidad operativa y trazabilidad, no por afirmar genericamente que tiene IA, chat, disponibilidad, tarifas o enlaces.

## 2. Alcance y limites

Este documento:

- no es ADR;
- no modifica arquitectura;
- no modifica roadmap;
- no modifica claims existentes;
- no constituye auditoria contractual;
- no sustituye discovery;
- requiere revision periodica;
- no identifica contractual o tecnicamente a Apollo como nombre del bot;
- no identifica a Mithras como proveedor del bot;
- no convierte ausencia de documentacion publica en evidencia de ausencia;
- no presenta capacidades destino de BegaIA como capacidades actuales.

## 3. Fecha de corte y politica de revision

Fecha de corte: `2026-08-04`.

Politica recomendada:

- revalidar fuentes PXSol antes de usar este analisis en material externo;
- revisar cada 60 a 90 dias si se usa en ciclo comercial activo;
- separar siempre PXSol general de configuraciones observadas en hoteles especificos;
- actualizar el documento si aparece evidencia contractual, tecnica o funcional nueva sobre Apollo, Mithras, ReservaDirecto o Sunset Beach;
- no modificar documentos comerciales existentes a partir de este analisis sin hito separado.

## 4. Clasificacion de evidencia

Categorias permitidas:

- `OFICIAL_PXSOL`: informacion publicada por PXSol, ReservaDirecto o ayuda/desarrolladores oficiales.
- `OBSERVADO_SUNSET_BEACH`: comportamiento observado manualmente en Hotel Sunset Beach.
- `CANONICO_BEGAIA`: documentacion interna canonica o arquitectonica de BegaIA/Begasist.
- `DEMOSTRADO_BEGAIA`: comportamiento demostrado en demo o dry run controlado.
- `DESTINO_DOCUMENTADO_BEGAIA`: direccion arquitectonica o de producto documentada, no necesariamente actual.
- `INFERENCIA_TECNICA`: conclusion razonable derivada de evidencia tecnica, sin confirmacion contractual.
- `DECLARACION_COMERCIAL_NO_VERIFICADA`: afirmacion comercial del proveedor no verificada independientemente.
- `DESCONOCIDO`: informacion no determinada con evidencia suficiente.

## 5. Fuentes BegaIA

| Fuente | Fecha consulta | Afirmaciones soportadas | Limites |
| --- | --- | --- | --- |
| `README.md` | 2026-08-04 | SaaS conversacional hotelero, canales, runtime, no chatbot generico | No define claims comerciales finos |
| `docs/architecture/message_pipeline.md` | 2026-08-04 | `messageHandler`, guards, contexto, dominio, persistencia | Arquitectura, no material comercial |
| `docs/architecture/ADR-PIPELINE-RUNTIME-TARGET.md` | 2026-08-04 | Runtime vigente sigue en `messageHandler`, no graph principal | No describe features de producto |
| `docs/architecture/ADR-EMAIL-TRANSPORT-TARGET.md` | 2026-08-04 | Email actual transicional/fallback; destino desacoplado | No prometer produccion masiva |
| `docs/product/architecture_concierge.md` | 2026-08-04 | BegaIA como Concierge Digital, no PMS/CRM/reemplazo recepcion | Conceptual |
| `docs/product/presentation_capability_map.md` | 2026-08-04 | Capacidades demostradas y claims seguros | Demo controlada |
| `docs/product/presentation_narrative_base.md` | 2026-08-04 | Narrativa comercial segura | No pricing ni contratos |
| `docs/product/presentation_use_cases_demo_selection.md` | 2026-08-04 | Demo breve/extendida y casos presentables | No produccion |
| `docs/architecture/guest_identity_model.md` | 2026-08-04 | `guestId`, aliases, merge manual, read-model reparable | BegaIA interno |
| `docs/architecture/system_operating_model.md` | 2026-08-04 | Gobernanza de hitos, roles, no refactor sin hito | No competitivo |
| `docs/architecture/roadmap.md` | 2026-08-04 | Demo comercial validada y runtime roadmap | No convertir destino en actual |
| `docs/architecture/prompts/architectural_checkpoint.md` | 2026-08-04 | Checkpoint de readiness arquitectonico | Prompt, no estado comercial |

## 6. Fuentes PXSol

| Fuente | Fecha consulta | Afirmaciones soportadas | Limites |
| --- | --- | --- | --- |
| https://www.pxsol.com/es/ | 2026-08-04 | Suite hotelera all-in-one, PMS, motor, CRM, Channel Manager, base instalada declarada | Declaracion publica del proveedor |
| https://www.pxsol.com/es/precios | 2026-08-04 | Asistente Virtual IA, bandeja multicanal, historial/perfil, integracion PMS/motor/CRM, precios publicados | No prueba configuracion de Sunset Beach |
| https://www.pxsol.com/es-mx/producto/aplicacion-conversaciones | 2026-08-04 | App Conversaciones, canales, staff objetivo, integracion con objetos como presupuestos/disponibilidad | Pagina comercial |
| https://www.pxsol.com/es/producto/widget-para-web-hoteles | 2026-08-04 | Widget web, IA, disponibilidad, precios, servicios, leads | Pagina comercial |
| https://ayuda.pxsol.com/conversaciones/como_activar_un_widget_en_la_web_para_recibir_consultas_dentro_de_conversaciones_de_pxsol | 2026-08-04 | Widget web configurable, datos solicitables, equipo asociado, sitio PXSol o externo | Ayuda funcional |
| https://ayuda.pxsol.com/conversaciones/como_responder_un_mensaje_de_conversaciones_con_ia | 2026-08-04 | Respuesta Inteligente usa conversacion, KB y disponibilidad del motor; edicion antes de enviar | No demuestra automatizacion sin humano |
| https://ayuda.pxsol.com/conversaciones/como_activar_o_desactivar_las_respuestas_automaticas_generadas_por_la_ai_en_la_aplicacion_conversaciones | 2026-08-04 | Respuestas automaticas IA activables/desactivables; guia indica WhatsApp como unico canal en esa version | Puede estar desactualizada frente a paginas comerciales |
| https://ayuda.pxsol.com/es/workflows-para-ia | 2026-08-04 | NLP, entidades, contexto, acciones, datos desde PXSol | Guia general |
| https://ayuda.pxsol.com/conversaciones/como_ver_si_el_chat_con_un_cliente_dentro_de_conversaciones_ya_tiene_una_consulta_o_reserva_asociada | 2026-08-04 | Chat puede mostrar consulta/reserva asociada y abrirla | No prueba creacion automatica |
| https://developers.pxsol.com/ | 2026-08-04 | API publica para PMS/reservas/disponibilidad/tarifas/hotel info | No detalla bot especifico |
| https://ayuda.pxsol.com/marca_blanca/marca_blanca__reservadirecto | 2026-08-04 | ReservaDirecto existe y admite marca blanca | No prueba titularidad del flujo Sunset Beach |

## 7. Evidencia Sunset Beach

Clasificacion `OBSERVADO_SUNSET_BEACH`:

- nombre y telefono previos al chat;
- saludo personalizado;
- categorias de alojamiento;
- disponibilidad;
- tarifas;
- tarifas flexibles y no reembolsables;
- desayuno;
- politicas;
- estacionamiento;
- correcciones de huespedes;
- correcciones de fechas;
- mantenimiento de contexto;
- referencias conversacionales;
- prudencia sobre piscina climatizada;
- enlace contextualizado;
- `link.mithras.cloud`;
- parametros `px_apollo`;
- flujo ReservaDirecto;
- imposibilidad de confirmar directamente desde el bot observado;
- ausencia de captura de tarjeta;
- derivacion humana;
- continuidad dentro del mismo hilo;
- contexto visible al recepcionista;
- falta de identificacion clara bot/humano;
- respuesta incompleta sobre datos conservados.

## 8. PXSol / ReservaDirecto / Apollo / Mithras

| Elemento | Clasificacion | Estado |
| --- | --- | --- |
| PXSol | `OFICIAL_PXSOL`; `OBSERVADO_SUNSET_BEACH` | Proveedor/ecosistema hotelero identificado en fuentes oficiales y en pie del sitio observado por Marcelo |
| ReservaDirecto | `OFICIAL_PXSOL`; `OBSERVADO_SUNSET_BEACH` | Producto/flujo documentado y observado en el recorrido de reserva |
| `px_apollo` | `OBSERVADO_SUNSET_BEACH`; `DESCONOCIDO` | Parametro observado; semantica exacta pendiente |
| `link.mithras.cloud` | `OBSERVADO_SUNSET_BEACH`; `DESCONOCIDO` | Infraestructura de enlace observada; funcion y titularidad exactas pendientes |
| Nombre contractual del bot | `DESCONOCIDO` | No determinado |

## 9. Estado verificable de BegaIA

Actual/demostrado:

- Concierge Digital hotelero en demo controlada;
- Web;
- habitaciones rich;
- disponibilidad exploratoria;
- reserva guiada con confirmacion;
- titular distinto del interlocutor;
- WhatsApp demo controlada;
- Email precargado/transicional;
- Admin;
- supervision;
- identidad canonica;
- merge manual;
- snapshot consolidado;
- modify por ordinal.

Destino documentado:

- email productivo desacoplado del inbox operativo;
- evolucion gradual del runtime;
- mas robustez multicanal y continuidad operacional;
- integraciones transaccionales gobernadas.

Pendiente/no prometer:

- PMS completo;
- CRM completo;
- Channel Manager completo;
- pricing real productivo;
- produccion masiva sin matices;
- matching universal de identidad;
- paridad productiva absoluta de Email/WhatsApp.

## 10. Matriz completa de 92 dimensiones

| ID | Dimension | PXSol general | PXSol en Sunset Beach | BegaIA actual | Estado BegaIA | BegaIA destino documentado | Evidencia | Diferencia verificable | Incognita | Consecuencia comercial |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Posicionamiento del producto | Suite hotelera all-in-one + IA | Proveedor web identificado | Concierge Digital hotelero | DEMOSTRADO | Capa operativa gobernada | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; CANONICO_BEGAIA | PXSol suite; BegaIA capa conversacional | Producto exacto usado | No vender BegaIA como suite |
| 2 | Publico objetivo | Hoteles/alojamientos/staff | Hotel operativo real | Hoteles con necesidad conversacional | DEMOSTRADO | SaaS hotelero controlado | OFICIAL_PXSOL; DEMOSTRADO_BEGAIA | Ambos hoteleria | Segmento ideal de BegaIA | Segmentar por dolor, no por industria |
| 3 | Modelo comercial | Planes/productos/precios publicados | DESCONOCIDO | Sin pricing canonico revisado | NO_DISPONIBLE | Piloto controlado | OFICIAL_PXSOL; DESCONOCIDO | PXSol publica planes | Pricing BegaIA | Evitar comparacion de precio |
| 4 | Alcance funcional | PMS, motor, CRM, channel, IA | Bot + reserva directa observados | Conversacion, reservas demo, Admin | DEMOSTRADO | Integraciones gobernadas | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | PXSol cubre mas modulos publicados | Alcance real contratado | BegaIA debe acotar alcance |
| 5 | Chat web | Widget/chat web publicado | Chat web observado | Widget/Web demo | DEMOSTRADO | Web canal estable | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Solapamiento directo | Paridad UX | No usar chat web como diferencial |
| 6 | WhatsApp | Publica WhatsApp en Conversaciones/CRM | No observado | Demo WhatsApp Twilio | DEMOSTRADO | Onboarding prudente | OFICIAL_PXSOL; DEMOSTRADO_BEGAIA; DESTINO_DOCUMENTADO_BEGAIA | Ambos lo nombran | Sunset WhatsApp activo | Diagnosticar canal activo |
| 7 | Email | CRM/Inbox/email marketing publicados | No observado | Email demo precargado/transicional | TRANSICIONAL | Transporte desacoplado | OFICIAL_PXSOL; DEMOSTRADO_BEGAIA; DESTINO_DOCUMENTADO_BEGAIA | PXSol publica CRM/Inbox; BegaIA destino no cerrado | Email conversacional PXSol | Ser prudente |
| 8 | Instagram | Publicado en Conversaciones | No observado | No canonico actual en demo | NO_DISPONIBLE | DESCONOCIDO | OFICIAL_PXSOL; DESCONOCIDO | PXSol publica canal | Implementacion real | No prometer paridad |
| 9 | Google Business u otros canales | Google/otros publicados | No observado | No canonico actual | NO_DISPONIBLE | DESCONOCIDO | OFICIAL_PXSOL; DESCONOCIDO | PXSol publica mas canales | Activacion real | No prometer paridad |
| 10 | Bandeja multicanal | Publicada | Humano continua hilo | Admin Conversations/Channels | DEMOSTRADO | Admin operativo | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Ambos tienen operacion de inbox | Profundidad funcional | Diferenciar por gobierno |
| 11 | Identidad del huesped | Perfil/contacto publicado | Nombre/telefono solicitados | Guest profile/Admin | DEMOSTRADO | Perfil operativo | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Ambos modelan huesped | Modelo interno PXSol | Preguntar consolidacion |
| 12 | Identidad canonica | DESCONOCIDO publico | DESCONOCIDO | `guestId` canonico documentado | IMPLEMENTADO | Evolucion identidad | CANONICO_BEGAIA; DESCONOCIDO | BegaIA documenta contrato | PXSol interno | Diferencial prudente |
| 13 | Aliases | Contactos/canales publicados | Nombre/telefono | `guest_aliases` documentado | IMPLEMENTADO | Read-model reparable | CANONICO_BEGAIA; OFICIAL_PXSOL | BegaIA explicita aliases | Alias PXSol | Claim tecnico solo si se explica |
| 14 | Merge de contactos | Asociacion contacto-chat publicada | DESCONOCIDO | Merge manual Admin | IMPLEMENTADO | Mejoras admin | CANONICO_BEGAIA; OFICIAL_PXSOL | BegaIA documenta merge | PXSol merge cross-channel | Pregunta discovery |
| 15 | Persistencia entre sesiones | Historial publicado | Contexto en sesion observado | Web guestId/localStorage | IMPLEMENTADO | Mayor continuidad | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; CANONICO_BEGAIA | Ambos tienen persistencia parcial/documentada | Cross-session real | No sobredimensionar |
| 16 | Persistencia entre canales | Perfil/historial multicanal publicado | No comprobado | Demo consolidada Web/Email/WA | DEMOSTRADO | Multicanal productivo prudente | OFICIAL_PXSOL; DEMOSTRADO_BEGAIA | Ambos lo sugieren/demuestran en distinto nivel | PXSol cross-channel real | Diagnosticar |
| 17 | Historial del huesped | Publicado | Hilo conserva contexto | reservationHistory/Admin | DEMOSTRADO | Historial mas completo | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; CANONICO_BEGAIA | Ambos | Retencion y alcance | No diferencial generico |
| 18 | Perfil del huesped | Publicado | Datos previos chat | Admin Guest Profile | DEMOSTRADO | Perfil operativo | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Ambos | Campo completo PXSol | Evitar CRM completo |
| 19 | Consulta de disponibilidad | Publicada via motor | Comprobada | Demo disponibilidad | DEMOSTRADO | Integracion transaccional | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Solapamiento alto | Fuente real de stock | No diferencial |
| 20 | Consulta de tarifas | Publicada | Comprobada | Demo tarifas | DEMOSTRADO | Integracion real futura | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | PXSol ligado a motor | Pricing BegaIA productivo | Prudencia |
| 21 | Presupuestos | Publicado en Conversaciones/CRM | Enlace/opciones observadas | Quote/propuesta demo | DEMOSTRADO | Flujos gobernados | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Solapamiento | Si PXSol crea presupuesto formal | No vender quote aislado |
| 22 | Correccion de fechas | Workflows entidades | Comprobada | Runtime date repair/modify demo | DEMOSTRADO | Mas validacion | OBSERVADO_SUNSET_BEACH; CANONICO_BEGAIA | Ambos manejan correccion | Limites PXSol | Mostrar precision BegaIA |
| 23 | Correccion de huespedes | Workflows entidades | Comprobada | Slots guests demo | DEMOSTRADO | Validacion capacidad | OBSERVADO_SUNSET_BEACH; CANONICO_BEGAIA | Ambos | Capacidad por room PXSol | No claim exclusivo |
| 24 | Correccion de tipo de habitacion | DESCONOCIDO especifico | Categorias y opciones | Room slots demo | DEMOSTRADO | KB/rich rooms | OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Ambos operan habitacion en algun nivel; exactitud PXSol no publica | Flujo exacto | Prudencia |
| 25 | Referencias conversacionales | Contexto publicado | Comprobadas | Reference resolution/ordinal | DEMOSTRADO | Mas cobertura | OBSERVADO_SUNSET_BEACH; CANONICO_BEGAIA | BegaIA documenta targets; PXSol observado en hilo | Profundidad PXSol | Demo target ayuda |
| 26 | Manejo de ambiguedad | Manejo errores general | DESCONOCIDO | Ambiguity gating documentado | IMPLEMENTADO | Mas cobertura | CANONICO_BEGAIA; DESCONOCIDO | BegaIA explicito | PXSol equivalente | Diferencial no exclusivo |
| 27 | Consulta de servicios | Datos hotel publicados | Comprobada | KB/services demo | DEMOSTRADO | KB gobernada | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Solapamiento | Cobertura KB | No diferencial |
| 28 | Consulta de politicas | Politicas motor publicadas | Comprobada | KB/policies demo | DEMOSTRADO | Guards KB | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Solapamiento | Exhaustividad | Usar como basico |
| 29 | Knowledge Base | KB IA documentada | Inferida por respuestas | KB hotelera | DEMOSTRADO | Gobernanza KB | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; CANONICO_BEGAIA | Ambos usan KB | Modelo KB PXSol | No claim exclusivo |
| 30 | Respuestas con informacion no confirmada | Escalado si no responde | Prudencia piscina | Fallback/guards | IMPLEMENTADO | Mejor transparencia | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; CANONICO_BEGAIA | Ambos muestran prudencia | Politica sistematica PXSol | Buen punto comparativo |
| 31 | Enlaces de reserva | Motor/link publicado | Link contextualizado | Puede guiar/confirmar demo | DEMOSTRADO | Integracion externa | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | PXSol observado con link real | Semantica link | No competir por link |
| 32 | Reserva directa | Motor publicado | Flujo ReservaDirecto | Reserva demo interna | DEMOSTRADO | Integracion CM/PMS | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | PXSol ecosistema motor | ReservaDirecto contrato | Prudencia |
| 33 | Confirmacion de reserva | Motor confirma; bot no observado | Bot no confirma directo | Confirmacion explicita demo | DEMOSTRADO | Acciones gobernadas | OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | BegaIA confirma en demo; Sunset deriva link | Si PXSol bot confirma en otras configs | Claim acotado |
| 34 | Modificacion de reserva | PMS docs gestion reserva | No observado | Modify por ordinal demo | DEMOSTRADO | Mas cambios gobernados | OFICIAL_PXSOL; DEMOSTRADO_BEGAIA | PXSol gestiona reserva; bot no observado | Bot modify PXSol | Demo BegaIA util |
| 35 | Cancelacion de reserva | Docs motor/PMS cancelacion | No observado | Cancel runtime documentado | IMPLEMENTADO | Mas gobernanza | OFICIAL_PXSOL; CANONICO_BEGAIA | Ambos tienen dominio reserva; canal bot desconocido | Cancel bot PXSol | Claim tecnico prudente |
| 36 | Consulta de reserva existente | Chat-reserva asociada publicado | No observado | Snapshot demo | DEMOSTRADO | Mejor snapshot | OFICIAL_PXSOL; DEMOSTRADO_BEGAIA | Ambos pueden vincular reserva | Guest-facing PXSol | Diagnostico |
| 37 | Seleccion de target de reserva | DESCONOCIDO | Referencias observadas | selected target/ordinal | DEMOSTRADO | Mas robustez | OBSERVADO_SUNSET_BEACH; CANONICO_BEGAIA | BegaIA documenta target | PXSol target interno | Hacer visible en demo |
| 38 | Confirmacion explicita | Edicion humana IA publicada | Bot no confirma | Confirmar antes de create/modify | DEMOSTRADO | Policy sensible | DEMOSTRADO_BEGAIA; OBSERVADO_SUNSET_BEACH | BegaIA lo muestra como contrato | PXSol acciones sensibles | Claim central prudente |
| 39 | Prevencion de confirmaciones ambiguas | DESCONOCIDO | DESCONOCIDO | Gating/guards | IMPLEMENTADO | Mas cobertura | CANONICO_BEGAIA; DESCONOCIDO | BegaIA explicito | PXSol equivalente | Diferencial no exclusivo |
| 40 | Validacion de fechas | Workflows entidades | Correcciones fechas | Date coherence | IMPLEMENTADO | Mas validacion | OBSERVADO_SUNSET_BEACH; CANONICO_BEGAIA | Ambos | Casos edge PXSol | Demo edge |
| 41 | Validacion de capacidad | Motor disponibilidad | Huespedes recalculan | Capacity/slots demo | DEMOSTRADO | Integracion inventario | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | PXSol motor real publicado | Fuente stock BegaIA | Prudencia |
| 42 | Validacion de disponibilidad | Motor tiempo real publicado | Comprobada | Demo availability | DEMOSTRADO | CM real futuro | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | PXSol ligado a motor | Productivo BegaIA | No sobreprometer |
| 43 | Guards operativos | DESCONOCIDO publico | Prudencia puntual | Guards documentados | IMPLEMENTADO | Ampliacion | CANONICO_BEGAIA; DESCONOCIDO | BegaIA documenta guards | PXSol interno | Diferencial abstracto |
| 44 | Acciones sensibles | DESCONOCIDO | No tarjeta/no confirmacion | Confirmacion acciones | DEMOSTRADO | Risk policy | OBSERVADO_SUNSET_BEACH; CANONICO_BEGAIA | BegaIA explicito | PXSol policy | Preguntar |
| 45 | Ejecucion determinista | DESCONOCIDO | DESCONOCIDO | Fast paths/guards | IMPLEMENTADO | Mas separacion | CANONICO_BEGAIA; DESCONOCIDO | BegaIA arquitectura explicita | PXSol ejecucion | No claim comercial directo |
| 46 | Estado conversacional | Contexto publicado | Contexto observado | `conv_state` | IMPLEMENTADO | Estado canonico | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; CANONICO_BEGAIA | Ambos sostienen contexto; BegaIA documenta estado | PXSol state model | Demo continuidad |
| 47 | Dominio dominante por turno | DESCONOCIDO | DESCONOCIDO | Domain governance | IMPLEMENTADO | Mas control | CANONICO_BEGAIA | BegaIA explicito | PXSol routing | Abstracto |
| 48 | Manejo multi-intent | DESCONOCIDO | Parcial no observado | Focus governance/laterales | IMPLEMENTADO | Mas cobertura | CANONICO_BEGAIA; DESCONOCIDO | BegaIA documenta | PXSol multi-intent | No claim sin demo |
| 49 | Supervision humana | IA editable/manual publicada | Humano continua hilo | Supervised mode | DEMOSTRADO | Modos por canal/guest | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Ambos humano + IA | Granularidad PXSol | No exclusivo |
| 50 | Aprobacion antes de enviar | IA permite editar/confirmar texto | Humano responde | Admin supervised send | DEMOSTRADO | Mejor UX Admin | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Solapamiento | Automatizacion por canal | Preguntar |
| 51 | Aprobacion antes de ejecutar | DESCONOCIDO | Bot no ejecuta reserva | Confirmacion accion | DEMOSTRADO | Acciones sensibles | OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | BegaIA muestra ejecucion gobernada | PXSol policy | Claim prudente |
| 52 | Derivacion humana | Publicada/implicita | Comprobada | Supervised/manual | DEMOSTRADO | Escalado controlado | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Solapamiento | Senalizacion | No diferencial |
| 53 | Transferencia de contexto | Chat asociado/Conversaciones | Contexto visible | Admin conversation context | DEMOSTRADO | Trazabilidad | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Solapamiento | Campos transferidos | Preguntar calidad |
| 54 | Identificacion bot/humano | DESCONOCIDO | No clara | Supervisado visible en Admin; widget segun flujo | PARCIAL | Mejor claridad UX | OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Dolor observado en Sunset | BegaIA guest-facing completo | Oportunidad demo |
| 55 | Trazabilidad | Registros sistema publicados parcialmente | DESCONOCIDO | messages/conversations/Admin | IMPLEMENTADO | Auditoria mayor | CANONICO_BEGAIA; OFICIAL_PXSOL | BegaIA trazabilidad interna | PXSol logs bot | Preguntar |
| 56 | Auditoria | API/logs docs parciales | DESCONOCIDO | Historial y metadata | PARCIAL | Auditoria acciones | CANONICO_BEGAIA; DESCONOCIDO | No comparable | Auditoria comercial | No prometer legal |
| 57 | Registro de decisiones | DESCONOCIDO | DESCONOCIDO | Routing/trace interno | PARCIAL | Observabilidad | CANONICO_BEGAIA | BegaIA interno | PXSol | Hacer visible |
| 58 | Registro de acciones | PMS registra acciones | No observado | Reservas/messages | IMPLEMENTADO | Audit trail | OFICIAL_PXSOL; CANONICO_BEGAIA | Ambos pueden registrar acciones en distinto nivel | Bot action logs PXSol | Preguntar |
| 59 | Integracion con motor de reservas | Publicada | Observada via enlace | Demo/in-memory o integracion acotada | PARCIAL | CM/transaccional | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | PXSol publica integracion nativa | BegaIA productiva | No competir aqui |
| 60 | Integracion con PMS | Publicada | DESCONOCIDO | No PMS | NO_DISPONIBLE | Integraciones externas posibles | OFICIAL_PXSOL; CANONICO_BEGAIA | PXSol publica PMS | Si Sunset usa PMS PXSol | BegaIA no PMS |
| 61 | Integracion con CRM | Publicada | DESCONOCIDO | No CRM completo | NO_DISPONIBLE | Perfil operativo | OFICIAL_PXSOL; CANONICO_BEGAIA | PXSol publica CRM | Alcance real | No claim CRM |
| 62 | Integracion con Channel Manager | Publicada | DESCONOCIDO | Admin muestra integracion transaccional demo | PARCIAL | Integracion transaccional | OFICIAL_PXSOL; DEMOSTRADO_BEGAIA | PXSol publica Channel Manager | BegaIA productivo | No claim CM completo |
| 63 | Integracion con pagos | Publicada | No tarjeta en bot | No pagos productivos | NO_DISPONIBLE | Gobernanza pagos futura | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH | PXSol publica pagos | Bot cobra? | Evitar pagos |
| 64 | API publica | Publicada | DESCONOCIDO | APIs internas app | IMPLEMENTADO interno | Extensibilidad | OFICIAL_PXSOL; CANONICO_BEGAIA | PXSol publica developers | API BegaIA externa | No vender API publica |
| 65 | Webhooks | API/integraciones parcialmente | DESCONOCIDO | Algunos endpoints internos | PARCIAL | Event-driven email/CM | DESTINO_DOCUMENTADO_BEGAIA; DESCONOCIDO | No comparable publico | PXSol webhooks concretos | No claim |
| 66 | Extensibilidad | API publica | DESCONOCIDO | Arquitectura Next/lib | PARCIAL | Integraciones | OFICIAL_PXSOL; CANONICO_BEGAIA | PXSol publica API | Roadmap BegaIA | Prudencia |
| 67 | Personalizacion por hotel | Widget, KB, web publicados | Bot hotel especifico | KB/config demo | DEMOSTRADO | Config por hotel | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Ambos | Profundidad | Basico |
| 68 | Configuracion por canal | Respuestas IA por canal en ayuda | DESCONOCIDO | Admin Channels modos | DEMOSTRADO | Por guest/canal | OFICIAL_PXSOL; DEMOSTRADO_BEGAIA | Ambos tienen control canal | Granularidad | Demo Admin |
| 69 | Administracion de huespedes | Contactos/CRM | Datos pre-chat | Admin Guests/Profile | DEMOSTRADO | Mejor profile | OFICIAL_PXSOL; DEMOSTRADO_BEGAIA | Ambos | Merge PXSol | Preguntar |
| 70 | Administracion de conversaciones | Conversaciones publicada | Humano en hilo | Admin Conversations | DEMOSTRADO | Inbox unificado | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Solapamiento | UX detalle | No diferencial generico |
| 71 | Inbox operativo | Conversaciones/Inbox | Hilo humano | Admin Inbox | DEMOSTRADO | Compactacion/operacion | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Solapamiento | Readiness UX BegaIA | Diferenciar por control |
| 72 | Consolidacion multicanal | Historial/perfil publicado | No comprobado | Demo guest canonico | DEMOSTRADO | Productiva prudente | OFICIAL_PXSOL; DEMOSTRADO_BEGAIA | BegaIA demo explicita | PXSol cross-channel | Pregunta clave |
| 73 | Datos personales solicitados | Widget permite nombre/email/telefono | Nombre/telefono | Web guestId; datos en flujos | PARCIAL | PII policy | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; CANONICO_BEGAIA | PXSol solicita antes; BegaIA no necesariamente | Politica por hotel | Privacy framing |
| 74 | Transparencia sobre datos | DESCONOCIDO bot | Respuesta incompleta | No claim completo | PARCIAL | Mejor transparencia requerida | OBSERVADO_SUNSET_BEACH; DESCONOCIDO | Dolor observado | Politica BegaIA completa | Oportunidad, no claim fuerte |
| 75 | Retencion de datos | DESCONOCIDO | Respuesta incompleta | Persistencia messages/guests | IMPLEMENTADO tecnico | Politica a definir | CANONICO_BEGAIA; OBSERVADO_SUNSET_BEACH | BegaIA sabe que persiste internamente | Retencion formal | No prometer compliance |
| 76 | Seguridad | Ecosistema/API auth | DESCONOCIDO | App auth/admin; no audit completa | PARCIAL | Hardening | OFICIAL_PXSOL; CANONICO_BEGAIA | No comparable | Certificaciones | Evitar claims |
| 77 | Roles y permisos | Docs usuarios/permiso | DESCONOCIDO | Admin roles existentes | PARCIAL | Mas control | OFICIAL_PXSOL; CANONICO_BEGAIA | Ambos publican o documentan roles en algun nivel | Matriz roles | No central |
| 78 | Control operacional | Suite + Conversaciones | Humano toma hilo | Admin modes/guards | DEMOSTRADO | Operacion gobernada | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | BegaIA lo formula como contrato | PXSol policies | Claim central prudente |
| 79 | Automatizacion comercial | IA + motor/CRM | Disponibilidad/tarifas/link | Reserva demo | DEMOSTRADO | Integracion real | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Solapamiento alto | Conversion real | No prometer uplift |
| 80 | Seguimiento de consultas | Consultas/CRM/Conversaciones | Hilo visible | Conversations/Admin | DEMOSTRADO | Mejor seguimiento | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Solapamiento | Estados workflow | Diagnostico |
| 81 | Madurez comercial | Productos/precios/clientes publicados | Uso real hotel | Demo validada | DEMOSTRADO | Pilotos | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | PXSol tiene evidencia publica de mercado; BegaIA demo controlada | Metricas BegaIA | Enfoque piloto |
| 82 | Base instalada | Base instalada declarada en paginas publicas | Sunset como caso observado | No base publica | NO_DISPONIBLE | DESCONOCIDO | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH | PXSol publica base instalada | Metrica BegaIA | No competir por escala |
| 83 | Evidencia de uso real | Clientes publicados | Sunset observado | Dry run interno | DEMOSTRADO | Pilotos prospectos | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | PXSol uso externo observado; BegaIA demo interna | Pilotos reales | Transparencia |
| 84 | Facilidad de implantacion | Widget codigo, trial publicado | Ya instalado | Setup demo/controlado | PARCIAL | Onboarding | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | PXSol documenta instalacion widget | Tiempo BegaIA | No prometer sin medicion |
| 85 | Dependencia del proveedor | Suite integrada | Ecosistema web/reserva | BegaIA capa propia | PARCIAL | Integracion complementaria | INFERENCIA_TECNICA | PXSol concentra modulos; BegaIA podria complementar | Contrato hotel | Pregunta comercial |
| 86 | Costo de cambio | Suite integrada implica friccion | DESCONOCIDO | Piloto acotado | NO_APLICA | Complementario | INFERENCIA_TECNICA | Reemplazo PXSol puede tener friccion | Contratos | Vender complemento |
| 87 | Interoperabilidad | API publica | link/reserva | APIs internas | PARCIAL | Integraciones | OFICIAL_PXSOL; CANONICO_BEGAIA | PXSol publica API | API externa BegaIA | Prudencia |
| 88 | Modelo de piloto | Trial/prueba publicada | DESCONOCIDO | Piloto controlado | DEMOSTRADO | Piloto por hotel | OFICIAL_PXSOL; CANONICO_BEGAIA | Ambos pueden pilotear distinto | Condiciones comerciales | Proponer bajo riesgo |
| 89 | Capacidad de adaptacion | IA aprende de respuestas/manual y datos PXSol | Correcciones aceptadas | Runtime configurable/KB | DEMOSTRADO | Mas KB/governance | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; DEMOSTRADO_BEGAIA | Ambos adaptan | Mecanismo PXSol exacto | No claim "mas adaptable" |
| 90 | Diferenciador verificable | Ecosistema integrado | Bot operativo real | Gobernanza conversacional | DEMOSTRADO | Operacion gobernada | OFICIAL_PXSOL; OBSERVADO_SUNSET_BEACH; CANONICO_BEGAIA; DEMOSTRADO_BEGAIA | Diferenciadores distintos, no superioridad general | Exclusividad | Posicionamiento por necesidad |
| 91 | Limitacion verificable | Algunas guias canal IA limitan WhatsApp en esa version | Bot/humano poco claro; privacy incompleta | No PMS/CRM; demo controlada | PARCIAL | Roadmap prudente | OBSERVADO_SUNSET_BEACH; CANONICO_BEGAIA; OFICIAL_PXSOL | Limitaciones distintas | Vigencia guias PXSol | Honestidad comercial |
| 92 | Incognitas pendientes | Modelo interno bot/identity/guards | Apollo/Mithras/nombre bot | Produccion/escala/pricing | PARCIAL | Varios destinos | DESCONOCIDO | Hay incognitas en ambos | Muchas | Discovery antes de claim |

## 11. Lo que PXSol ya resuelve

General de plataforma:

- suite publicada con PMS, motor de reservas, CRM, Channel Manager, pagos, API, App Conversaciones y Asistente Virtual IA;
- canales publicados para Conversaciones, incluyendo sitio web, WhatsApp, Instagram, Google y Facebook Messenger;
- respuestas IA con conversacion, KB y disponibilidad del motor;
- asociacion de chats con contactos, consultas y reservas;
- ReservaDirecto documentado como producto/flujo con marca blanca.

Observado en Sunset Beach:

- disponibilidad;
- tarifas;
- politicas;
- categorias;
- correcciones;
- contexto;
- enlaces contextualizados;
- derivacion humana dentro del mismo hilo;
- contexto visible para recepcion.

## 12. Solapamiento real

| Area | Nivel | Criterio |
| --- | --- | --- |
| Chat web | alto | Ambos lo tienen demostrado/publicado |
| Disponibilidad/tarifas | alto | PXSol publicado/observado; BegaIA demostrado |
| KB/FAQ/servicios/politicas | alto | Ambos cubren este frente |
| Derivacion humana | alto | Sunset observado; BegaIA demo |
| WhatsApp | medio | PXSol publicado; BegaIA demo controlada |
| Email | medio | PXSol CRM/Inbox; BegaIA transicional/demo |
| Identidad multicanal | medio | BegaIA demostrado/documentado; PXSol perfil/historial publicado, equivalencia interna desconocida |
| Guards/acciones sensibles | desconocido | BegaIA documentado; PXSol no comparable publicamente |
| PMS/CRM/Channel Manager | bajo para BegaIA | PXSol publica suite; BegaIA no se posiciona como eso |

## 13. Diferenciadores documentados de BegaIA

| Diferenciador | Evidencia canonica | Evidencia demostrada | Estado actual | Exclusivo o no comprobado en PXSol | Valor comercial |
| --- | --- | --- | --- | --- | --- |
| Identidad canonica `guestId` + aliases | `guest_identity_model.md` | Demo Martin multicanal | IMPLEMENTADO/DEMOSTRADO | No comprobado publicamente en PXSol | Ordenar continuidad |
| Merge manual de guests | `guest_identity_model.md` | Admin Guests demo | IMPLEMENTADO | No comprobado publicamente equivalente | Control humano de identidad |
| Confirmacion explicita | `message_pipeline.md`, capability map | Reserva/modify demo | DEMOSTRADO | No comprobado publicamente equivalente | Seguridad operativa |
| Guards deterministas | `message_pipeline.md`, roadmap | Parcialmente visibles por comportamiento | IMPLEMENTADO | No comprobado publicamente equivalente | Evitar acciones ambiguas |
| Supervised mode | `architecture_concierge.md`, docs product | Admin Channels demo | DEMOSTRADO | PXSol tiene edicion IA; equivalencia no determinada | Control humano |
| Runtime gobernado por estado | `message_pipeline.md` | Demo continuidad | IMPLEMENTADO | No comprobado publicamente equivalente | Diferenciador tecnico |
| Limites explicitos de alcance | docs product | Speech demo | DEMOSTRADO como limite | PXSol publica suite | Credibilidad |

## 14. Diferenciadores abstractos

| Capacidad | Por que es abstracta | Como hacerla visible |
| --- | --- | --- |
| Guards | El gerente no ve codigo ni routing | Mostrar intento ambiguo bloqueado con explicacion |
| Target de reserva | `selected target` es interno | Demo con tres reservas y "cambia la primera" |
| Estado conversacional | `conv_state` no es visible | Panel timeline con foco actual y ultima accion |
| Confirmacion | Visible solo si se fuerza accion sensible | Mostrar before/after con preview |
| Trazabilidad | Hoy queda mas tecnica que comercial | Admin "por que respondio/que accion registro" |
| Identidad canonica | `guestId` no es lenguaje comercial | Mostrar Web/Email/WhatsApp como un huesped |
| Supervision | Ya visible, pero puede densificarse | Mantener escena breve con editar/enviar |

## 15. Ventajas verificables de PXSol

| Area | Evidencia |
| --- | --- |
| Amplitud de suite | PMS, motor, CRM, Channel Manager, pagos y web publicados |
| Integraciones | API publica y ecosistema propio |
| Producto comercial | Precios/planes publicos |
| Base instalada | Paginas publicas declaran base instalada |
| Documentacion | Ayuda publica amplia |
| APIs | `developers.pxsol.com` |
| Operacion real observada | Sunset Beach mostro bot + reserva directa + humano |

## 16. Riesgos competitivos

| Tipo | Riesgo |
| --- | --- |
| Producto | BegaIA percibido como duplicacion si el hotel ya usa Conversaciones |
| Integracion | PXSol ya conecta con PMS/motor/CRM propios |
| Posicionamiento | "IA para hoteles" es generico y no diferencia |
| Comercial | Hoteles con PXSol pueden no querer sumar proveedor |
| Confianza | PXSol tiene presencia publica y clientes |
| Onboarding | BegaIA requiere piloto/control de alcance |
| Costos | Reemplazo frontal puede tener friccion contractual |
| Madurez | BegaIA debe probarse en clientes reales, no solo demo |

## 17. Oportunidades para BegaIA

| Segmento | Oportunidad |
| --- | --- |
| Hoteles sin bot | Concierge Digital gobernado como primer paso |
| Hoteles con bot basico | Mejorar supervision, trazabilidad, acciones sensibles |
| Hoteles con PXSol | Capa complementaria para procesos no gobernados o auditoria conversacional |
| Hoteles con multiples sistemas | Unificar experiencia conversacional sin reemplazar todo |
| Procesos sensibles no gobernados | Confirmacion, target, identidad, derivacion y auditoria |

## 18. Impacto COM-03

No se encontraron documentos llamados literalmente `COM-03`. Por contenido e historial, COM-03 se interpreta como el paquete comercial/documental existente en `docs/product`.

| Documento COM-03 | Seccion afectada | Riesgo | Cambio recomendado | Prioridad |
| --- | --- | --- | --- | --- |
| `presentation_narrative_base.md` | Wording comercial | Decir "IA/chat" como diferencial | Enfatizar gobernanza conversacional | Alta |
| `presentation_capability_map.md` | Claims seguros | Sobreprometer multicanal/productivo | Agregar columna "frente a suites existentes" | Alta |
| `presentation_use_cases_demo_selection.md` | Casos de uso | Mostrar disponibilidad como diferencial | Reencuadrar disponibilidad como parte del flujo gobernado | Media |
| `demo_script_core_first_admin_supervision_refresh.md` | Speech | No distinguir competidores tipo suite | Agregar fallback speech para hoteles con bot | Alta |
| `presentation_multichannel_parity_validation.md` | Multicanalidad | Parecer paridad productiva | Mantener demo controlada | Media |
| `whatsapp_number_onboarding_strategy.md` | WhatsApp | Prometer migracion inmediata | Conservar prudencia | Media |

## 19. Impacto COM-04

No se encontraron documentos llamados literalmente `COM-04`. Se interpreta como preparacion de primer contacto/prospecting.

| Tipo de prospecto | Hipotesis inicial | Objetivo del contacto | Mensaje recomendado | Preguntas de diagnostico | Que no prometer |
| --- | --- | --- | --- | --- | --- |
| Con PXSol confirmado | Ya tiene suite y bot parcial/total | Descubrir huecos de gobierno | "No buscamos reemplazar lo que ya funciona; queremos entender donde necesitan mas control." | Canales, trazabilidad, aprobacion, identidad | Reemplazo facil |
| Bot visible no identificado | Tiene atencion digital, capacidades inciertas | Mapear operacion real | "Queremos entender que resuelve hoy el bot y donde interviene recepcion." | Contexto humano, acciones, datos | Superioridad |
| Sin bot visible | Dolor de atencion repetitiva | Presentar demo core | "Concierge Digital con piloto controlado." | Volumen consultas, canales, reservas | Produccion masiva |
| Sin investigacion suficiente | No asumir stack | Discovery basico | "Antes de proponer, relevamos canales y proceso actual." | Herramientas, PMS, CRM, WhatsApp | Diagnostico cerrado |

## 20. Preguntas de diagnostico

1. Que canales atienden hoy desde una bandeja centralizada?
2. Que canales tienen IA automatica activa y cuales quedan manuales?
3. Cuando el bot deriva, que contexto ve recepcion?
4. Pueden distinguir en el historial que respondio el bot y que respondio una persona?
5. Que acciones puede ejecutar el bot sin aprobacion humana?
6. Como manejan cambios de fechas, huespedes o habitacion antes de confirmar?
7. El mismo huesped queda unificado entre Web, WhatsApp y Email?
8. Donde consultan disponibilidad y tarifas durante una conversacion?
9. Que ocurre si el huesped pide modificar o cancelar una reserva existente?
10. Que trazabilidad queda de decisiones, propuestas y acciones?
11. Que datos personales solicita el bot y como se informan al huesped?
12. Que parte del flujo actual todavia requiere copiar/pegar o revision manual?

## 21. Claims revisados

| Claim | Clasificacion | Evidencia | Riesgo | Redaccion recomendada |
| --- | --- | --- | --- | --- |
| BegaIA es Concierge Digital hotelero | SEGURO | CANONICO_BEGAIA; DEMOSTRADO_BEGAIA | Bajo | "BegaIA actua como Concierge Digital para hoteleria en demo controlada." |
| BegaIA tiene IA | PROHIBIDO como diferencial | Generico | No diferencia | Evitar |
| BegaIA responde disponibilidad | REQUIERE_DEMO | DEMOSTRADO_BEGAIA | PXSol tambien | "Distingue disponibilidad exploratoria de reserva." |
| BegaIA gobierna acciones sensibles | SEGURO | CANONICO_BEGAIA; DEMOSTRADO_BEGAIA | Explicar sin tecnicismo | "Antes de ejecutar, pide confirmacion explicita." |
| Superioridad general de BegaIA frente a PXSol | PROHIBIDO | Sin evidencia | Sesgo | No usar |
| Reduccion de PXSol a chatbot simple | PROHIBIDO | OFICIAL_PXSOL contradice | Falso/injusto | No usar |
| PXSol resuelve disponibilidad en Sunset | SEGURO | OBSERVADO_SUNSET_BEACH | No generalizar a todo PXSol | "En Sunset Beach se observo disponibilidad y tarifas funcionando." |
| BegaIA complementa hoteles con suite existente | PRUDENTE | INFERENCIA_TECNICA | Requiere discovery | "Puede evaluarse como capa complementaria si hay dolores de gobierno." |
| BegaIA reemplaza PMS/CRM/Channel Manager | PROHIBIDO | CANONICO_BEGAIA | Falso alcance | No usar |
| Identidad canonica BegaIA | SEGURO | CANONICO_BEGAIA; DEMOSTRADO_BEGAIA | Puede sonar tecnico | "Ayuda a ordenar una identidad operativa entre canales." |
| WhatsApp productivo universal | PROHIBIDO | Docs prudentes | Sobrepromesa | "WhatsApp esta validado en demo controlada; onboarding requiere evaluacion." |
| Email productivo completo | PROHIBIDO | ADR email | Sobrepromesa | "Email esta demostrado en recorrido controlado; arquitectura productiva destino esta documentada." |

## 22. Recomendaciones de demo

| Demo | Problema que demuestra | Evidencia visible | Diferencia frente a un bot convencional | Estado actual | Trabajo faltante |
| --- | --- | --- | --- | --- | --- |
| Identidad canonica | Mismo huesped por canales | Admin Guest con aliases/reservas | No solo hilos sueltos | DEMOSTRADO | Mejor explicacion visual |
| Continuidad multicanal | Web/Email/WA consolidados | Snapshot reservas | Contexto operativo comun | DEMOSTRADO | Reducir complejidad |
| Correccion slots | Cambios sin perder draft | Fechas/huespedes recalculan | Estado gobernado | DEMOSTRADO | Escena breve |
| Confirmacion explicita | Evitar accion accidental | Preview + Confirmar | Accion sensible controlada | DEMOSTRADO | Mantener |
| Bloqueo por guard | Ambiguedad/rango invalido | Respuesta pide aclaracion | No ejecuta sin claridad | IMPLEMENTADO | Hacer escena comercial |
| Seleccion target | Varias reservas | "primera reserva" resuelta | Reference resolution | DEMOSTRADO | Mostrar Admin/timeline |
| Supervision | Control humano | Editar/enviar | Humano en loop | DEMOSTRADO | Mas claridad bot/humano |
| Trazabilidad accion | Saber que paso | Mensajes/reserva/Admin | Operacion auditable | PARCIAL | Panel mas legible |
| Transicion bot/humano | Evitar confusion | Modo supervisado | Control explicito | PARCIAL | Mejor etiqueta guest-facing |

## 23. Incognitas

- Nombre contractual exacto del bot de Sunset Beach.
- Semantica exacta de `px_apollo`.
- Titularidad y rol exacto de `link.mithras.cloud`.
- Canales PXSol efectivamente activos en Sunset Beach fuera del widget web observado.
- Modelo interno de identidad cross-channel de PXSol.
- Politicas PXSol equivalentes o no equivalentes a guards deterministas.
- Nivel de auditoria bot/humano disponible para el hotel.
- Politica real de retencion y transparencia de datos personales en el bot observado.
- Pricing, condiciones y modelo comercial futuro de BegaIA.
- Evidencia productiva externa de BegaIA fuera de demo controlada.

## 24. Recomendaciones

- Usar este documento como referencia estrategica interna, no como material de venta directo.
- No actualizar claims existentes sin hito COM separado.
- En prospectos con PXSol, iniciar con discovery y enfoque complementario.
- En prospectos sin bot, sostener la demo core de BegaIA como Concierge Digital gobernado.
- En prospectos con bot no identificado, evitar asumir proveedor o limitaciones.
- Convertir diferenciadores abstractos de BegaIA en escenas visibles de demo antes de usarlos comercialmente.
- Mantener el mensaje central: conversaciones naturales, operaciones gobernadas.

## 25. Documentos potencialmente afectados

No se modifican en este hito. Pueden requerir revision posterior:

- `docs/product/presentation_narrative_base.md`;
- `docs/product/presentation_capability_map.md`;
- `docs/product/presentation_use_cases_demo_selection.md`;
- `docs/product/demo_script_core_first_admin_supervision_refresh.md`;
- `docs/product/presentation_multichannel_parity_validation.md`;
- `docs/product/whatsapp_number_onboarding_strategy.md`.

Tambien puede considerarse indexacion futura en `docs/README.md` o `README.md`, pero este hito no autoriza modificar indices.

## 26. Historial de revision

| Fecha | Version | Cambio | Autor operativo |
| --- | --- | --- | --- |
| 2026-08-04 | V2 | Materializacion inicial como referencia estrategica no normativa | arquitecto_sistema |
