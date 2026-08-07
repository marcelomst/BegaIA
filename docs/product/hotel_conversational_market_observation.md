<!-- Path: docs/product/hotel_conversational_market_observation.md -->

# Observacion del mercado conversacional hotelero en Maldonado

```yaml
STATUS: REFERENCE
CLASSIFICATION: MARKET_OBSERVATION_REFERENCE_NON_NORMATIVE
TIME_SENSITIVE: true
SOURCE_CUTOFF: 2026-08-07
```

## 1. Proposito

Este documento consolida patrones y consecuencias estrategicas surgidas de una observacion manual de bots y widgets hoteleros visibles en una muestra de establecimientos del departamento de Maldonado.

El objetivo es convertir evidencia de campo en conocimiento util para BegaIA sin transformar la observacion en base de prospectos, ranking comercial o afirmacion de superioridad frente a competidores.

## 2. Alcance y no-alcance

Este documento conserva:

- patrones observados;
- hallazgos relevantes;
- limites de evidencia;
- implicaciones para producto;
- implicaciones para posicionamiento;
- preguntas abiertas;
- consecuencias futuras para demos y discovery.

Este documento no es:

- una base de prospectos;
- una lista comercial;
- una reproduccion integra de la Google Sheet;
- una reproduccion de dialogos completos;
- una matriz de superioridad BegaIA vs competidores;
- una afirmacion de que un proveedor carece de capacidades no observadas.

Canonically:

- NO redefine arquitectura;
- NO redefine runtime;
- NO sustituye README;
- NO sustituye ADRs;
- NO sustituye `pxsol_begaia_competitive_analysis.md`;
- NO constituye fuente comercial operativa;
- NO determina prioridad de prospectos.

## 3. Fuentes y metodologia

Fuente granular:

- Google Sheet: `BegaIA - Revision visual de bots y widgets hoteleros`
- Pestana: `01_Inspeccion_visual`
- Export temporal usado: `.tmp/begaia_inspeccion_visual_bots.csv`

Fuentes de repositorio revisadas:

- `README.md`
- `docs/product/pxsol_begaia_competitive_analysis.md`
- `docs/product/presentation_narrative_base.md`
- `docs/product/presentation_capability_map.md`
- `docs/product/presentation_use_cases_demo_selection.md`
- `docs/product/architecture_concierge.md`
- `docs/architecture/message_pipeline.md`
- `docs/architecture/ADR-PIPELINE-RUNTIME-TARGET.md`
- `docs/architecture/system_operating_model.md`
- `docs/architecture/roadmap.md`

Metodologia resumida:

- observacion manual mediante navegador;
- identificacion visual de bot/widget;
- registro de ubicacion, branding y proveedor cuando fue identificable;
- verificacion de si el bot podia abrirse sin datos previos;
- interaccion controlada cuando correspondio;
- captura visual cuando correspondio;
- registro parcial de dialogo en algunos casos;
- no busqueda deliberada de interaccion humana;
- detencion de prueba cuando aparecia o podia aparecer handoff;
- observacion time-sensitive.

Regla de interpretacion:

`BOT_NO_VISIBLE` no significa `NO_EXISTE_AUTOMATIZACION`.

No se infiere WhatsApp, OTA, CRM, PMS o backend a partir de ausencia visual en web.

## 4. Muestra observada

La observacion cubrio 18 establecimientos:

1. Hotel Sunset Beach
2. Ajax Hotel
3. Barradas Parque Hotel & Spa
4. Live Hotel Boutique
5. Solanas Punta del Este
6. Petit Chateau
7. Dunas del Este
8. Anastasio Hotel
9. Complejo Cabanas Piriapolis
10. Casa Mara
11. Hotel Florinda
12. AWA Hotel
13. The Grand Hotel
14. Tio Tom
15. Club Hotel Casapueblo
16. Hotel El Refugio
17. Hotel Las Cumbres
18. Hotel del Lago

Esta lista no es un ranking, no representa prioridad comercial y no implica recomendacion de contacto.

## 5. Separacion conceptual obligatoria

```text
INTERES_TECNOLOGICO
!=
INTERES_COMPETITIVO
!=
INTERES_COMERCIAL
```

La inclusion de un hotel en la muestra:

