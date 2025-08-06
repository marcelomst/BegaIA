
````markdown
# Guía Rápida: Build, Deploy y Logs de bots por hotel

---

## 🏨 **Resumen ultra-rápido: build y deploy de UN bot hotelero**

**Ejemplo:** Para `hotel999`

```sh
# 1. Parar y eliminar el bot (si ya existe)
docker stop begasist-channelbot-hotel999 || true
docker rm begasist-channelbot-hotel999 || true

# 2. Rebuild solo el bot (fuerza recompilado y copia de .env, etc)
docker compose -f docker-compose.bots.yml build --no-cache bot_hotel999

# 3. Levantar solo ese bot (multi-canal, ejemplo WhatsApp, Email, etc)
docker compose -f docker-compose.bots.yml up -d bot_hotel999

# 4. Ver logs en tiempo real de ese bot
docker compose -f docker-compose.bots.yml logs -f bot_hotel999
````

* El nombre del **servicio** en el compose es `bot_hotel999`
* El nombre del **contenedor** es `begasist-channelbot-hotel999`
* Repetí para cualquier hotel cambiando el sufijo (`hotelconrad`, `hotelplaza`, etc.)

---

## 1. **Construir las imágenes**

### Suite Frontend/Backend

```sh
docker build -t begasist-suite:latest .
```

### Bots de Hotel (multi-canal)

```sh
docker build -f Dockerfile.channelbot -t begasist-channelbot:latest .
```

---

## 2. **Refactorizar (rebuild) imagen dev**

Si actualizaste código, siempre **reconstruí** la imagen relevante antes de levantar los contenedores:

* **Suite:**

  ```sh
  docker build -t begasist-suite:latest .
  ```
* **Channelbot:**

  ```sh
  docker build -f Dockerfile.channelbot -t begasist-channelbot:latest .
  ```

---

## 3. **Arrancar contenedores en desarrollo**

### Todos (suite + Redis + todos los bots)

```sh
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.bots.yml up -d
```

### Sólo Suite (frontend/backend + Redis)

```sh
docker compose -f docker-compose.dev.yml up -d
```

### Sólo Bots (multi-hotel/multi-canal)

```sh
docker compose -f docker-compose.bots.yml up -d
```

---

## 4. **Build & restart de un bot de hotel específico**

### **Ejemplo: hotel999**

#### a) **Detener (por si está corriendo):**

```sh
docker compose -f docker-compose.bots.yml down
```

O solo el bot en particular:

```sh
docker stop begasist-channelbot-hotel999
docker rm begasist-channelbot-hotel999
```

#### b) **Reconstruir SOLO el bot específico (recomendado si solo cambió channelbot):**

```sh
docker compose -f docker-compose.bots.yml build --no-cache bot_hotel999
```

> Si modificaste el Dockerfile o el código fuente, esto fuerza la actualización.

#### c) **Levantar solo el bot de ese hotel (más rápido y limpio):**

```sh
docker compose -f docker-compose.bots.yml up -d bot_hotel999
```

#### d) **Verificar logs solo de ese bot:**

```sh
docker compose -f docker-compose.bots.yml logs -f bot_hotel999
```

---

## 5. **Ver logs de los bots**

```sh
docker compose -f docker-compose.bots.yml logs -f
```

O para un bot específico:

```sh
docker logs begasist-channelbot-hotelplaza -f
```

---

## 6. **Ver logs de la suite**

```sh
docker compose -f docker-compose.dev.yml logs -f
```
## 7. levantar la suite en modo desarrollo con hot reload 


cd /root/begasist
```sh
docker compose -f docker-compose.dev.yml up --build
```
### Si ya la levantaste antes y solo querés que se actualice sin forzar el rebuild:

```sh
docker compose -f docker-compose.dev.yml up
```
## 8. **Notas importantes**

* Si **actualizás código fuente**, SIEMPRE **reconstruí la imagen** y relanzá el/los contenedores correspondientes.
* Los nombres de los bots (contenedores) siguen el formato:
  `begasist-channelbot-hotel<NOMBRE>`
* Redis es **único** y compartido.
* Si cambiás la estructura de `/lib/entrypoints/channelbot.ts` o similares, no olvides reconstruir la imagen de `begasist-channelbot`.
* Si cambiás `.env`, relanzá los bots para tomar la nueva config.
¡Perfecto!
Acá te sumo **un bloque extra de troubleshooting de errores frecuentes** (modular y conciso) para que lo agregues después del resto en tu `.md`.
Lo podés pegar tal cual después de la sección “Notas importantes”.

---

````markdown
---

## 8. **Troubleshooting rápido: errores frecuentes en bots**

### 🟠 **El bot entra en crash-loop (sale y entra solo, logs muestran error)**
- **Revisá los logs con:**  
  ```sh
  docker compose -f docker-compose.bots.yml logs -f bot_hotel999
