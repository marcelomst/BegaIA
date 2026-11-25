<!-- Path: /docs/development/demo-astra-baseline.md -->

# Contrato de baseline Astra sintético para Demo

Este contrato implementa planificación, verificación, inicialización protegida
y recuperación de un baseline sintético para `hotel999`. No provisiona un
keyspace, no contiene credenciales y no prueba que exista un destino Demo real.

## Límite derivado de ENV-02

El baseline debe residir en un keyspace Demo previamente provisionado, separado
de Developer, con credenciales específicas. No se copia estado de Developer y
el único canal habilitado por el seed es Web. El runtime conversacional vigente
y el provider `astra-demo` no se reemplazan.

## Evidencia física versionada

El manifest vive en `lib/demoAstraBaseline/manifest.ts` y referencia los
contratos físicos existentes:

- Collections Data API flexibles: `hotel_config`, `category_registry`,
  `system_playbook`, `hotel_content`, `hotel_version_index`,
  `hotel_text_collection`, `guests`, `conversations`, `messages`, `conv_state`
  y `poi`.
- `guest_aliases`: CQL usado por `lib/db/guestAliases.ts`, con partición por
  `hotelid` y clustering por `alias`.
- `guest_aliases_by_guest`: tabla documentada con partición compuesta
  `hotelid + guestid` y clustering por `alias`.
- `demo_cm_reservations`: reutiliza directamente
  `DEMO_CHANNEL_MANAGER_RESERVATIONS_SCHEMA`.
- `hotel999_collection`: nombre derivado por `getCollectionName(hotelId)`.
  Sus opciones vectoriales físicas no están versionadas con precisión
  suficiente; por eso debe estar preprovisionada y este contrato nunca la crea.

La ausencia de opciones vectoriales verificables se mantiene como limitación;
no se inventa dimensión, métrica ni proveedor de embeddings. La compatibilidad
física usa tres estados inequívocos: `compatible`, `incompatible` y
`unverified`. El adaptador real siempre reporta `hotel999_collection` como
`unverified` mientras no exista evidencia física adicional; `verify` y `apply`
rechazan ese estado aunque la colección exista y esté vacía.

## Inventario completo del namespace

Antes de inspeccionar contenido, el adaptador enumera por separado:

- Collections mediante `listCollections`;
- Tables mediante `listTables`, incluyendo su definición física.

Ambas enumeraciones deben ser completas y estar autorizadas. El contrato
rechaza errores del proveedor, resultados parciales, permisos no verificados,
nombres ambiguos, discrepancias entre inventario e inspección y cualquier
Collection o Table adicional no declarada en el manifest. Un error nunca se
convierte en una lista vacía y el inventario de Collections no se usa como
sustituto del inventario de Tables, ni a la inversa.

## Fuentes sintéticas

El contrato verifica SHA-256 antes de planificar, verificar o aplicar:

- `seeds/category_registry.json`:
  `b3e4875be9eaec7b5d9e78eb82e7c79009f7845a5b6b665a18161b361d25baef`.
- `seeds/system_playbook.seed.jsonl`:
  `986561d0803ab7ac73b3f57d19cf213f77749210875f7047bc299b49c70d0f6d`.
- árbol sintético `kb/hotel999`:
  `876712eb54e1de3ff75e8f930625691cda747423bdcbbeb847ce2a2fd5cf3199`.

El árbol KB sólo se referencia. La generación de embeddings y su ingestión
requieren servicios externos y quedan fuera de este hito. No se exige igualdad
byte a byte entre embeddings producidos en ejecuciones futuras.

El seed de `hotel_config` es ficticio, tiene `users: []`, no contiene passwords,
tokens, `SecretRef`, credenciales ni reservas, y sólo declara
`channelConfigs.web` habilitado. Su hash canónico es
`e0662a80f8d6fda755a968427107fb1e57eb59b72a2d5f6579900e4ca95d5741`.
Guests, conversaciones, mensajes, estado,
aliases, POI y reservas comienzan vacíos.

## Identidad del destino

Endpoint y keyspace deben pasarse explícitamente. El fingerprint es:

```text
sha256("begaia-demo-astra-target-v1\nendpoint=<origin-normalizado>\nkeyspace=<keyspace>")
```

El contrato exige HTTPS, rechaza URL con credenciales, path, query o fragmento,
rechaza keyspaces Developer conocidos —incluido `hotel_data`— y compara el
fingerprint calculado con el esperado. El nombre `hotel999` no participa en la
autorización del destino. No existe allowlist ficticia de endpoints.

La única variable de credencial aceptada por la CLI es
`BEGASIST_DEMO_ASTRA_APPLICATION_TOKEN`; no existe fallback a la credencial
genérica de Developer. El nombre de la variable no acredita mínimo privilegio.

## CLI fail-closed

El comando por defecto es `plan`:

