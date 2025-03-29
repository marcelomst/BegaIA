//root/begasist/lib/agents/room_info.ts

import { ChatOpenAI } from "@langchain/openai";
import { GraphState, model, vectorStore } from "./index";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { defaultPrompt, curatedPrompts } from "../prompts";

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
  const translatedQuery =
    lang === process.env.SYSTEM_NATIVE_LANGUAGE
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

  const searchQuery =
    typeof translatedQuery.content === "string"
      ? translatedQuery.content
      : JSON.stringify(translatedQuery.content);

  const results = await vectorStore.similaritySearch(searchQuery, 5);

  return results.map((doc) => doc.pageContent).join("\n\n");
}

export async function handleDefaultWithContext(state: typeof GraphState.State) {
  const lastUserMessage = state.messages.findLast((m) => m instanceof HumanMessage);
  const userQuery =
    typeof lastUserMessage?.content === "string" ? lastUserMessage.content.trim() : "";
  const lang = state.detectedLanguage ?? process.env.SYSTEM_NATIVE_LANGUAGE;
  const promptKey = state.promptKey;

  if (!userQuery.trim()) {
    return { messages: [new AIMessage("Consulta vacía o inválida.")] };
  }

  const retrievedInfo = await retrieve_hotel_info(userQuery, lang);

  if (!retrievedInfo.trim()) {
    const response = await model.invoke(state.messages);
    const responseText = typeof response.content === "string" ? response.content.trim() : "";
    return {
      messages: [
        new AIMessage(responseText || "Lo siento, no encontré información."),
      ],
    };
  }

  const promptTemplate = (promptKey && curatedPrompts[promptKey]) || defaultPrompt;
  const finalPrompt = promptTemplate
    .replace("{{retrieved}}", retrievedInfo)
    .replace("{{query}}", userQuery);

  const response = await model.invoke([
    { role: "system", content: finalPrompt },
    { role: "user", content: userQuery },
  ]);

  const responseText = typeof response.content === "string" ? response.content.trim() : "";
  const finalResponse =
    lang === process.env.SYSTEM_NATIVE_LANGUAGE
      ? responseText
      : await translateResponseBack(lang, responseText);

  return {
    ...state,
    messages: [
      ...state.messages,
      new AIMessage(finalResponse || "Lo siento, no encontré información sobre habitaciones.")
    ],
  };
      
}
