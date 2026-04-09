Perfecto 🚀. Ahora te voy a preparar un esquema de caching para `hotelPhoneMap` usando `globalThis.__hotel_phone_map__` en el servidor.
Voy a armar:
- Una función `initHotelPhoneCache()` para inicializar el mapa desde AstraDB.
- Una función `getHotelIdByPhone(phone: string)` que primero busca en memoria y, si no encuentra, puede opcionalmente recargar.
- Opcional: Una función `refreshHotelPhoneCache()` para actualizar el cache manualmente.

Te paso el boceto enseguida.

# Sistema de *caching* en memoria para `hotelPhoneMap`

## Motivación y beneficios del *caching*
Implementar un sistema de cacheo en memoria para la asociación de teléfonos a `hotelId` permite reducir la cantidad de consultas a la base de datos (AstraDB) en cada mensaje de WhatsApp. Esto mejora el rendimiento y disminuye la latencia, ya que los datos en memoria se pueden acceder mucho más rápido que consultar la base de datos en cada solicitud. Como se sabe, *“requests made in the future for frequently accessed data that is stored in a cache can be quickly served up and [are] usually faster than accessing the data’s primary storage location (usually a database)”* ([Caching in Node.js to optimize app performance - LogRocket Blog](https://blog.logrocket.com/caching-node-js-optimize-app-performance/#:~:text=The%20idea%20is%20that%20requests,of%20reusing%20previously%20retrieved%20or)). Además, disminuir las consultas frecuentes a AstraDB puede reducir costos y carga en el servicio.

Dado que el mapa de números de teléfono a `hotelId` probablemente no cambia con frecuencia, es un buen candidato para almacenarlo temporalmente en memoria. Los datos en caché **no suelen cambiar a menudo** y pueden reutilizarse para múltiples consultas, evitando recalcular o volver a recuperar los mismos datos repetidamente ([Caching in Node.js to optimize app performance - LogRocket Blog](https://blog.logrocket.com/caching-node-js-optimize-app-performance/#:~:text=Caching%20is%20a%20technique%20used,cache%20does%20not%20change%20often)).

## Almacenamiento en memoria global
Para mantener el cache de forma global dentro del proceso Node.js, utilizaremos una variable global accesible a toda la aplicación. En este caso se propone usar `globalThis.__hotel_phone_map__` para almacenar un objeto (o mapa) con la correspondencia de **teléfono → hotelId** en memoria. 

El uso de variables globales en Node.js debe hacerse con precaución, pero es aceptable para valores que actúan como **singleton** o **cache** de datos inmutables ([Avoiding Memory Leaks in Node.js: Best Practices for Performance | AppSignal Blog](https://blog.appsignal.com/2020/05/06/avoiding-memory-leaks-in-nodejs-best-practices-for-performance.html#:~:text=2,don%27t%20let%20them%20grow%20indefinitely)). De hecho, las mejores prácticas sugieren *“usar variables globales solo para constantes, caché y objetos singleton reutilizables”* ([Avoiding Memory Leaks in Node.js: Best Practices for Performance | AppSignal Blog](https://blog.appsignal.com/2020/05/06/avoiding-memory-leaks-in-nodejs-best-practices-for-performance.html#:~:text=2,don%27t%20let%20them%20grow%20indefinitely)), evitando su uso para pasar datos entre funciones de manera arbitraria. En nuestro caso, el mapa de teléfonos es esencialmente un caché de consulta, lo cual encaja en esas recomendaciones.

Al usar `globalThis`, nos aseguramos de tener un único almacenamiento compartido dentro del proceso de Node.js. Una **cache interna** (en memoria) como esta guarda los objetos *dentro* de la aplicación Node y solo están disponibles para ese proceso ([Part 7. Internal Caching in Node.js | by Alex Losikov | Medium](https://losikov.medium.com/part-7-internal-caching-in-node-js-3f18411bcf2#:~:text=Based%20on%20the%20needs%20of,all%20tradeoffs%20when%20making%20decisions)). Esto significa que todos los clientes atendidos por el mismo proceso Node compartirán este cache global (seguro en un entorno multi-cliente dentro del mismo proceso, ya que cada número está asociado a un único `hotelId`). 

> **Nota:** Si la aplicación se ejecuta en múltiples procesos o instancias (por ejemplo, escalando horizontalmente o en clúster), cada proceso tendrá su propia copia en memoria del cache. En entornos distribuidos, un caché interno podría no estar sincronizado entre procesos, por lo que se podría considerar un **cache externo** (como Redis) para compartir el estado entre instancias ([Part 7. Internal Caching in Node.js | by Alex Losikov | Medium](https://losikov.medium.com/part-7-internal-caching-in-node-js-3f18411bcf2#:~:text=Based%20on%20the%20needs%20of,all%20tradeoffs%20when%20making%20decisions)). Sin embargo, para un solo servidor Node o para nuestros propósitos actuales, el uso de `globalThis.__hotel_phone_map__` es suficiente.

## Funciones del sistema de caché

El módulo se estructurará dentro de `/lib/config/hotelPhoneMap.ts` e incluirá las siguientes funciones principales:

- **`initHotelPhoneCache()`** – Inicializa el caché cargando todos los datos desde AstraDB a memoria.
- **`getHotelIdByPhone(phone: string)`** – Realiza la consulta del `hotelId` dado un número de teléfono, consultando primero en el caché en memoria y solo en caso necesario consultando a AstraDB.
- **`refreshHotelPhoneCache()`** – (Opcional) Fuerza la recarga manual del caché desde AstraDB, útil para actualizar los datos en memoria sin reiniciar el servidor.

### `initHotelPhoneCache()`: carga inicial del caché
Esta función se encarga de poblar `globalThis.__hotel_phone_map__` con los datos actuales de la base de datos. La idea es que al iniciar el servidor (o al primer uso si se prefiere *lazy loading*), se obtenga de AstraDB la lista completa de pares **teléfono → hotelId** y se almacene en memoria.

**Detalles de implementación:**

- Debe conectarse a AstraDB (por ejemplo, usando un cliente de Cassandra, REST API o GraphQL proporcionado por DataStax Astra) y obtener todos los registros relevantes. Se asume que existe una tabla o colección con las columnas “phone” y “hotelId” de donde extraer estos datos.
- Una vez obtenidos los resultados, llenar un objeto JavaScript (o un `Map`) donde las claves sean los números de teléfono (probablemente normalizados o en formato estándar) y los valores sean los correspondientes `hotelId`.
- Almacenar ese objeto en `globalThis.__hotel_phone_map__`. Por ejemplo, `globalThis.__hotel_phone_map__ = { '+123456789': 'hotel_ABC', ... }`.
- Si el caché ya estuviera cargado (por ejemplo, porque se llamó previamente), la función puede decidir omitir la recarga o volver a cargar según se necesite (para evitar duplicar trabajo). En una inicialización típica, se llamaría solo una vez al inicio del ciclo de vida de la app.

Es importante manejar **errores** en esta fase: si la conexión a la base de datos falla o no retorna resultados, la función debería arrojar una excepción o registrar el error, para evitar que la aplicación crea que el caché está poblado cuando no lo está. También se puede implementar un mecanismo de reintento o demora en caso de fallo transitorio de AstraDB.

### `getHotelIdByPhone(phone: string)`: consulta con cache-aside
Esta función será la principal utilizada durante la operación normal de la aplicación (por ejemplo, cada vez que llegue un mensaje de WhatsApp, para determinar a qué hotel corresponde el número de teléfono remitente). Implementa la estrategia de **cache-aside (lazy loading)** ([Caching in Node.js to optimize app performance - LogRocket Blog](https://blog.logrocket.com/caching-node-js-optimize-app-performance/#:~:text=data%20is%20requested,is%20issued%20to%20the%20caller)):

1. **Verificar caché:** Cuando se solicita un `hotelId` dado un número de teléfono, primero se verifica si `globalThis.__hotel_phone_map__` existe y contiene ese número como clave.
   - Si el número está en el caché (**cache hit**), se devuelve inmediatamente el `hotelId` almacenado, evitando cualquier llamada a AstraDB.
   - *Este paso es extremadamente rápido porque accede a memoria local en vez de hacer I/O de red o disco*.

2. **Cargar caché en caso necesario:** Si el caché global no existe, está vacío, o no contiene la clave del teléfono buscado (**cache miss**), entonces se procede a consultar AstraDB para ese número específico:
   - Si el caché aún no se había inicializado, puede invocarse `initHotelPhoneCache()` una vez para traer todos los datos. Otra opción, según la lógica deseada, es simplemente consultar ese número puntual en la base de datos. Dado que el objetivo es minimizar accesos a AstraDB, es preferible inicializar todo el mapa si aún no se ha hecho (así futuros accesos también estarán cubiertos).
   - En caso de que el caché esté cargado pero falte un número (por ejemplo, un teléfono nuevo que se añadió a la base de datos después de la carga inicial), la función podría hacer una consulta específica para ese número. Si la consulta devuelve un resultado válido (un `hotelId`), **se debería actualizar el caché en memoria** añadiendo este nuevo par teléfono→hotel. De este modo, las siguientes consultas de ese mismo número ya no tocarán la base de datos.
   - Si AstraDB no tiene registro para ese número (posible error o número no registrado), la función podría retornar `undefined` o null, indicando que no se encontró un `hotelId` asociado.

3. **Devolver el resultado:** Finalmente, retorna el `hotelId` encontrado ya sea en memoria o desde la base de datos. El proceso descrito coincide con el patrón *“cache aside”*, donde *“the cache is first checked to determine whether the data is available... If the data is not available (cache miss), the database is queried for the data. The cache is then populated with the data retrieved from the database”* ([Caching in Node.js to optimize app performance - LogRocket Blog](https://blog.logrocket.com/caching-node-js-optimize-app-performance/#:~:text=data%20is%20requested,is%20issued%20to%20the%20caller)). Esto garantiza que el caché siempre tendrá los datos más recientemente consultados.

**Seguridad en entornos concurrentes:** Dado que Node.js maneja las solicitudes de forma asíncrona en un solo hilo de ejecución, no habrá condiciones de carrera en el acceso a la variable global *dentro de un mismo proceso*. Sin embargo, es posible que dos solicitudes concurrentes detecten el caché vacío y ambas inicien una consulta a la base de datos. Para robustez adicional, se podría implementar un mecanismo de **bloqueo** o **bandera de carga**: por ejemplo, marcar que `initHotelPhoneCache()` está en progreso y hacer que otras llamadas `getHotelIdByPhone` esperen (o reutilicen la misma promesa) en lugar de disparar consultas duplicadas. Esto previene cargas redundantes desde AstraDB en arranque bajo alta concurrencia. En aplicaciones de gran escala, estos detalles ayudan a que el sistema sea **thread-safe** incluso bajo muchas peticiones simultáneas.

### `refreshHotelPhoneCache()`: recarga manual del caché
Esta función opcional permite forzar la recarga del caché en memoria desde AstraDB en cualquier momento, por ejemplo si se sabe que la tabla de teléfonos ha cambiado (se agregó un nuevo hotel o número) y se quiere que la aplicación use los datos actualizados inmediatamente.

La implementación típica de `refreshHotelPhoneCache()` simplemente llamaría internamente a `initHotelPhoneCache()` nuevamente, o seguiría un proceso similar:
- Vuelve a consultar **todos** los datos de mapeo en AstraDB.
- Reemplaza el contenido de `globalThis.__hotel_phone_map__` con los nuevos datos. Conviene construir primero el nuevo mapa en una variable local y luego asignarlo a la global, para minimizar el tiempo en que el caché global pueda estar inconsistente. La asignación de objeto en JavaScript es atómica a nivel de referencia, por lo que otros cálculos en curso leerán completamente la versión vieja o la nueva del mapa, pero no una intermedia.
- Opcionalmente, podría devolver algún indicador de éxito o el nuevo tamaño de entradas cargadas, para fines de registro o monitoreo.

Es útil loguear o monitorear cuando se realiza un *refresh* manual, para tener visibilidad de que el caché se actualizó correctamente. También se podría implementar un contador de versión o *timestamp* de la última actualización del caché para diagnosticar la frescura de los datos en memoria.

## Implementación en TypeScript (archivo `/lib/config/hotelPhoneMap.ts`)
A continuación, se muestra un ejemplo de implementación completo en TypeScript, siguiendo los requerimientos mencionados. Este código asume que existe algún cliente o método para consultar AstraDB (por ejemplo, `astraClient`) ya configurado en la aplicación, o funciones auxiliares para obtener los datos necesarios de la base de datos:

```typescript
// Importar el cliente de base de datos de AstraDB o métodos de acceso necesarios
// (La implementación concreta de la consulta dependerá de la librería/SDK de AstraDB usada)
import { astraClient } from '../db/astraClient';  // Ejemplo de importación (ajustar según real)

type HotelPhoneMap = Record<string, string>;  // Alias de tipo para el mapa teléfono->hotelId

// Declaración global para TypeScript: extiende el tipo global para incluir nuestro caché
declare global {
  // Agregamos __hotel_phone_map__ al objeto global (globalThis) con el tipo definido
  // La propiedad puede ser undefined si aún no ha sido inicializada
  var __hotel_phone_map__: HotelPhoneMap | undefined;
}
// Aseguramos que este módulo trate la declaración global como efectiva
export {};  // (Esto convierte el archivo en un módulo externo, requerido para las declaraciones globales en TS)

const GLOBAL_CACHE_KEY = "__hotel_phone_map__";

/**
 * Inicializa el caché de hotelPhoneMap cargando todos los datos desde AstraDB.
 * Debe llamarse al inicio del servidor o la primera vez que se necesite el mapa.
 */
export async function initHotelPhoneCache(): Promise<void> {
  try {
    // Consultar todos los pares telefono->hotelId desde AstraDB.
    // Aquí usamos astraClient hipotético; reemplazar con la llamada real (SQL/GraphQL).
    const query = "SELECT phone, hotelId FROM hotel_phone_table";  // Ejemplo de consulta
    const results = await astraClient.execute(query);
    
    // Construir el mapa en memoria a partir de resultados
    const phoneMap: HotelPhoneMap = {};
    for (const row of results.rows) {
      const phone: string = row['phone'];
      const hotelId: string = row['hotelId'];
      phoneMap[phone] = hotelId;
    }
    
    // Almacenar en variable global
    globalThis.__hotel_phone_map__ = phoneMap;
    console.log(`HotelPhone cache initialized with ${Object.keys(phoneMap).length} entries.`);
  } catch (error) {
    console.error("Error initializing hotel phone cache:", error);
    throw error;  // Propagar el error para que el llamador sepa que falló
  }
}

/**
 * Obtiene el hotelId asociado a un número de teléfono.
 * Primero revisa el caché en memoria; si no está cargado o no se encuentra el número, consulta AstraDB.
 * @param phone Número de teléfono (en formato estándar) a buscar.
 * @returns El hotelId correspondiente, o undefined si no existe.
 */
export async function getHotelIdByPhone(phone: string): Promise<string | undefined> {
  // Si el caché global no está inicializado o está vacío, intentar inicializarlo
  if (!globalThis.__hotel_phone_map__ || Object.keys(globalThis.__hotel_phone_map__).length === 0) {
    try {
      await initHotelPhoneCache();
    } catch (err) {
      // Si falla la inicialización, no podemos continuar con certeza
      return undefined;
    }
  }
  
  // A estas alturas, deberíamos tener __hotel_phone_map__ cargado (si init tuvo éxito)
  const cache = globalThis.__hotel_phone_map__!;
  if (phone in cache) {
    // Caso cache hit: devolver directamente
    return cache[phone];
  }
  
  // Caso cache miss: el número no está en caché, consultar base de datos por este teléfono específico
  try {
    const query = `SELECT hotelId FROM hotel_phone_table WHERE phone = '${phone}'`;  // Ejemplo de consulta filtrada
    const result = await astraClient.execute(query);
    if (result.rows.length > 0) {
      const hotelId: string = result.rows[0]['hotelId'];
      // Actualizar el caché en memoria con este nuevo par
      cache[phone] = hotelId;
      return hotelId;
    } else {
      // No encontrado en DB, retornar undefined
      return undefined;
    }
  } catch (error) {
    console.error(`Error fetching hotelId for phone ${phone}:`, error);
    return undefined;
  }
}

/**
 * Fuerza la recarga del caché desde AstraDB, reemplazando los datos existentes.
 * Útil cuando se sabe que los datos de la base han cambiado y se requiere actualizar el caché en caliente.
 */
export async function refreshHotelPhoneCache(): Promise<void> {
  // Simplemente volvemos a llamar a initHotelPhoneCache para reobtener todos los datos.
  await initHotelPhoneCache();
}
```

**Explicación breve del código:** En este módulo definimos un tipo `HotelPhoneMap` como un diccionario (`Record<string, string>`) para mapear números de teléfono (`string`) a identificadores de hotel (`string`). Mediante `declare global` extendemos la variable global para incluir nuestro caché tipado, de modo que TypeScript reconozca `globalThis.__hotel_phone_map__`. Las funciones exportadas cumplen lo siguiente:

- `initHotelPhoneCache`: utiliza un cliente de AstraDB (`astraClient.execute` en el ejemplo) para obtener todos los registros de la tabla correspondiente, luego construye un objeto `phoneMap` donde cada propiedad es un número de teléfono y su valor es el `hotelId`. Finalmente asigna este objeto a `globalThis.__hotel_phone_map__`. Si ocurre un error en la consulta, se captura y se registra, y eventualmente se lanza de nuevo para ser manejado por el llamador (por ejemplo, para evitar que la aplicación continúe sin un caché válido).

- `getHotelIdByPhone`: primero verifica si el caché está listo; si no, intenta inicializarlo llamando a `initHotelPhoneCache`. Luego, busca el número de teléfono en `globalThis.__hotel_phone_map__`. Si lo encuentra, retorna el `hotelId` inmediatamente (*cache hit*). Si no está, realiza una consulta individual a AstraDB para ese teléfono específico (*cache miss*), actualiza el caché con el resultado si existe, y devuelve el `hotelId` obtenido (o undefined si tampoco se encontró en la base). Cualquier error en la consulta individual se registra y resulta en un retorno `undefined` (lo que el código de nivel superior deberá interpretar apropiadamente, quizás como "hotel no encontrado").

- `refreshHotelPhoneCache`: invalida y recarga el caché llamando nuevamente a `initHotelPhoneCache`. En este caso, se optó por una implementación simple que sustituye completamente el mapa en memoria. Durante la recarga, las solicitudes que lleguen podrían temporalmente usar los datos antiguos hasta que la función termine y reemplace la variable global (gracias a la naturaleza de un solo hilo de Node, la asignación ocurrirá de forma consistente sin condiciones de carrera dentro del mismo proceso).

## Consideraciones adicionales
- **Inmutabilidad y seguridad de los datos:** Una vez cargados, los datos en `globalThis.__hotel_phone_map__` idealmente no deberían ser modificados directamente por otras partes de la aplicación fuera de las funciones provistas. Se podría congelar el objeto o proveer métodos controlados para modificarlo (aunque en nuestro caso el caché se rellena por completo desde la base y se agrega nuevas entradas solo a través de `getHotelIdByPhone` o en una recarga). Dado que cada número de teléfono pertenece a un único hotel, no hay riesgo de condiciones de carrera donde dos clientes distintos intenten asignar valores diferentes a la misma clave.

- **Tamaño de los datos:** Este caché ocupará memoria proporcional al número de entradas (teléfonos) de la tabla. En entornos de producción, asegurar que este tamaño es razonable es importante. La guía de buenas prácticas indica *“no almacenar objetos muy grandes en el ámbito global; si es necesario, limpiarlos cuando no se necesiten”* ([Avoiding Memory Leaks in Node.js: Best Practices for Performance | AppSignal Blog](https://blog.appsignal.com/2020/05/06/avoiding-memory-leaks-in-nodejs-best-practices-for-performance.html#:~:text=2,don%27t%20let%20them%20grow%20indefinitely)). Si la lista de teléfonos pudiera crecer indefinidamente, podría implementarse alguna estrategia de **limpieza** o **expiración**. En este escenario, dado que es un mapa de referencia (y probablemente relativamente estático), el riesgo es bajo. Aun así, se podría integrar una expiración temporal (TTL) para refrescar automáticamente el caché cada cierto tiempo, o limitar el tamaño si fuera relevante.

- **Entorno multi-proceso:** Como se mencionó, en caso de múltiples instancias de Node (por ejemplo, varias réplicas de la aplicación en producción), cada instancia mantendrá su propio caché. Si se hace un *refresh* manual, habría que invocarlo en todas las instancias para mantener consistencia. En aplicaciones más complejas, un **cache distribuido** (Redis, Memcached) sería preferible para que todas las instancias compartan la misma fuente de verdad en memoria ([Part 7. Internal Caching in Node.js | by Alex Losikov | Medium](https://losikov.medium.com/part-7-internal-caching-in-node-js-3f18411bcf2#:~:text=Based%20on%20the%20needs%20of,all%20tradeoffs%20when%20making%20decisions)), pero eso añade complejidad adicional (y latencia ligeramente mayor que la memoria local). Para un solo servidor o durante desarrollo, el enfoque con `globalThis` es simple y eficaz.

En resumen, esta solución implementa un caché en memoria (usando el espacio global de Node.js) para mapear números de teléfono a IDs de hotel. Siguiendo el patrón de *cache-aside* y buenas prácticas de manejo de globales, logramos reducir drásticamente las lecturas repetitivas a AstraDB, sirviendo la mayoría de consultas directamente desde la memoria ([Caching in Node.js to optimize app performance - LogRocket Blog](https://blog.logrocket.com/caching-node-js-optimize-app-performance/#:~:text=data%20is%20requested,is%20issued%20to%20the%20caller)). Esto proporcionará mejoras inmediatas de rendimiento y escalabilidad, cumpliendo con los requisitos planteados. Al mismo tiempo, mantenemos la posibilidad de forzar actualizaciones del caché cuando sea necesario, asegurando que los datos no queden obsoletos en memoria más allá de lo tolerable.