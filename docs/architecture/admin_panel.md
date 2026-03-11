# Admin Panel Architecture

## Evolución del Admin Panel (UI-ADMIN-01)

### Problema detectado

El panel administrativo había evolucionado orgánicamente durante el desarrollo
inicial del sistema, generando:

- duplicación de rutas
- menús inconsistentes
- vistas mock en el dashboard
- ausencia de un dominio explícito de huéspedes
- herramientas técnicas visibles en navegación principal

Esto producía una desalineación entre la arquitectura real del sistema y su
representación en la UI administrativa.

### Objetivo del rediseño

Reorganizar la navegación del panel según dominios funcionales del sistema
SaaS, manteniendo:

- cambios mínimos
- reutilización de componentes existentes
- compatibilidad con rutas actuales

Sin realizar aún refactor profundo de módulos.

### Dominios principales definidos

El Admin Panel pasa a estructurarse conceptualmente en los siguientes dominios:

`Dashboard`
`Inbox`
`Guests`
`Channels`
`Events`
`Knowledge`
`Hotels`
`Users`
`Tools`

Esta clasificación refleja la arquitectura interna del sistema:

- Guests como entidad central
- Channels como transporte intercambiable
- Knowledge como base semántica del asistente
- Hotels como capa SaaS multitenant

### Cambios realizados

#### 1. Normalización del menú principal

Se reorganizó el menú del panel administrativo para reflejar dominios claros.

Entradas principales resultantes:

`Dashboard`
`Inbox`
`Guests`
`Channels`
`Events`
`Knowledge`
`Hotels`
`Users`
`Tools`

#### 2. Aparición del dominio Guests

Se agregó explícitamente la ruta:

`/admin/guests`

Esto hace visible el modelo guest-centric del sistema.

Esta vista reutiliza actualmente componentes del inbox pero con semántica
centrada en huésped.

#### 3. Separación conceptual Inbox / Guests

Se introdujeron dos dominios distintos:

`Inbox  -> centro operativo de conversaciones`
`Guests -> centro conceptual de huéspedes`

Ambos reutilizan inicialmente el componente `ChannelInbox` con modos
diferentes:

`viewMode="inbox"`
`viewMode="guests"`

Esto permite diferenciar la semántica sin introducir aún refactor profundo.

#### 4. Eliminación del hardcode a WhatsApp

Las nuevas vistas administrativas dejaron de estar acopladas a un canal
específico.

Antes:

`channel="whatsapp"`

Ahora:

`channel="all"`

Esto refleja correctamente la naturaleza multicanal del sistema.

#### 5. Consolidación de Knowledge

La gestión de conocimiento queda organizada en torno a:

`/admin/kb/templates`

como interfaz principal de:

- generación de KB
- trazas de respuesta
- vectorización

Mientras que:

`/admin/upload`

queda como herramienta técnica secundaria.

#### 6. Consolidación de Users

Se estableció una ruta canónica para administración de usuarios:

`/admin/users/manage`

reduciendo rutas redundantes de verificación y gestión.

#### 7. Aislamiento de herramientas técnicas

Herramientas incompletas o de desarrollo quedan agrupadas en:

`Tools`

incluyendo:

`/admin/prompts`
`/admin/embeddings`
`/admin/logs`

evitando que aparezcan como módulos operativos del sistema.

## FIX-UI-ADMIN-01A

Tras el cambio inicial se detectó que:

`/admin/inbox`
`/admin/guests`

renderizaban exactamente la misma vista y estaban acopladas a WhatsApp.

El fix correctivo realizó:

- eliminación del hardcode `channel="whatsapp"`
- introducción del modo `viewMode`
- diferenciación mínima de dominios
- incorporación obligatoria del comentario de path en archivos nuevos

Ejemplo:

```ts
// Path: /root/begasist/app/admin/inbox/page.tsx
```

Esta convención forma parte de la disciplina del workspace.

### Resultado arquitectónico

Con estos cambios el Admin Panel queda alineado con el modelo conceptual de
Begasist:

