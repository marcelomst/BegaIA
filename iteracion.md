Perfecto. 🔒 Caja fuerte cerrada y sincronizada.

- Rebase OK
- Push OK
- `origin/main` quedó actualizado en `172d236`
- Y el commit remoto de borrar `ARQUITECTURA.txt` quedó “absorbido” prolijamente.

Ahora sí: **PIPE-UI-RES-1**.

---

# PIPE-UI-RES-1 — Prueba desde UI de reservas (Web / WhatsApp / Email)

Objetivo: validar el pipeline **con simulador inMemory**, pero “como usuario”, desde UI/canales.

## 0) Preparación mínima (1 minuto)

En una terminal:

```bash
pnpm dev
```

En otra (para ver logs):

```bash
pnpm vitest run test/e2e.reservation.flow.spec.ts
```

(esto segundo es opcional; el dev server es lo importante).

---

# 1) WEB (Widget / chat web)

### Paso A — crear conversación y disparar reserva

En el widget (UI web), pegá:

**Mensaje 1**

> Quiero reservar una habitación doble del 10 al 12 de marzo para 2 personas. Mi nombre es Marcelo.

**Esperado**

- Respuesta del bot
- `status: sent` (o pending si supervisado)
- Se ve creación de reserva (aunque sea implícito)

### Paso B — confirmar que hay reserva (follow-up)

**Mensaje 2**

> ¿Cuál es mi reservationId?

**Esperado**

- que te devuelva un identificador o te guíe a obtenerlo

### Paso C — modificar

**Mensaje 3**

> Cambiame la reserva a triple.

**Esperado**

- updateReservation aplicado

### Paso D — cancelar

**Mensaje 4**

> Cancelá la reserva.

**Esperado**

- cancelReservation aplicado
- estado cancelado

✅ Si esto funciona, Web queda probado “real”.

---

# 2) WhatsApp

Acá necesito elegir el modo según tu estado actual:

## Opción A (ideal): bot WhatsApp corriendo

- Mandás los mismos mensajes desde tu teléfono.
- Confirmamos en DB/logs que `channel="whatsapp"` y se ejecuta MCP.

## Opción B (fallback): simular inbound WhatsApp desde UI/Admin o endpoint

Si hoy no tenés el bot conectado, usamos el mecanismo existente de “inserción de mensaje” (si lo tienen) para generar un mensaje entrante WhatsApp y ver que corre el mismo pipeline.

---

# 3) Email

Igual que WhatsApp:

## Opción A: bot email IMAP corriendo

Mandás un email real con:
Asunto: Reserva
Cuerpo:

> Quiero reservar una doble del 10 al 12 de marzo para 2 personas. Nombre: Marcelo.

## Opción B: simulación inbound email

Usar endpoint/UI si existe para ingresar un email “fake” y que se procese.

---

# Lo único que te pido ahora (1 dato por canal)

Para avanzar sin adivinar:

1. ¿WhatsApp bot hoy lo tenés corriendo y conectado (sí/no)?
2. ¿Email bot IMAP hoy lo tenés corriendo y conectado (sí/no)?

Con esas dos respuestas te digo exactamente:

- qué comando corrés (docker/pnpm/tsx)
- qué UI o endpoint usar
- y qué evidencia mínima guardar (messageId + reservationId + status).