```bash
pnpm demo:astra:baseline fingerprint --endpoint https://DESTINO --keyspace KEYSPACE_DEMO
pnpm demo:astra:baseline plan --endpoint https://DESTINO --keyspace KEYSPACE_DEMO --expected-target-fingerprint SHA256
pnpm demo:astra:baseline apply --endpoint https://DESTINO --keyspace KEYSPACE_DEMO --expected-target-fingerprint SHA256 --confirm APPLY-DEMO-ASTRA-BASELINE-V1
pnpm demo:astra:baseline verify --endpoint https://DESTINO --keyspace KEYSPACE_DEMO --expected-target-fingerprint SHA256
pnpm demo:astra:baseline recovery --endpoint https://DESTINO --keyspace KEYSPACE_DEMO --expected-target-fingerprint SHA256
```

- `fingerprint`: cálculo local, sin red ni escrituras.
- `plan`: inspección remota de sólo lectura; valida el inventario y muestra
  precondiciones bloqueadas sin crear ni modificar objetos.
- `apply`: exige fingerprint, target vacío o baseline idéntico, colección
  vectorial preprovisionada, schemas compatibles, permisos verificados y la
  confirmación exacta `APPLY-DEMO-ASTRA-BASELINE-V1`.
- `verify`: lectura posterior y comparación exacta del baseline; no muta.
- `recovery`: imprime un procedimiento; no conecta ni modifica el destino.

La ruta `apply` está implementada y probada con un adaptador simulado cuyos
fixtures declaran compatibilidad física explícita. El adaptador real conserva
`hotel999_collection` como `unverified`, por lo que bloquea antes de escribir.
Además, sólo puede acreditar permisos de lectura sin mutar y reporta los
permisos de escritura como no verificados. Habilitar un apply real requiere un
hito operacional posterior que aporte evidencia física vectorial y evidencia
verificable de mínimo privilegio. Este hito no ejecuta esa ruta.

`verify` comprueba un baseline ya inicializado. Ejecutarlo sobre un keyspace
nuevo antes de `apply` puede fallar legítimamente con
`BASELINE_OBJECT_MISSING`; no es un preflight de inicialización.

## Idempotencia y destino no vacío

El primer apply sólo acepta objetos vacíos o ausentes según el manifest. Si hay
datos sin el marcador `baseline_control`, rechaza con `TARGET_NOT_EMPTY`. Si el
marcador existe, todos los documentos seeded y todas las cardinalidades deben
coincidir; sólo entonces una repetición devuelve un no-op idempotente.

No se mezclan datos parciales, no se corrigen documentos divergentes y no se
aceptan filas operacionales preexistentes.

## Riesgos operacionales pendientes

Este contrato no resuelve la exclusión concurrente, la atomicidad global ni la
recuperación automática de una inicialización parcial:

- **TOCTOU:** existe una ventana entre el inventario y preflight del namespace
  y las escrituras posteriores. Una modificación concurrente del keyspace
  durante esa ventana puede invalidar las condiciones previamente verificadas.
  El fingerprint y el inventario identifican y validan el destino, pero no
  constituyen una garantía de exclusión concurrente.
- **Ausencia de atomicidad:** `apply` ejecuta operaciones secuenciales. No hay
  una transacción global que abarque la creación de Collections, la creación de
  Tables y la carga de documentos.
- **Inicialización parcial:** un error, una interrupción o un fallo de red puede
  dejar el destino parcialmente inicializado. Ese estado no constituye un
  baseline válido y no debe promoverse ni utilizarse como Demo.

Ante un `apply` parcial, el recovery es manual y fail-closed: no se reintenta
automáticamente, ni se limpia ni se sobrescribe el destino afectado. Se debe
detener el procedimiento, registrar evidencia sanitizada del fallo y conservar
el destino para análisis. Una autoridad operacional debe preparar otro destino
nuevo, vacío e independiente; sobre él se repiten el preflight y las
verificaciones, se ejecuta un nuevo `apply` sólo con autorización expresa y se
ejecuta `verify` después de que el `apply` finalice satisfactoriamente. La
secuencia continúa siendo `plan` → `apply` autorizado → `verify`.

Estos riesgos permanecen operacionales y no se consideran técnicamente
resueltos por este hito. Además, el adaptador Astra real continúa bloqueando
`apply` mientras no exista evidencia verificable de permisos de escritura ni
evidencia de compatibilidad física del schema vectorial.

## Recuperación

Recovery no ejecuta `drop`, `truncate`, `wipe` ni borrados. El procedimiento es:

1. retirar de tráfico el destino afectado y conservarlo para análisis;
2. provisionar por autoridad humana otro keyspace Demo vacío;
3. aprobar su fingerprint y credencial específica;
4. ejecutar `plan` para comprobar precondiciones sin escrituras;
5. ejecutar un `apply` separado y autorizado sólo cuando schema y permisos
   estén acreditados;
6. ejecutar `verify` para comprobar el resultado posterior;
7. cambiar configuración únicamente mediante un hito de cutover posterior.

Este contrato no acredita aislamiento Astra real, cutover, Demo Comercial
congelada ni existencia de un keyspace Demo.
