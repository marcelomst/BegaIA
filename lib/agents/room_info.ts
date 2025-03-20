import { ChatOpenAI } from "@langchain/openai";
import { GraphState, model, vectorStore } from "./index"
import { AIMessage } from "@langchain/core/messages";
// Codigo para probar la recuperacion desde la base vectorial
const translationModel = new ChatOpenAI({ model: "gpt-4o" });

export async function retrieve_hotel_info(query: string) {
    console.log("🔍 Buscando información en la base vectorial: ${query}");
  
    // 🔄 Traducimos la consulta al inglés antes de buscar
    const translatedQuery = await translationModel.invoke([
      { role: "system", content: "Translate this query to English:" },
      { role: "user", content: query }
    ]);
  
    console.log("🌍 Consulta traducida: ${translatedQuery.content}");
    console.log("📌 Tipo de translatedQuery.content:", typeof translatedQuery.content, translatedQuery.content);
  
    // 🔍 Buscamos en la base vectorial
    const searchQuery = typeof translatedQuery.content === "string"
    ? translatedQuery.content
    : JSON.stringify(translatedQuery.content);
    const results = await vectorStore.similaritySearch(searchQuery, 5);
  
    console.log("📄 Resultados encontrados:", results.map(r => r.pageContent));
  
    return results.map(doc => doc.pageContent).join("\n\n");
  }

export async function handleRoomInfoNode(state: typeof GraphState.State) {
  // 📝 Obtener la consulta del usuario
  const userQuery = state.messages.length > 0 ? String(state.messages[state.messages.length - 1]?.content) : "";

  if (!userQuery.trim()) {
    console.error("⛔ Error: La consulta del usuario no es un string válido.");
    return { messages: [new AIMessage("Hubo un problema procesando tu solicitud.")] };
  }

  console.log("🔍 Consulta sobre habitaciones recibida:", userQuery);

  // 🔎 Buscar información en la base vectorial
  const retrievedInfo = await retrieve_hotel_info(userQuery) || ""; // Siempre asegurar string

  if (!retrievedInfo.trim()) {
    console.log("🚫 No se encontraron coincidencias en la base vectorial. Usando modelo de IA sin contexto.");
    const response = await model.invoke(state.messages);
    const responseText = typeof response.content === "string" ? response.content.trim() : "";
    return { messages: [new AIMessage(responseText || "Lo siento, no encontré información sobre habitaciones.")] };
  }

  console.log("📝 Información recuperada de la base vectorial:", retrievedInfo);

  // 🔹 Construir el prompt con formato mejorado
const formattedPrompt = `
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

${retrievedInfo}

**Asegúrate de seguir estrictamente este formato.**
`.trim();


  console.log("🤖 Generando respuesta con formato mejorado...");

  // 🔥 Enviar la consulta mejorada al modelo de IA
  const response = await model.invoke([
    { role: "system", content: String(formattedPrompt) }, // Convertir a string por seguridad
    { role: "user", content: String(userQuery) }
  ]);

  const responseText = typeof response.content === "string" ? response.content.trim() : "";

  console.log("📌 Respuesta final generada:\n", responseText);
  return { messages: [new AIMessage(responseText || "Lo siento, no encontré información sobre habitaciones.")] };
}