````

* **Causas típicas:**

  * Faltan variables de entorno (verifica `.env` y `env_file`)
  * Error de conexión a AstraDB o Redis
  * Dependencias faltantes (ejemplo: Puppeteer/Chromium, ver Dockerfile)
  * Código fuente con imports inválidos

---

### 🟠 **No aparece el QR de WhatsApp en el panel**

* **Chequeá los logs del bot de WhatsApp**
* Verificá que esté activo el canal WhatsApp en la config (`enabled: true`)
* Confirmá que Redis esté corriendo (`docker ps` debe mostrar el contenedor redis)
* Forzá un rebuild + restart del bot correspondiente

---

### 🟠 **No se ven mensajes de canal email/web en el panel**

* Revisá que el bot esté guardando correctamente los mensajes en la colección `messages` de AstraDB
* El frontend debe consumir la API `/api/messages/by-channel?hotelId=...&channel=...`
* Si los mensajes tienen `status: ignored` (spam), solo aparecerán si el panel lo permite

---

### 🟠 **El bot responde emails de spam o propaganda**

* Mejorá el filtro en `/lib/services/email.ts` (palabras clave, dominios, etc.)
* Considerá pasar el canal email a “modo supervisado” para forzar revisión manual antes de enviar

---

### 🟠 **Cambios en .env no tienen efecto**

* Bajá y levantá de nuevo el bot con

  ```sh
  docker compose -f docker-compose.bots.yml down
  docker compose -f docker-compose.bots.yml up -d
  ```

---

### 🟠 **No se actualizan los cambios de código**

* Siempre ejecutá el rebuild con `--no-cache`:

  ```sh
  docker compose -f docker-compose.bots.yml build --no-cache bot_hotel999
  ```

---

### 🟠 **No puedo entrar al contenedor (siempre está "restarting")**

* Mirá los logs como arriba para ver el motivo real.
* Si el error es inmediato (env, conexión, crash), corregilo y relanzá el servicio.

---

**¿Otro caso? Podes consultar los logs y revisar el panel de control,
o preguntarme para sumar más escenarios comunes.**
Para levantar tu stack en modo desarrollo con hot-reload y asegurarte de que se reconstruyan las imágenes al cambiar el código, basta con:

```bash
# Desde la raíz de tu proyecto
docker compose -f docker-compose.dev.yml up --build
```

Si quieres que arranque en segundo plano (detached):

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

Y si más adelante solo quieres reconstruir y reiniciar el servicio `suite`:

```bash
docker compose -f docker-compose.dev.yml up -d --build suite
```

Con el volumen `.:/app` y el `.next` montado, tus cambios en el código se reflejarán al instante sin necesidad de volver a reconstruir la imagen cada vez.

Para levantar **solo el bot de hotel999** en modo desarrollo (con rebuild y hot-reload), puedes usar:

```bash
# Reconstruye la imagen del bot_hotel999 y lo levanta en foreground
docker compose -f docker-compose.bots.yml up --build bot_hotel999
```

O bien, en segundo plano (detached):

```bash
docker compose -f docker-compose.bots.yml up -d --build bot_hotel999
```

Si más tarde quieres reiniciar solo ese servicio sin reconstruir todo el stack:

```bash
docker compose -f docker-compose.bots.yml up -d --build bot_hotel999
```

Y para parar el bot:

```bash
docker compose -f docker-compose.bots.yml stop bot_hotel999
```

Con el volumen `.:/app` montado y tu script `dev:channelbot` configurado para hot-reload, cualquier cambio en el código de `hotel999` se reflejará al instante.