`Guests -> entidad central`
`Channels -> transporte`
`Knowledge -> inteligencia del asistente`
`Inbox -> operación conversacional`

El rediseño actual es bootstrap estructural, que permite evolucionar
posteriormente hacia:

- CRM de huéspedes más completo
- inbox multicanal más sofisticado
- métricas operativas reales

sin contradicciones en la navegación.

## UI-GUESTS-01 — Dominio Guests funcional

Tras la normalización inicial del Admin Panel (`UI-ADMIN-01` y
`FIX-UI-ADMIN-01A`), el módulo `Guests` dejó de ser una vista placeholder
basada en el inbox y pasó a convertirse en un dominio funcional real del panel
administrativo.

### Capacidades incorporadas

La ruta:

`/admin/guests`

permite ahora:

- listar huéspedes reales persistidos en AstraDB
- visualizar aliases multicanal asociados
- identificar canales detectados por alias o conversación
- visualizar conversaciones asociadas
- ejecutar merge manual entre dos guests

### Cambio conceptual

El panel pasa a reflejar el modelo:

`Guest = entidad central`
`Channel = alias / transporte`
`Conversation = interacción`

Esto fortalece el enfoque guest-centric del sistema.

### Alcance de la V1

La implementación actual de `Guests` es una V1 operativa-administrativa, no un
CRM completo.

Incluye:

- listado real
- perfil básico
- aliases
- actividad
- merge manual

No incluye todavía:

- scoring de duplicidad
- sugerencias por IA
- perfil CRM enriquecido
- timeline CRM avanzado

### FIX-UI-GUESTS-01A — Política de guests absorbidos

Se estabiliza la política operativa para guests absorbidos tras un merge
manual.

Cuando dos guests se consolidan:

`Primary guest`
`Secondary guest -> absorbido`

El guest secundario queda marcado mediante tags:

`merged`
`merged-into:<primaryGuestId>`

#### Comportamiento operativo

Los guests absorbidos:

- no aparecen en el listado operativo normal
- no aparecen como candidatos de merge
- permanecen como registro histórico

El endpoint:

`/api/admin/guests`

excluye por defecto guests absorbidos.

Opcionalmente pueden incluirse usando:

`includeAbsorbed=1`

Esto evita:

- merges duplicados
- confusión operativa en recepción
- inconsistencias visuales en el panel.

### UI-GUESTS-02 — Navegación Guests -> Inbox

Se incorpora navegación cruzada entre el dominio Guests y el dominio Inbox.

Dentro del perfil de un huésped, en la sección de Conversations asociadas,
cada conversación expone la acción:

`Abrir en Inbox`

La navegación utiliza deep-link hacia:

`/admin/inbox?guestId=<guestId>&conversationId=<conversationId>`

#### Comportamiento en Inbox

La vista `/admin/inbox` acepta deep-link mediante parámetros de query:

`guestId`
`conversationId`

Con esos parámetros, Inbox realiza selección inicial automática siguiendo este
flujo:

1. cargar lista de conversaciones
2. localizar `conversationId`
3. seleccionar la conversación correspondiente
4. enfocar el thread de mensajes

Si el `conversationId` no existe o no se encuentra:

- Inbox continúa funcionando normalmente
- no se rompe la navegación existente

#### Impacto UX

Este cambio completa la continuidad entre dominios:

`Guests -> identidad`
`Inbox -> operación`

Permite que el operador:

`vea huésped`
`↓`
`revise conversaciones asociadas`
`↓`
`abra directamente la interacción`

sin tener que cambiar manualmente de módulo ni volver a buscar el thread.

### UI-GUESTS-03A — Identidad visible legible

Se incorpora una política compartida de representación visual del huésped para
la UI administrativa.

#### Problema previo

En varias vistas del Admin, el huésped podía aparecer representado por:

- `guestId`
- alias técnico
- identificadores poco legibles para recepción

Esto dificultaba la operación humana y volvía demasiado técnica la revisión de
guests.

#### Solución implementada