- no implica prioridad comercial;
- no implica recomendacion de contacto;
- no implica adecuacion para piloto;
- no implica que carezca de tecnologia no visible.

Ejemplo: The Grand Hotel es relevante como referencia tecnologica y competitiva por el bot observado, pero esta observacion no lo convierte automaticamente en prospecto prioritario.

## 6. Sintesis cuantitativa

Metricas estructuradas desde columnas del CSV:

| Metrica | Resultado | Fuente |
| --- | ---: | --- |
| Total hoteles | 18 | CSV |
| Bot/widget visible | 7 | `Bot_o_widget_visible=SI` |
| Bot/widget no visible | 11 | `Bot_o_widget_visible=NO` |
| Bot no verificable | 0 | no hubo valores fuera de SI/NO |
| PXSol identificado como proveedor conversacional | 4 | columna `Proveedor_identificado` |
| ASKSUITE_ESTRUCTURADO | 1 | Hotel del Lago |
| ASKSUITE_OBSERVADO_TOTAL | 2 | Hotel del Lago + The Grand Hotel por texto libre |
| MF Consulting observado | 1 | Solanas Punta del Este, spelling CSV: `MF Consuling` |
| Puede abrir sin datos | 5 | columna `Se_puede_abrir_sin_datos=SI` |
| No puede abrir sin datos | 2 | columna `Se_puede_abrir_sin_datos=NO` |

Control PURAMARCA:

```yaml
PROVEEDOR_CONVERSACIONAL_CONFIRMADO: NO
PROVEEDOR_OTRA_CAPA: PURAMARCA
caso: Anastasio Hotel
motivo: no tuvo bot visible en la observacion
```

Metricas derivadas del texto de dialogos:

Estas senales son utiles, pero no deben tratarse con la misma fuerza que las columnas estructuradas.

```yaml
DERIVED_FROM_DIALOGUE_TEXT:
  disponibilidad: observada en al menos 5 hoteles
  tarifas: observadas en al menos 3 hoteles
  imagenes: observadas o referidas en al menos 4 hoteles
  correccion_contextual: observada en al menos 4 hoteles
  links_de_reserva: observados en al menos 3 hoteles
  handoff: requiere lectura caso a caso
  intervencion_humana: confirmada claramente en al menos Sunset Beach
```

## 7. Mapa de proveedores

| Proveedor | Casos observados | Capacidades observadas | Limites | Confianza |
| --- | --- | --- | --- | --- |
| PXSol | Sunset Beach, Ajax, Barradas, Dunas | disponibilidad, tarifas, politicas, links, FAQ/check-in, contexto en algunos casos | no atribuir todo a PXSol general; capacidades varian por hotel | alta para presencia, media para capacidades generales |
| Asksuite | Hotel del Lago; The Grand Hotel por texto libre | amenities, habitaciones, imagenes, flujo/formulario, solicitud de fechas/huespedes | The Grand no esta estructurado en la columna proveedor | media |
| MF Consulting | Solanas | bot "Sol", tipos de alojamiento, contenido general, derivacion a web para imagenes | spelling en CSV requiere normalizacion; no inferir arquitectura completa | media-baja |
| NO_IDENTIFICADO | Petit Chateau, Complejo Cabanas Piriapolis, Casa Mara, Hotel Florinda, Club Hotel Casapueblo | sin capacidades conversacionales confirmadas desde la muestra | no implica ausencia de automatizacion interna | baja |
| OTRA_CAPA_NO_CONVERSACIONAL | Anastasio / PURAMARCA | proveedor de otra capa observado | no hubo bot visible; no contar como proveedor conversacional confirmado | baja |

## 8. Patrones de capacidades observadas

En la muestra observada aparecen competidores reales que ya cubren varias capacidades visibles para un gerente hotelero:

- lenguaje natural basico;
- FAQ y horarios;
- amenities y servicios;
- tipos de habitaciones;
- imagenes o referencia a imagenes;
- disponibilidad;
- tarifas;
- politicas;
- links o flujo de reserva;
- formularios o selectores de fechas;
- recomendaciones simples;
- derivacion o posible handoff.

Conclusion prudente:

Estas capacidades no estan presentes en todos los proveedores ni en todos los hoteles, pero existen suficientes casos observados como para reducir su valor diferencial aislado para BegaIA.

