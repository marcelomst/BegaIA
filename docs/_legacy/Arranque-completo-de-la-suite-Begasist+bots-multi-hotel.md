Perfecto, acá te dejo el `.md` reestructurado con distinción clara entre **modo desarrollo (hot reload)** y **modo producción**, manteniendo todos los comandos y el troubleshooting.

---

````markdown
# 🏨 Hotel Assistant – Guía rápida Docker

## 📦 1. Build (compilar imágenes)

### Suite (Frontend + Backend) – Producción o Dev
```sh
docker build -t begasist-suite:latest .
````

### Channelbot (base para todos los bots de hotel) – Producción o Dev

```sh
docker build -f Dockerfile.channelbot -t begasist-channelbot:latest .
```

### Bot específico (ej. hotel999) – Producción o Dev

```sh
docker compose -f docker-compose.bots.yml build --no-cache bot_hotel999
```

---

## 🚀 2. Up (levantar contenedores)

### 🔄 Modo desarrollo (Hot Reload)

> Usa volúmenes montados (`.:/app`) y rebuild automático para reflejar cambios al instante.

#### Suite + Redis (dev)

```sh
docker compose -f docker-compose.dev.yml up --build
```

En segundo plano:

```sh
docker compose -f docker-compose.dev.yml up -d --build
```

#### Bot específico con hot reload

```sh
docker compose -f docker-compose.bots.yml up --build bot_hotel999
```

En segundo plano:

```sh
docker compose -f docker-compose.bots.yml up -d --build bot_hotel999
```

---

### 🚀 Modo producción (sin hot reload)

> Usa imágenes ya compiladas, más rápido y estable.

#### Suite + Redis

```sh
docker compose -f docker-compose.dev.yml up -d
```

#### Todos los bots

```sh
docker compose -f docker-compose.bots.yml up -d
```

#### Solo un bot específico

```sh
docker compose -f docker-compose.bots.yml up -d bot_hotel999
```

#### Suite + Todos los bots

```sh
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.bots.yml up -d
```

---

## 📝 3. Logs (ver actividad)

### Suite

```sh
docker compose -f docker-compose.dev.yml logs -f
```

### Todos los bots

```sh
docker compose -f docker-compose.bots.yml logs -f
```

### Bot específico

```sh
docker compose -f docker-compose.bots.yml logs -f bot_hotel999
```

O directamente:

```sh
docker logs begasist-channelbot-hotel999 -f
```

---

## ⚠ 4. Troubleshooting rápido: errores frecuentes en bots

### 🟠 El bot entra en crash-loop

```sh
docker compose -f docker-compose.bots.yml logs -f bot_hotel999
```

**Causas típicas:**

* Variables de entorno faltantes
* Error de conexión a AstraDB o Redis
* Dependencias faltantes
* Imports inválidos en el código

---

### 🟠 No aparece el QR de WhatsApp

* Revisar logs del bot
* Confirmar canal WhatsApp activo en config (`enabled: true`)
* Verificar que Redis esté corriendo
* Rebuild + restart del bot

---

### 🟠 No se ven mensajes en el panel

* Confirmar guardado en colección `messages` de AstraDB
* Revisar API `/api/messages/by-channel?hotelId=...&channel=...`
* Mensajes con `status: ignored` solo aparecen si el panel lo permite

---

### 🟠 El bot responde spam

* Mejorar filtro en `/lib/services/email.ts`
* Cambiar canal email a “modo supervisado”

---

### 🟠 Cambios en `.env` no tienen efecto

```sh
docker compose -f docker-compose.bots.yml down
docker compose -f docker-compose.bots.yml up -d
```

---

### 🟠 Cambios de código no se reflejan

```sh
docker compose -f docker-compose.bots.yml build --no-cache bot_hotel999
```

---

### 🟠 No puedo entrar al contenedor (está "restarting")

* Ver logs
* Corregir error y relanzar el servicio

---

**📌 Tip:** Redis es único y compartido entre todos los bots. Los contenedores de bots usan el formato:

```
begasist-channelbot-hotel<NOMBRE>
```

```

---

Si querés, puedo ahora **agregar una tabla resumen** que condense todos los comandos de Suite y Bot en modo dev y producción para que sea aún más rápido de consultar.  
¿Te la preparo?
```
