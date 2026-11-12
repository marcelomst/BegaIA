<!-- Path: /docs/development/demo-local-orchestration.md -->

# Demo Local Orchestration

Este flujo consolida la demo local de BegaIA sin cambiar el runtime conversacional.

## Topología

`docker-compose.demo.yml` levanta una unidad local multitenant-aware para `hotel999`:

- `redis`: Redis local compartido.
- `suite`: Next.js dev server interno, sin puerto publicado al host.
- `trusted-ingress`: único ingreso de la aplicación en `http://127.0.0.1:3000`.
- `hotel-demo`: página estática en `http://127.0.0.1:8081`.
- `email-worker`: opcional con perfil `email`.
- `cloudflared`: opcional con perfil `public`.

## Comandos

Core web:

```bash
pnpm run demo:up
```

Core + Email:

```bash
pnpm run demo:up:email
```

Core + Cloudflared:

```bash
pnpm run demo:up:public
```

Todo:

```bash
pnpm run demo:up:all
```

Estado:

```bash
pnpm run demo:ps
```

Logs agregados:

```bash
pnpm run demo:logs
```

Logs de un servicio:

```bash
pnpm run demo:logs:service -- suite
pnpm run demo:logs:service -- hotel-demo
pnpm run demo:logs:service -- email-worker
```

Smoke:

```bash
pnpm run demo:smoke
```

Detener:

```bash
pnpm run demo:down
```

## Healthchecks

- Redis: `redis-cli ping`.
- Suite: `GET /api/health` sobre la red interna.
- Trusted ingress: `GET /__trusted-ingress/health`; el smoke comprueba además
  `GET /api/health` atravesando el proxy.
- Hotel Demo: `GET /`.
- Email worker: proceso iniciado y contenedor running.
- Cloudflared: proceso `cloudflared` ejecutable dentro del contenedor. El smoke valida `/metrics` desde el host cuando el perfil `public` está activo.

## Smoke

El smoke valida:

- Redis accesible.
- Trusted ingress y Next accesibles a través del único puerto publicado.
- `/widget/embed` accesible.
- `/widget/begai-chat.js` accesible.
- Hotel Demo accesible.
- bootstrap Guest Web autorizado por la aserción HMAC del ingress.
- extracción de capability sin imprimirla, binding de conversación y
  `messageId` estable.
- `/api/chat` e historial autorizados con Bearer Guest.
- rechazo de capability ausente y mismatch de conversación.
- Email worker running si el perfil está activo.
- Cloudflared metrics si el perfil está activo.

El smoke no ejecuta reservas reales.

## Clasificación De Activos Existentes

- `docker-compose.dev.yml`: `REUSABLE`, base conceptual de Redis + suite dev.
- `Dockerfile.dev`: `CURRENT`, reutilizado para `suite` y servicios Node locales.
- `docker-compose.cloudflared.yml`: `REUSABLE_WITH_DRIFT`, usa túnel/config
  legacy; el stack demo usa `infra/cloudflared/config.demo.yml`.
- `.cloudflared/config.dev.native.yml`: `CURRENT_NATIVE`, para `pnpm run dev:tunnel` fuera de Docker.
- `infra/cloudflared/config.demo.yml`: `CURRENT_DOCKER`, configuración segura y
  versionable usada por el perfil `public`; no contiene la credencial.
- `.cloudflared/config.dev.yml`: `LOCAL_LEGACY_FOR_DEMO`, ignorada por Git y ya
  no montada por `docker-compose.demo.yml`.
- `docker-compose.bots.yml`: `LEGACY_FOR_DEMO`, orientado a WhatsApp/Baileys.
- `docker-compose.bots.override.yml`: `LEGACY`, mezcla `redis`/`begasist-redis` y Dockerfile Node 18.
- `docker-compose.bots.prod.yml`: `PROD_ORIENTED`, fuera de alcance de demo local.
- `Dockerfile.channelbot`: `REUSABLE_FOR_WHATSAPP`, fuera del stack demo core.
- `Dockerfile.bots-node18`: `LEGACY`, no usado por la demo.
- `docker-compose.yml`: `UNCLEAR/PROD_DRIFT`, referencia `Dockerfile` no presente en el repo actual.

## Notas Operativas

Email requiere credenciales Gmail/IMAP válidas. Si el perfil `email` falla por autenticación, revisar primero:

```bash
pnpm run email:diag
```

Cloudflared es opcional. No es requisito para probar Web local.

## Trusted Ingress Guest Web

El ingress es stateless y mantiene dos listeners dentro del mismo servicio:

- `3000`: política local. Compose lo publica exclusivamente como
  `127.0.0.1:3000`; ignora todos los headers de IP del caller y asigna una sola
  identidad local `127.0.0.1` para rate limiting.
- `3001`: política de túnel. No se publica al host. Antes de aceptar
  `CF-Connecting-IP`, compara el peer TCP real con las direcciones resueltas
  para `cloudflared` en la red dedicada `tunnel-ingress`.

En ambos listeners se eliminan los headers `x-begasist-*` y los headers de IP
aportados por el caller. El ingress genera una nueva aserción con el contrato
`v1\n<unix-seconds>\n<client-ip>` y HMAC-SHA256. La pertenencia a la red Docker
no se usa por sí sola como evidencia de procedencia.

La aplicación conserva la autoridad Guest en capability y grant persistido.
Los headers firmados sólo acreditan la identidad de rate limiting del
bootstrap; no autorizan chat, historial ni reservas.

## Configuración Requerida

La aplicación `suite` requiere:

- `GUEST_WEB_CONVERSATION_SECRET`: secreto Guest independiente, mínimo 32
  bytes.
- `GUEST_WEB_PROXY_TRUST_SECRET`: secreto HMAC independiente, mínimo 32 bytes.
- `GUEST_WEB_ALLOWED_ORIGINS`: allowlist explícita separada por comas.

`trusted-ingress` recibe únicamente `GUEST_WEB_PROXY_TRUST_SECRET` y su
configuración no secreta `TRUSTED_INGRESS_*`. No recibe el secreto de
capabilities ni el resto de `.env`.

Cloudflared conserva el contrato existente basado en archivo local de
credencial. El perfil público requiere que exista localmente:

`./.cloudflared/c3d5dea7-fc68-4374-9211-cf7fa8c20da2.json`

Ese archivo no debe versionarse ni imprimirse. La ausencia de cualquiera de
los secretos requeridos hace fallar cerrado al bootstrap o al arranque del
ingress.

## Gate De Credenciales Cloudflare

El repositorio todavía sigue en Git estos activos sensibles históricos:

- `.cloudflared/8d3a6032-8734-446b-a5ec-7d8fa71e14aa.json`
- `.cloudflared/cert.pem`

No se leyó ni modificó su contenido en este hito. Deben revisarse y rotarse
fuera de este alcance antes de cualquier exposición pública. Hasta completar
ese gate, el túnel no está aprobado para demo comercial ni despliegue público.
