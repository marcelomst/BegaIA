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
