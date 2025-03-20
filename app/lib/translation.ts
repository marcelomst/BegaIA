import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });

export async function translationModel(text: string, targetLanguage: string) {
  return await model.invoke([{ role: "system", content: `Translate this to ${targetLanguage}: ${text}` }]);
}
