# Guest Identity Model

## 1. Introducción

Begasist implementa identidad transversal de huéspedes para soportar operación
multi-canal, multi-conversación y perfil unificado en admin.

La identidad canónica se representa con:

`guestId`

## 2. Tablas involucradas

### guests

Entidad lógica del huésped. Representa la persona dentro del sistema.

### guest_aliases

Tabla operativa para resolución principal de identidad.

Lookup optimizado:

`hotelId + alias -> guestId`

Usada por:

- `resolveGuestIdentity`
- pipeline de mensajes

Alias típicos:

- email
- teléfono
- whatsapp
- id externo

### guest_aliases_by_guest

Tabla introducida por `FIX-GUEST-ALIASES-REVERSE-LOOKUP-1` para proyección de
lectura por huésped.

Modelo Cassandra:

```sql
CREATE TABLE hotel_data.guest_aliases_by_guest (
  hotelId TEXT,
  guestId TEXT,
  alias TEXT,
  createdAt TIMESTAMP,
  PRIMARY KEY ((hotelId, guestId), alias)
);
```

Lookup optimizado:

`hotelId + guestId -> aliases`

Usada por:

- admin guest profile
- admin inbox
- analytics futuro

## 3. Direcciones de consulta soportadas

### alias -> guestId

Usando:

`guest_aliases`

Consulta típica:

`hotelId + alias`

### guestId -> aliases

Usando:

`guest_aliases_by_guest`

Consulta típica:

`hotelId + guestId`

## 4. Justificación Cassandra

Cassandra requiere query-based modeling. Cada patrón de consulta importante se
modela con una estructura dedicada.

Antes de este hito, el reverse lookup usaba `ALLOW FILTERING`, lo cual es un
antipatrón en este contexto. La tabla `guest_aliases_by_guest` elimina esa
dependencia.

## 5. Sincronización entre tablas

La sincronización se realiza desde:

`ensureGuestAlias(...)`

Flujo:

`INSERT guest_aliases`
`INSERT guest_aliases_by_guest`

La proyección admin se sincroniza con:

`syncGuestAliasReverseReadModel(...)`

Modo:

`best-effort`

Así, una falla de la proyección secundaria no rompe el pipeline operativo.

## 6. Impacto en arquitectura

Este modelo habilita:

- admin guest profile
- admin inbox unificado
- conversation binding por `guestId`
- analytics por huésped

## 7. Origen de guestId por canal

### Canal Web

En canal web, el `guestId` se genera en cliente con `crypto.randomUUID()`,
se persiste en `localStorage` y se reutiliza en requests posteriores con
formato:

`guest-${uuid}`

Objetivo: mantener identidad persistente por navegador aun sin autenticación
previa y evitar colisiones de conversaciones bajo un placeholder compartido.

## 8. Estado operacional y reset de pruebas

Las tablas `guest_aliases` y `guest_aliases_by_guest` forman parte del estado
operacional del sistema (identidad y conversación), no de configuración ni KB.

En entornos de prueba E2E, pueden limpiarse junto con `messages`,
`conversations`, `guests` y `conv_state` durante el reset operativo.

## 9. Consolidación manual de identidad (UI-GUESTS-01)

En Begasist, la creación inicial de guests es deliberadamente conservadora.

Cada alias multicanal puede originar inicialmente un guest nuevo cuando no
existe evidencia suficiente para asumir identidad compartida.

Ejemplo válido:

`Guest A -> whatsapp:+598...`
`Guest B -> web:session_123`

aunque ambos correspondan a la misma persona real.

Esto no se considera un bug, sino una decisión de seguridad funcional.

### Resolución de identidad en V1

La resolución de identidad se implementa mediante merge manual asistido por UI.

El operador puede decidir que dos guests representan la misma persona
indicando:

`primaryGuestId`
`secondaryGuestId`

### Efectos del merge manual

La operación de merge manual:

- reasigna aliases del guest secundario al principal
- actualiza referencias de `guestId` en conversaciones
- actualiza referencias de `guestId` en mensajes
- registra el guest secundario como absorbido mediante tags:

`merged`
`merged-into:<primaryGuestId>`

### Motivación del enfoque manual

La consolidación no se automatiza inicialmente para evitar falsos positivos de
identidad.

Esto es particularmente importante en entornos hoteleros multicanal donde
diferentes canales pueden presentar identificadores incompletos o ambiguos.

### Política de guests absorbidos (FIX-UI-GUESTS-01A)

Cuando un merge manual ocurre:

`primaryGuestId`
`secondaryGuestId`

el guest secundario pasa a estado absorbido.

Un guest absorbido:

- queda marcado con `merged` y `merged-into:*`
- no participa del flujo operativo normal
- permanece como registro histórico

Esto permite mantener trazabilidad sin generar duplicidad en la operación
diaria.

### Identidad visible en operación humana

Aunque `guestId` sigue siendo la identidad técnica persistente del sistema, la
operación humana requiere una representación visible legible.

Begasist incorpora una política de display basada en:

`guest.name`
`-> alias humanizado`
`-> Guest <id corto>`

Esto separa claramente:

`guestId = identidad técnica`
`displayName = identidad operativa visible`

La misma política se utiliza en múltiples vistas administrativas para mantener
consistencia entre módulos.

### Detección asistida de posibles duplicados

La resolución de identidad en Begasist continúa siendo manual y explícita, pero
ahora el sistema ayuda a descubrir posibles duplicados mediante heurísticas
simples.

Esta capa no modifica el modelo de datos de fondo, sino que agrega una ayuda
operativa sobre la información ya disponible de:

- aliases
- canales
- timestamps
- nombre visible
- actividad reciente

La sugerencia de merge se considera:

`asistencia operativa`

y no decisión automática del sistema.

### Heurísticas de sugerencia

La V1 contempla señales como:

- actividad temporal cercana
- distintos canales
- coincidencia fuerte de nombre
- presencia de un guest sin nombre
- aliases complementarios
- coincidencia de contacto si existe

Estas heurísticas buscan reducir el esfuerzo del recepcionista para encontrar
posibles duplicados, manteniendo siempre confirmación humana.

### Nota importante

El sistema puede sugerir:

`possible merge`

pero no debe ejecutar:

`merge automático`

sin intervención humana.

Esta restricción sigue siendo parte central del modelo de identidad de
Begasist.
