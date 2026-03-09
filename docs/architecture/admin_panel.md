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
