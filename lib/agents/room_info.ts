import { ChatOpenAI } from "@langchain/openai";
import { GraphState, model, vectorStore } from "./index"
import { AIMessage } from "@langchain/core/messages";
import { defaultPrompt, curatedPrompts } from "../prompts";
import { HumanMessage } from "@langchain/core/messages";


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
    console.log("📢 SYSTEM_NATIVE_LANGUAGE:", process.env.SYSTEM_NATIVE_LANGUAGE);
    console.log("📢 Lenguaje detectado:", lang);


    const translatedQuery = lang === process.env.SYSTEM_NATIVE_LANGUAGE
  ? { content: query }
  : await translationModel.invoke([
      {
        role: "system",
        content: `Solo responde con la traducción literal de la siguiente consulta al idioma '${process.env.SYSTEM_NATIVE_LANGUAGE}'. No añadas ningún comentario ni explicación.`,
      },
      {
        role: "user",
        content: query,
      },
  ]);

  
  
  
    console.log(`🌍 Consulta traducida: ${translatedQuery.content}`);
    console.log("Valor de process.env.SYSTEM_NATIVE_LANGUAGE:",process.env.SYSTEM_NATIVE_LANGUAGE);
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
  const lastUserMessage = state.messages.findLast(
    (m) => m instanceof HumanMessage
  );
  
  const userQuery =
  typeof lastUserMessage?.content === "string"
    ? lastUserMessage.content.trim()
    : "";

  console.log("🧪 Consulta extraída para handleRoomInfoNode:", userQuery);
  const lang = state.detectedLanguage ?? process.env.SYSTEM_NATIVE_LANGUAGE;
  const promptKey = state.promptKey;

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
  // 🧠 Elegir prompt según `promptKey`
  const promptTemplate = (promptKey && curatedPrompts[promptKey]) || defaultPrompt;
  const finalPrompt = promptTemplate
    .replace("{{retrieved}}", retrievedInfo)
    .replace("{{query}}", userQuery);
 
    // 🔥 Enviar la consulta mejorada al modelo de IA
    const response = await model.invoke([
      { role: "system", content: finalPrompt },
      { role: "user", content: userQuery },
    ]);

  const responseText = typeof response.content === "string" ? response.content.trim() : "";

  // Traducir la salida si corresponde
  const finalResponse = lang === process.env.SYSTEM_NATIVE_LANGUAGE
  ? responseText
  : await translateResponseBack(lang, responseText);

  return { messages: [new AIMessage(finalResponse || "Lo siento, no encontré información sobre habitaciones.")] };

}