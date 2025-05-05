# 📃 Arquitectura de Flujo de Mensajes WhatsApp - Proyecto Begasist

## 🛠️ Flujo General de Mensajes Entrantes (WhatsApp)

```
📱 Usuario (PAX) envía mensaje
       ↓
🤖 Bot WhatsApp recibe el mensaje
       ↓
🔎 Busca hotelId usando el número de destino (hotelPhone)
       ↓
✅ Si el hotelId existe:
       ↓
   🧹 Construimos conversationId = hotelId + senderPhone
       ↓
   🧐 Invocamos agentGraph con:
       - hotelId
       - conversationId
       - mensajes[]
       ↓
   👤 Generamos respuesta
       ↓
   📤 Respondemos al PAX
       ↓
   📚 (opcional) Guardamos el mensaje para historial

⚠️ Si el hotelId no existe:
       ↓
   ❌ Ignoramos el mensaje y logueamos advertencia
```

---

## 👋 Conceptos Clave

- **hotelId**: Identificador único de cada hotel.
- **senderPhone**: Número de teléfono del PAX (huésped).
- **conversationId**: ID de conversación para agrupar todos los mensajes entre un mismo PAX y un hotel.
- **agentGraph**: Grafo conversacional que maneja la lógica del asistente.

---

## 💡 Ventajas de este modelo

- 🌐 Escalabilidad para muchos hoteles simultáneamente.
- 🔒 Seguridad evitando respuestas a mensajes no autorizados.
- 💬 Hilo de conversación consistente para el recepcionista.
- ⚡️ Listo para automatizar creación de hotelPhoneMap desde AstraDB.

---

## 🔖 Posibles mejoras futuras

- Validación de remitente conocido vs desconocido (listas blancas).
- Múltiples instancias de WhatsApp Client para mayor distribución de carga.
- Panel para seguimiento de conversaciones activas.

---

# 📈 Estado: **Implementación en progreso**

