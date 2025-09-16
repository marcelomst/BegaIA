// Path: /root/begasist/lib/prompts/index.ts

// 🧠 Prompt genérico
export const defaultPrompt = `
Responde la siguiente consulta usando exclusivamente la información proporcionada.

- Sé claro y profesional.
- Si no hay suficiente información, responde con cortesía sin inventar.

Información disponible:

{{retrieved}}

Consulta del usuario: "{{query}}"
`.trim();

// 🏨 Prompts curados por clave
export const curatedPrompts: Record<string, string> = {
  room_info: `
Usa la siguiente información del hotel para responder de manera clara y bien estructurada.

**Formato requerido:**
- Usa **Markdown** con listas y tablas para alineación.
- La tabla **sin líneas de separación entre filas**.
- Usa títulos en **negrita** con el emoji 🏨 antes del nombre de la habitación.
- **Añade un doble salto de línea entre cada tipo de habitación.**
- **Finaliza con una invitación a reservar.**

Ejemplo de formato esperado:
\`\`\`md
**🏨 Habitación Doble**  

| 🛏️  1 cama doble      | 📏 Área de 17 metros cuadrados |  
| 🚿 Baño privado       | 📞 Teléfono                    |  
| 📺 TV LCD             | 💇‍♀️ Secador de pelo             |  
| ❄️ Aire acondicionado | 📶 WiFi gratis                 |  
| 🔒 Caja fuerte        | 🚭 No fumadores                |  
| 🛁 Toallas            | 🔥 Calefacción                 |  

<br><br>

**🏨 Habitación Triple**  

| 🛏️  1 cama doble y 1 simple   | 📏 Área de 23 metros cuadrados |  
| 🚿 Baño privado               | 📞 Teléfono                    |  
| 📺 TV LCD                     | 💇‍♀️ Secador de pelo             |  
| ❄️ Aire acondicionado         | 📶 WiFi gratis                 |  
| 🔒 Caja fuerte                | 🚭 No fumadores                |  
| 🛁 Toallas                    | 🔥 Calefacción                 |  

<br><br>

📅 **¡Reserva ahora para obtener el mejor precio!** 💰  
🔗 [Haz clic aquí para reservar](https://booking.bedzzle.com/desktop/?&apikey=6177b98dc5c442893dd76be7da149008&lang=es)
\`\`\`

**Aquí está la información relevante del hotel:**  

{{retrieved}}

**Asegúrate de seguir estrictamente este formato.**
`.trim(),
};

// 🔑 Metadatos por categoría → claves de prompt
export const promptMetadata: Record<string, string[]> = {
  // ➜ Cubre preguntas de info “estática/curada”:
  //    - horarios (check-in / check-out)
  //    - políticas (cancelación, mascotas, fumar, etc.)
  //    - tipos de habitación (descripción, equipamiento)
  //    - reglas de la casa
  retrieval_based: ["room_info"],

  // Flujo de reserva (slot-filling y/o MCP)
  reservation: [],

  // Cancelación explícita (si existe el nodo; si no, que derive a reservation/cancellation flow)
  cancel_reservation: [],

  // Servicios/amenities (si después tenés prompts propios, los agregás)
  amenities: [],

  billing: [],
  support: [],
};
