<!-- Path: /docs/development/demo-frozen-artifact.md -->

# Demo Frozen Artifact Contract

Este contrato alternativo construye una imagen Demo identificada por el commit
fuente sin usar archivos mutables del workspace como contexto efectivo. No
reemplaza `docker-compose.demo.yml`, no realiza cutover y no acredita una Demo
Comercial congelada.

## Construcción

Después de que el cambio técnico esté integrado en `main`, construir desde el
commit exacto:

```bash
scripts/build-demo-frozen-image.sh "$(git rev-parse HEAD)"
```

El script exige `main`, exige que el commit solicitado sea el `HEAD` local,
exporta ese commit mediante `git archive` a un directorio temporal y construye
desde esa exportación. Los cambios tracked, untracked y archivos ignorados del
workspace no ingresan al contexto. El tag local resultante es
`begasist-suite-demo:git-<40-hex-commit>` y nunca sobrescribe
`begasist-suite:dev`.

La imagen registra el commit y tree Git, el hash del lockfile y el hash de la
configuración de build mediante labels. El script informa el image ID local y
los RepoDigests realmente disponibles. Un build local normalmente acredita un
image ID, no un RepoDigest; la promoción futura por digest requiere publicar la
imagen en un registry y verificar allí su digest.

La base queda fijada a Node `20.19.6-bookworm` mediante digest y pnpm queda
fijado a `10.12.3`. La instalación usa `pnpm install --frozen-lockfile`. El
build activa la salida standalone soportada por Next `15.2.2` a través de
`NEXT_PRIVATE_STANDALONE=true` y ejecuta `next build --no-lint`. El lint se
omite dentro del build porque el baseline no puede completar el gate ESLint.
La imagen final contiene el servidor standalone, estáticos de Next, `public`,
el ingress compilado y el servidor/activos de hotel-demo. No contiene
toolchain, fuentes completas ni dependencias de test.

### Excepción ESLint Acotada

La auditoría del baseline registró 4 errores ESLint preexistentes: 1
`no-debugger`, 2 `no-extra-boolean-cast` y 1 `no-control-regex`, además de 3429
warnings. Estos hallazgos no fueron introducidos ni corregidos por este hito.
Por ese motivo el build de infraestructura usa `--no-lint`: permite comprobar
la compilación, el type-check de Next y la generación standalone sin ampliar el
alcance hacia archivos funcionales ajenos.

`--no-lint` no equivale a un lint PASS. `pnpm run ts-check` tampoco cubre ni
reemplaza las reglas ESLint omitidas. El riesgo residual permanece abierto y
debe ser visible en la promoción del artefacto.

La verificación focal de este hito exige que su conjunto exacto de archivos no
contenga JavaScript ni TypeScript y que no exista un diff tracked sobre
extensiones cubiertas por ESLint:

```bash
hito_paths=(
  .dockerignore
  Dockerfile.demo-frozen
  docker-compose.demo-frozen.yml
  scripts/build-demo-frozen-image.sh
  docs/development/demo-frozen-artifact.md
)
! printf '%s\n' "${hito_paths[@]}" | grep -Eq '\.(cjs|mjs|js|jsx|ts|tsx)$'
git diff --quiet -- '*.cjs' '*.mjs' '*.js' '*.jsx' '*.ts' '*.tsx'
```

La excepción sólo puede eliminarse cuando un hito autorizado deje el lint
completo del repositorio en exit code 0 y `next build` vuelva a ejecutarse sin
`--no-lint`. Este contrato no declara resueltos los errores o warnings del
baseline.

## Descriptor Inactivo

`docker-compose.demo-frozen.yml` no contiene `build:` y exige una referencia de
imagen explícita. Para validar su resolución sin iniciar servicios se requieren
valores externos:

```bash
BEGASIST_FROZEN_IMAGE=begasist-suite-demo:git-<40-hex-commit> \
BEGASIST_FROZEN_ENV_FILE=<ruta-absoluta-externa> \
BEGASIST_FROZEN_ASTRA_BUNDLE_FILE=<ruta-absoluta-externa> \
BEGASIST_FROZEN_PROXY_SECRET_FILE=<ruta-absoluta-externa> \
docker compose -f docker-compose.demo-frozen.yml config
```

No usar `begasist-suite:dev`, `latest` ni una etiqueta mutable. El futuro
contrato de promoción debe preferir una referencia
`registry/repository@sha256:<digest>` verificada.

El descriptor usa el proyecto `begasist-demo-frozen`, puertos host `3100` y
`8181`, redes propias y el volumen `frozen_redis_data`. `suite` no publica
puertos; todo ingreso a la aplicación atraviesa `trusted-ingress`. El listener
de túnel no se publica y no se incluye un servicio Cloudflare. Tampoco se
incluyen Email Worker, WhatsApp ni Beds24.

La configuración de `suite` se inyecta mediante un env file externo. El bundle
Astra y el secreto HMAC del ingress se montan desde archivos externos en modo
read-only; sus rutas host no están fijadas por el repositorio. La imagen no
contiene `.env`, credenciales Astra, credenciales Cloudflare ni secretos de
canales.

## Límites

La igualdad de commit, lockfile, Dockerfile y bases por digest mejora la
repetibilidad, pero no demuestra builds byte-a-byte idénticos. La identidad
local comprobable es el image ID; un RepoDigest sólo existe después de una
operación de registry que queda fuera de este hito. La recreación de servicios,
prueba de independencia de runtime, aislamiento definitivo de datos/config y
cutover requieren hitos operacionales posteriores.