## 9. Casos de referencia

### Hotel Sunset Beach

Caso observado:

- bot visible PXSol;
- disponibilidad;
- categorias;
- tarifas;
- desayuno;
- cancelacion;
- servicios;
- correccion de huespedes;
- correccion de fechas;
- continuidad contextual;
- referencias;
- recomendacion;
- links `link.mithras.cloud`;
- el bot no confirmo directamente la reserva;
- handoff humano;
- intervencion posterior de recepcion;
- transicion bot/humano observada como ambigua.

No afirmar:

- que Apollo sea el nombre del bot;
- que Mithras sea proveedor contractual;
- PXSol = proveedor de todas las capas.

### Ajax Hotel

Caso observado:

- bot visible PXSol;
- solicitud previa de nombre/email;
- respuestas basicas;
- posterior aparente detencion.

Uso analitico:

- evidencia de `FRICCION_PRECONVERSACIONAL` en el caso observado;
- no generalizar esa friccion a PXSol.

### Barradas Parque Hotel & Spa

Caso observado:

- PXSol visible;
- disponibilidad;
- habitaciones;
- tarifas;
- politicas;
- desayuno;
- cancelacion;
- tratamiento de IVA;
- links de reserva.

Uso analitico:

- evidencia de que disponibilidad, tarifas, politicas y links no deben presentarse como exclusivas de BegaIA.

### Dunas del Este

Caso observado:

- bot PXSol;
- respuesta de check-in;
- posterior aparente suspension o derivacion.

No afirmar handoff confirmado.

### Solanas Punta del Este

Caso observado:

- bot "Sol";
- proveedor registrado como `MF Consuling`;
- tipos de alojamiento;
- contenido general;
- referencia hacia web para imagenes.

Uso analitico:

- evidencia prudente de que el proveedor conversacional puede diferir de otras capas tecnologicas del hotel;
- no afirmar arquitectura completa de stack mixto sin verificar todas las capas.

### The Grand Hotel

Caso observado:

- bot visible;
- Asksuite identificado mediante evidencia textual;
- amenities;
- spa;
- servicios;
- solicitud de fechas/huespedes;
- limitacion observada para recuperar ciertos materiales de habitaciones/imagenes.

Clasificacion:

```yaml
INTERES_TECNOLOGICO: alto
INTERES_COMPETITIVO: alto
INTERES_COMERCIAL: no inferido por este documento
```

### Hotel del Lago

Caso observado:

- bot visible;
- Asksuite estructurado;
- flujo/formulario de fechas;
- estacionamiento;
- habitaciones;
- imagenes inline;
- atributos estructurados.

Uso analitico:

- evidencia de que "bot hotelero con contenido util y visual" no constituye diferencial suficiente para BegaIA.

## 10. Fricciones observadas

Fricciones registradas en casos concretos:

- solicitud de datos antes de conversar;
- aparente detencion del dialogo;
- handoff poco claro;
- identidad bot/humano ambigua;
- limitacion para recuperar ciertos materiales visuales;
- derivacion hacia web para imagenes;
- cambio de conversacion libre a formulario/selector;
- necesidad de revisar caso a caso para confirmar intervencion humana.

Regla:

Usar "en el caso observado" y no "el proveedor siempre".

## 11. Composicion por capas del stack hotelero

La observacion refuerza que no debe inferirse el proveedor conversacional a partir del proveedor del motor de reservas, del sitio web o de otra capa publica.

Clasificaciones recomendadas:

- `STACK_MIXTO_CONFIRMADO`: usar solo cuando exista evidencia suficiente de al menos dos capas y proveedores distintos.
- `STACK_POTENCIALMENTE_COMPOSABLE`: usar cuando haya senales de multiples capas, pero sin confirmacion suficiente.
- `CAPAS_NO_DEDUCIBLES_ENTRE_SI`: usar como regla general de prudencia.

Conclusion permitida:

La composicion tecnologica hotelera puede ser por capas.

Conclusion no permitida:

Todos estos hoteles utilizan stacks mixtos.

## 12. Capacidades comoditizadas

La muestra reduce el valor diferencial aislado de:

