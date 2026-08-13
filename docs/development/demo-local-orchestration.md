<!-- Path: /docs/development/demo-local-orchestration.md -->

# Demo Local Orchestration

Este flujo consolida la demo local de BegaIA sin cambiar el runtime conversacional.

## Topología

`docker-compose.demo.yml` levanta una unidad local multitenant-aware para `hotel999`:

- `redis`: Redis local compartido.
- `suite`: Next.js dev server en `http://127.0.0.1:3000`.
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
- Suite: `GET /api/health`.
- Hotel Demo: `GET /`.
- Email worker: proceso iniciado y contenedor running.
- Cloudflared: proceso `cloudflared` ejecutable dentro del contenedor. El smoke valida `/metrics` desde el host cuando el perfil `public` está activo.

## Smoke

El smoke valida:

- Redis accesible.
- Next accesible.
- `/widget/embed` accesible.
- `/widget/begai-chat.js` accesible.
- Hotel Demo accesible.
- `/api/chat` responde a un saludo seguro.
- Email worker running si el perfil está activo.
- Cloudflared metrics si el perfil está activo.

El smoke no ejecuta reservas reales.

## Clasificación De Activos Existentes

- `docker-compose.dev.yml`: `REUSABLE`, base conceptual de Redis + suite dev.
- `Dockerfile.dev`: `CURRENT`, reutilizado para `suite` y servicios Node locales.
- `docker-compose.cloudflared.yml`: `REUSABLE_WITH_DRIFT`, usa túnel/config legacy; el stack demo usa `.cloudflared/config.dev.yml`.
- `.cloudflared/config.dev.native.yml`: `CURRENT_NATIVE`, para `pnpm run dev:tunnel` fuera de Docker.
- `.cloudflared/config.dev.yml`: `CURRENT_DOCKER`, usada por el perfil `public`.
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