Se define una política única de `displayName` para Guests e Inbox, con
prioridad:

`1. guest.name`
`2. alias legible humanizado`
`3. fallback "Guest <id corto>"`

#### Ejemplos de representación visible

`Marcelo Martínez`
`WhatsApp +598...`
`Email mar...@dominio.com`
`Web guest`
`Guest 6f03a100`

#### Regla importante

El `guestId` sigue existiendo y continúa visible como dato secundario o
diagnóstico, pero deja de ser la referencia principal para operación humana.

#### Impacto

Con este cambio, recepción puede operar sobre una identidad visual coherente y
usable, condición necesaria para revisar duplicados potenciales y consolidar
guests.

### UI-GUESTS-03B — Sugerencias operativas de merge

Se agrega una primera capa de detección asistida de posibles duplicados en el
módulo Guests.

#### Principio de diseño

Begasist no ejecuta merge automático.

El sistema solo:

`sugiere posibles merges`

y el operador humano sigue siendo quien decide y ejecuta la consolidación
manual.

#### Implementación

Las sugerencias se calculan mediante heurísticas simples, explicables y no
persistidas.

Se exponen en una nueva sección del módulo Guests:

`Posibles merges sugeridos`

Cada sugerencia muestra:

- guest candidato principal
- guest candidato secundario
- score simple
- severidad (`high`, `medium`, `low`)
- señales que justifican la sugerencia

#### Heurísticas utilizadas

Ejemplos de señales activas en esta V1:

- actividad muy cercana o cercana
- canales distintos
- nombre igual
- uno sin nombre
- aliases complementarios
- contacto coincidente (`email`, `whatsapp`, `phone`) si existe

#### Acciones disponibles

Cada sugerencia permite:

- `Revisar`
- `Preparar merge`
- `Ignorar por ahora`

La acción **Preparar merge** no ejecuta el merge automáticamente; solo
precarga el flujo manual existente.

#### Limitaciones de la V1

- las sugerencias no se persisten
- `Ignorar por ahora` vive solo en estado local de UI
- no hay scoring probabilístico avanzado ni IA
- no existe auto-merge

#### Impacto UX

El dominio Guests deja de limitarse a mostrar identidades y pasa a ayudar
activamente a descubrir qué guests podrían representar a la misma persona.

## UI-INBOX-01 — Bandeja operativa multicanal para recepción

Se refina el módulo `Inbox` para que funcione de forma más clara como bandeja
operativa de recepción y no como una simple agregación técnica de threads.

### Objetivo

Mejorar la lectura operativa de:

- conversación activa
- canal activo
- estado del thread
- pendientes de atención
- contexto resumido del huésped actual

sin modificar backend ni modelo de datos.

### Cambios incorporados

#### 1. Jerarquía visual más clara

La vista de Inbox pasa a separar mejor:

- sidebar de huéspedes
- conversaciones del huésped seleccionado
- encabezado operativo del thread activo
- resumen contextual del huésped
- panel de mensajes

#### 2. Conversaciones como tarjetas operativas

Las conversaciones asociadas al huésped dejan de mostrarse con foco en
telemetría cruda y pasan a presentarse como tarjetas compactas con:

- asunto
- canal
- estado
- recencia de actividad
- contador de mensajes
- indicador de pendiente

#### 3. Header operativo del thread activo

El Inbox ahora muestra explícitamente:

- asunto de la conversación
- canal activo
- estado del thread
- cantidad de threads del huésped
- última actividad
- pendientes asociados

#### 4. Resumen compacto del huésped actual

Sin convertir Inbox en CRM, se incorpora un bloque contextual con:

- displayName
- guestId corto
- aliases
- canales
- número de conversaciones
- última actividad

### Resultado operativo

Con este refinamiento, `Inbox` se consolida como espacio de operación
conversacional diaria, manteniendo la separación de dominios:

`Guests -> identidad`
`Inbox -> operación`

El cambio no introduce timeline multicanal completa ni modifica contratos API,
pero mejora significativamente la legibilidad operativa para recepción.
