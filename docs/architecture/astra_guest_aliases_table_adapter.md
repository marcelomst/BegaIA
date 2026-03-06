# Astra Guest Aliases Table Adapter

## Contexto

La persistencia de `guest_aliases` en Begasist se migró desde Astra Data API
(Collection) hacia Cassandra CQL Table para alinear el acceso de código con la
infraestructura física operativa.

## Tabla física

Tabla objetivo:

`hotel_data.guest_aliases`

Definición de clave:

`PRIMARY KEY ((hotelId), alias)`

Patrón de lookup:

- `hotelId + alias`

## Cambio de acceso

Antes:

- `getAstraDB().collection("guest_aliases")`
- operaciones `findOne(...)` / `insertOne(...)`

Ahora:

- cliente Cassandra vía `getCassandraClient()`
- operaciones CQL `SELECT` / `INSERT` sobre la table `guest_aliases`

## Contrato preservado

Se mantiene el contrato público de:

- `getGuestIdByAlias(input)`
- `ensureGuestAlias(input)`

Comportamiento preservado:

- normalización de alias
- lookup previo por `hotelId + alias`
- creación de `guestId` cuando aplica
- creación de guest vía `createGuest(...)` si no hay `preferredGuestId`
- tolerancia simple a carrera (insert + reconsulta)

## Resultado arquitectónico

- alineación entre arquitectura SaaS multihotel e infraestructura Astra real
- eliminación de dependencia en índices automáticos de Data API para esta
  entidad operacional estable
