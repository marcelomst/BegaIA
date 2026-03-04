¡Dale! Aquí va una **guía práctica en español** para que puedas correr, mantener y escalar múltiples bots de WhatsApp (uno por hotel) en tu SaaS. Este README asume que usás Node.js, `whatsapp-web.js`, y que tenés acceso a un servidor *persistente* (no Vercel, sino tipo VPS, EC2, DigitalOcean, etc.).

---

```md
# 🟢 WhatsApp Multibot para SaaS Hotelero

Esta guía explica cómo correr y mantener **múltiples bots de WhatsApp**, uno por cada hotel de tu plataforma SaaS.

## 🚦 ¿Por qué un bot por hotel?
Cada bot se conecta a un número de WhatsApp (físico, eSIM, virtual, etc.), lo que permite:
- Identificar unívocamente los mensajes entrantes/salientes de cada hotel.
- Mantener independencia legal y operativa.
- Escalar el servicio globalmente.

---

## 1. Estructura recomendada de archivos

```

lib/
services/
whatsapp/
sessions/        # Aquí se guardan las sesiones (tokens) de cada hotel <hotelId>.json
index.ts         # Lógica del bot WhatsApp (multi-hotel)
...
entrypoints/
whatsapp-<hotelId>.ts   # Un entrypoint por cada hotel/bot

````

---

## 2. ¿Cómo iniciar un bot para cada hotel?

### Opción A: Manual (ideal para pruebas)

Supongamos que tenés tres hoteles: `hotel123`, `hotel456`, `hotel789`.  
Por cada uno, ejecutá en tu server:

```bash
pnpm ts-node lib/entrypoints/whatsapp-hotel123.ts
pnpm ts-node lib/entrypoints/whatsapp-hotel456.ts
pnpm ts-node lib/entrypoints/whatsapp-hotel789.ts
````

Cada entrypoint importa el bot, pero le pasa el `hotelId` y su carpeta de sesión:

```ts
// lib/entrypoints/whatsapp-hotel123.ts
import { startWhatsAppBot } from "../services/whatsapp";
startWhatsAppBot("hotel123");
```

### Opción B: Automática (escalable, para producción)

Usá **pm2** o **docker compose** para orquestar múltiples procesos/bots.

**Ejemplo con pm2:**

```bash
pm2 start lib/entrypoints/whatsapp-hotel123.ts --name whatsapp-hotel123
pm2 start lib/entrypoints/whatsapp-hotel456.ts --name whatsapp-hotel456
...
```

**Ventaja:**
Si un bot cae, se reinicia solo. Podés ver logs por hotel.

---

## 3. ¿Cómo asocio un número de WhatsApp a un hotel?

1. El hotel (o vos, durante onboarding) escanea el **QR** generado por el bot la primera vez.
2. El bot guarda la sesión cifrada en `/lib/services/whatsapp/sessions/<hotelId>.json`.
3. A partir de ese momento, el bot se conecta automáticamente con ese número.

---

## 4. ¿Qué pasa si el hotel pierde el teléfono o cierra sesión?

* El bot detecta que la sesión caducó y genera un **nuevo QR** para volver a conectar.
* Podés implementar un endpoint o pantalla admin para mostrar el QR si hace falta re-autenticar.

---

## 5. ¿Qué pasa si quiero agregar/quitar hoteles?

* **Agregar**: creá un nuevo entrypoint para ese hotel y lanzalo.
* **Quitar**: apagá el proceso correspondiente (`pm2 stop whatsapp-hotel123`), y eliminá su sesión si querés.

---

## 6. ¿Dónde identifico el hotel?

* **SIEMPRE** por el número de WhatsApp asociado a la sesión (`client.info.me.user` o similar).
* Cuando llega un mensaje, tu lógica ya sabe para qué hotel es porque ese bot sólo atiende a un hotel.
* Si necesitás, guardá en tu base de datos la relación `<hotelId> ↔ número WhatsApp`.

---

## 7. ¿Dónde corre esto?

* **NO EN VERCEL** (ni Netlify, ni servicios serverless).
* Usá un VPS, EC2, o servidor on-premise capaz de correr procesos Node.js persistentes.

---

## 8. Consejos avanzados

* Implementá monitoreo con [pm2 monit](https://pm2.keymetrics.io/) o herramientas como Grafana/Prometheus para uptime y logs.
* En producción, backupeá las sesiones (`/sessions`) periódicamente.
* Si creces mucho, podés orquestar los bots con Docker, Kubernetes, o ECS (AWS).

---

## 9. Ejemplo de flujo de onboarding para hoteles

1. El hotel accede a tu panel admin y selecciona “Conectar WhatsApp”.
2. Tu backend lanza un nuevo proceso para ese hotel (si no existe).
3. El QR se muestra en la UI. El hotel lo escanea con el teléfono deseado.
4. ¡Listo! Ese bot queda asociado a ese hotel. Ya puede recibir y enviar mensajes.

---

## 10. Troubleshooting

* Si el bot no responde, revisá si la sesión está activa.
* Si el hotel cambió de teléfono, reescaneá el QR.
* Si los mensajes llegan pero no se identifican, revisá la lógica de mapeo hotelId/phone.

---

**¿Dudas puntuales sobre el setup? ¿Querés un ejemplo real de `startWhatsAppBot(hotelId)` o el código del entrypoint?**

---

# Hotel Assistant SaaS — WhatsApp Multicanal

```

¿Querés que te pase ejemplos reales de código para el entrypoint y el bot multi-hotel, o algún snippet especial para el admin?
```


