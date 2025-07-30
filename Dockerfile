# Path: /Dockerfile

# 🔧 Etapa 1: Build con pnpm
FROM node:20-alpine AS builder

WORKDIR /app

# Copiamos dependencias primero para aprovechar la cache
COPY package.json pnpm-lock.yaml ./

RUN corepack enable && corepack prepare pnpm@10.12.3 --activate

RUN pnpm install --frozen-lockfile

# Copiamos el resto del código fuente
COPY . .

# Ejecutamos build de producción
RUN pnpm run build

# 🏃 Etapa 2: Imagen final liviana
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Corepack y pnpm en imagen final por si se usa en producción con pnpm start
RUN corepack enable && corepack prepare pnpm@10.12.3 --activate

# Copiamos lo necesario del builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

EXPOSE 3000

CMD ["pnpm", "start"]
