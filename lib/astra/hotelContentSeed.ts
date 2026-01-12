// Path: /root/begasist/lib/astra/hotelContentSeed.ts
import { upsertHotelContent } from "./hotelContent";
import { getHotelConfig } from "../config/hotelConfig.server";
import type { HotelContent } from "../../types/hotelContent";

function normalizeLang(raw?: string): "es" | "en" | "pt" {
    const v = (raw || "").toLowerCase();
    if (v.startsWith("en")) return "en";
    if (v.startsWith("pt")) return "pt";
    return "es";
}

export async function ensureDefaultHotelContentFromConfig(hotelId: string) {
    const cfg = await getHotelConfig(hotelId);
    if (!cfg) throw new Error(`No se encontró configuración para hotelId=${hotelId}`);

    const lang = normalizeLang(cfg.defaultLanguage || "es");

    // Campos de la solapa "General"
    const name = cfg.hotelName || "Nombre del hotel";
    const address = cfg.address || "Dirección, Ciudad, País";
    const city = cfg.city || "";
    const country = cfg.country || "";
    const website = cfg.contacts?.website || "";

    const phone = cfg.contacts?.phone || cfg.phone || "";
    const whatsapp = cfg.contacts?.whatsapp || "";
    const email = cfg.contacts?.email || "";

    // Campos de la solapa "Base de Conocimiento"
    const checkIn = cfg.schedules?.checkIn || "";
    const checkOut = cfg.schedules?.checkOut || "";
    const breakfast = cfg.schedules?.breakfast || "";
    const quiet = cfg.schedules?.quietHours || "";

    const amenityTags: string[] =
        cfg.amenities?.tags ||
        cfg.amenities?.other ||
        [];

    const amenityNotes: string =
        cfg.amenities?.notes ||
        "";

    const amenities =
        amenityTags.length > 0
            ? amenityTags.join(", ")
            : "Amenities no configurados";

    const bodyLines: string[] = [];

    bodyLines.push(`# Información general del hotel`);
    bodyLines.push("");
    bodyLines.push(`- **Nombre:** ${name}`);
    bodyLines.push(
        `- **Dirección:** ${address}${city || country ? ` (${[city, country].filter(Boolean).join(", ")})` : ""
        }`
    );
    if (website) bodyLines.push(`- **Sitio web:** ${website}`);
    bodyLines.push("");

    if (phone || whatsapp || email) {
        bodyLines.push(`## Contacto`);
        if (phone) bodyLines.push(`- Teléfono: ${phone}`);
        if (whatsapp) bodyLines.push(`- WhatsApp: ${whatsapp}`);
        if (email) bodyLines.push(`- Email: ${email}`);
        bodyLines.push("");
    }

    bodyLines.push(`## Horarios`);
    if (checkIn) bodyLines.push(`- Check-in: ${checkIn}`);
    if (checkOut) bodyLines.push(`- Check-out: ${checkOut}`);
    if (breakfast) bodyLines.push(`- Desayuno: ${breakfast}`);
    if (quiet) bodyLines.push(`- Horas de silencio: ${quiet}`);
    bodyLines.push("");

    bodyLines.push(`## Amenities`);
    bodyLines.push(`- ${amenities}`);
    if (amenityNotes) bodyLines.push(`> ${amenityNotes}`);

    const body = bodyLines.join("\n");

    const doc: HotelContent = {
        hotelId,
        category: "retrieval_based",
        promptKey: "kb_general",
        lang,
        version: "v1",
        type: "standard",
        title: "Información general del hotel",
        body,
    };

    const res = await upsertHotelContent(doc);
    console.log("[hotelContentSeed] upsert kb_general", { hotelId, ...res });
    return res;
}