- IA/chat;
- lenguaje natural basico;
- FAQ;
- amenities;
- horarios;
- habitaciones;
- imagenes;
- disponibilidad;
- tarifas;
- politicas;
- links de reserva;
- formularios de reserva;
- recomendaciones basicas;
- handoff generico.

Conclusion:

Existen competidores reales observados que ya cubren varias de estas capacidades. BegaIA no debe sostener su diferenciacion principal sobre ellas.

## 13. Implicaciones para BegaIA

La tesis central se mantiene:

> Conversaciones naturales. Operaciones gobernadas.

La evidencia desplaza la diferenciacion desde:

```text
bot que responde
```

hacia:

```text
sistema que gobierna decisiones conversacionales sensibles
```

BegaIA debe mostrar no solo que entiende, sino que decide prudentemente cuando ejecutar, cuando pedir confirmacion, cuando bloquear, cuando supervisar y como conservar continuidad operativa.

## 14. Diferenciadores defendibles

### VERIFICABLE_Y_DEMOSTRABLE

- identidad canonica multicanal;
- confirmacion explicita antes de acciones sensibles;
- target explicito de reserva;
- guards de ejecucion;
- separacion entre conversacion natural y ejecucion responsable;
- supervision humana controlada.

### DOCUMENTADO_PERO_ABSTRACTO

- estado gobernado;
- trazabilidad;
- aliases;
- consolidacion de identidad;
- lifecycle de target;
- persistencia operacional.

### NO_EXCLUSIVO

- chat;
- IA;
- FAQ;
- habitaciones;
- imagenes;
- disponibilidad;
- tarifas;
- links;
- handoff basico.

### NO_COMPROBADO_FRENTE_A_COMPETENCIA

No existe evidencia suficiente para comparar internamente PXSol o Asksuite en:

- canonical identity;
- guards;
- state governance;
- traceability;
- target selection;
- confirmation architecture;
- internal execution control.

No afirmar que carecen de estas capacidades.

## 15. Diferenciadores que requieren visibilidad

Los diferenciales mas relevantes para BegaIA son dificiles de comprender si quedan solo como arquitectura interna.

Deben hacerse visibles:

- identidad canonica;
- aliases y consolidacion multicanal;
- target explicito;
- confirmacion responsable;
- bloqueo por guard;
- estado conversacional;
- trazabilidad de accion;
- transicion bot/humano clara;
- continuidad post-handoff.

## 16. Implicaciones para demos

Prioridad alta:

1. identidad canonica multicanal;
2. Web -> WhatsApp;
3. target explicito;
4. "si" sin propuesta no confirma;
5. accion sensible con confirmacion;
6. transicion bot-humano clara.

Prioridad media:

7. correccion contextual;
8. supervision humana;
9. trazabilidad;
10. continuidad post-handoff.

Una demo dedicada principalmente a FAQ, amenities, disponibilidad o imagenes ya no demuestra adecuadamente la diferencia de BegaIA.

Ejemplo conceptual:

```text
El huesped dice "si"
-> existe propuesta valida?
-> hay target inequivoco?
-> los datos son suficientes?
-> la accion requiere confirmacion?
-> solo entonces se ejecuta
```

Este ejemplo ilustra la gobernanza conceptual. No es una especificacion exhaustiva del runtime.

## 17. Segmentacion tecnologica

Segmentacion orientativa:

| Segmento | Necesidad probable | Oportunidad BegaIA | Riesgo | Demo relevante |
| --- | --- | --- | --- | --- |
| SIN_BOT_VISIBLE | atencion repetitiva o dispersa | piloto concierge | no hay dolor real | demo core |
| BOT_BASICO_O_LIMITADO | continuidad/control | gobernanza y UX | competir solo por chatbot | handoff + confirmacion |
| BOT_PXSOL_SOFISTICADO | huecos de gobierno | complemento puntual | duplicacion | identidad + target |
| BOT_ESPECIALIZADO_OTRO_PROVEEDOR | ejecucion responsable | diferenciar por operacion | basicos ya cubiertos | guards + trazabilidad |
| STACK_MIXTO_CONFIRMADO | fragmentacion | unificacion conversacional | integracion compleja | multicanal |
| STACK_POTENCIALMENTE_COMPOSABLE | discovery por capas | diagnostico tecnico-comercial | inferencia prematura | mapa de stack |
| NO_VERIFICABLE | falta evidencia | investigacion previa | mala priorizacion | ninguna |

