import { franc } from "franc";
import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";

const supportedLanguages = new Set(["spa", "eng", "ita", "fra", "por"]);

export async function detectLanguage(text: string, hotelId: string): Promise<string> {
  if (!text || text.trim().length < 10) {
    return await getHotelNativeLanguage(hotelId); // ✅ usa config real
  }

  const lang = franc(text.trim(), { minLength: 3 });

  return supportedLanguages.has(lang) ? lang : await getHotelNativeLanguage(hotelId);
}
