import { ChatOpenAI } from "@langchain/openai";
import { GraphState, model, vectorStore } from "./index"
import { AIMessage } from "@langchain/core/messages";

const translationModel = new ChatOpenAI({ model: "gpt-4o" });

async function translateResponseBack(originalLang: string, content: string): Promise<string> {
  if (originalLang === process.env.SYSTEM_NATIVE_LANGUAGE) return content;

  const translated = await translationModel.invoke([
    {
      role: "system",
      content: `Traduce el siguiente contenido al idioma '${originalLang}' manteniendo emojis y formato Markdown.`,
    },
    {
      role: "user",
      content,
    },
  ]);

  return typeof translated.content === "string" ? translated.content : content;
}

export async function retrieve_hotel_info(query: string, lang: string) {
    console.log(`🔍 Buscando información en la base vectorial: ${query}`);
 

    const translatedQuery = lang === process.env.SYSTEM_NATIVE_LANGUAGE
    ? { content: query }
    : await translationModel.invoke([
        {
          role: "system",
          content: `Translate this query to ${process.env.SYSTEM_NATIVE_LANGUAGE}:`,
        },
        {
          role: "user",
          content: query,
        },
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
  const lang = state.detectedLanguage ?? process.env.SYSTEM_NATIVE_LANGUAGE;
  
  // Validar entrada
  if (!userQuery.trim()) {
    return { messages: [new AIMessage("Consulta vacía o inválida.")] };
  }

 // Recuperar info en idioma nativo
  const retrievedInfo = await retrieve_hotel_info(userQuery, lang);

  if (!retrievedInfo.trim()) {
    console.log("🚫 No se encontraron coincidencias en la base vectorial. Usando modelo de IA sin contexto.");
    const response = await model.invoke(state.messages);
    const responseText = typeof response.content === "string" ? response.content.trim() : "";
    return { messages: [new AIMessage(responseText || "Lo siento, no encontré información sobre habitaciones.")] };
  }

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


  // 🔥 Enviar la consulta mejorada al modelo de IA
  const response = await model.invoke([
    { role: "system", content: String(formattedPrompt) }, // Convertir a string por seguridad
    { role: "user", content: String(userQuery) }
  ]);

  const responseText = typeof response.content === "string" ? response.content.trim() : "";
  // Traducir la salida si corresponde
  const finalResponse = lang === process.env.SYSTEM_NATIVE_LANGUAGE
  ? responseText
  : await translateResponseBack(lang, responseText);
  return { messages: [new AIMessage(responseText || "Lo siento, no encontré información sobre habitaciones.")] };
}