La segmentacion tecnologica no determina prioridad comercial.

## 18. Consecuencias futuras para COM-03

Recomendaciones futuras, sin modificar COM-03 en este hito:

- reforzar "operaciones gobernadas";
- bajar peso de "IA/chat";
- tratar rich rooms como UX, no diferencial competitivo principal;
- hacer visibles identidad, target y confirmacion;
- reordenar demos hacia gobernanza;
- evitar reducir competidores a bots simples.

Documentos potencialmente impactados:

- `docs/product/presentation_narrative_base.md`;
- `docs/product/presentation_capability_map.md`;
- `docs/product/presentation_use_cases_demo_selection.md`.

## 19. Consecuencias futuras para COM-04

Discovery deberia identificar:

- PMS;
- motor de reservas;
- proveedor web;
- bot;
- CRM;
- WhatsApp;
- modalidad de handoff;
- dolor real.

Preguntas guia:

- Que canales conversacionales usan hoy?
- Que proveedor opera el bot visible?
- Que proveedor opera el motor de reservas?
- Que ocurre cuando hay una accion sensible?
- Se distingue bot de humano?
- Que trazabilidad queda?
- Que datos se solicitan antes de conversar?
- El mismo huesped se consolida entre canales?

Segmentacion tecnologica != prioridad comercial.

## 20. Relacion con analisis PXSol

`docs/product/pxsol_begaia_competitive_analysis.md` sigue siendo el analisis competitivo profundo PXSol vs BegaIA.

Este documento observa transversalmente el mercado conversacional encontrado en hoteles reales.

COM-03 y COM-04 podran consumir consecuencias posteriores, pero no forman parte de este hito.

Google Sheet / CSV conserva evidencia granular de observacion.

Recomendacion:

```yaml
PXSOL_DOCUMENT_V3: not_now
PXSOL_DOCUMENT_ACTION: cross_reference_only
```

Una futura V3 puede considerar dimensiones como:

- friccion preconversacional;
- claridad bot/humano;
- stack mixto;
- proveedor conversacional vs motor;
- apertura sin datos;
- formulario dentro del chat;
- handoff estructurado;
- intervencion humana confirmada;
- imagenes inline vs web;
- interes tecnologico/competitivo/comercial.

No modificar las 92 dimensiones en este hito.

## 21. Limitaciones

- muestra pequena;
- 18 hoteles;
- concentracion geografica;
- observacion puntual;
- interfaces pueden cambiar;
- resultados dependen de fecha;
- no auditoria interna;
- no acceso a configuraciones contractuales;
- no acceso a PMS/CRM/backend;
- ausencia visual no demuestra ausencia de automatizacion;
- capacidades internas de competidores desconocidas;
- dialogos no uniformes entre hoteles;
- algunas atribuciones de proveedor provienen de texto libre;
- metricas derivadas de dialogo no estan completamente estructuradas.

## 22. Unknown unknowns

- identidad interna en competidores;
- guards;
- trazabilidad;
- persistencia;
- arquitectura de handoff;
- reconciliacion multicanal;
- retencion de datos;
- relaciones contractuales entre proveedores;
- automatizacion por WhatsApp no observada;
- prioridad comercial real de los hoteles.

## 23. Politica de actualizacion

Actualizar este documento cuando ocurra alguno de estos eventos:

- nueva ronda manual significativa;
- cambio material en capacidades de proveedores;
- incorporacion de otro proveedor relevante;
- nueva evidencia multicanal;
- nueva evidencia de handoff;
- cambio material en posicionamiento BegaIA.

No actualizar por cada observacion menor.

## 24. Conclusion

La muestra confirma que el mercado conversacional hotelero local ya contiene proveedores capaces de resolver parte importante de la experiencia visible: FAQ, amenities, habitaciones, imagenes, disponibilidad, tarifas, politicas, links y formularios.

Para BegaIA, la consecuencia estrategica es clara: el valor diferencial debe hacerse visible en la gobernanza operacional, no en la mera existencia de un bot.

La frase que mejor resume la posicion defendible sigue siendo:

> Conversaciones naturales. Operaciones gobernadas.
