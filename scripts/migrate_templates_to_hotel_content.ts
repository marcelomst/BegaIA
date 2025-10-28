import promptMetadata from "../lib/prompts/promptMetadata";
// /home/marcelo/begasist/scripts/migrate_templates_to_hotel_content.ts


import { templates } from "../lib/prompts/templates";
import type { HotelContent } from "../types/hotelContent";
import { writeFileSync } from "fs";
import { getAstraDB } from "../lib/astra/connection";
import { translateTextToLang } from "../lib/retrieval/index";

// --- CONSTANTES AL INICIO ---
const SUPPORTED_LANGS = ["es", "en", "pt"];
const DEFAULT_HOTEL_ID = "system";
const DEFAULT_TYPE = "standard";
const DEFAULT_LANG = "es";
const DEFAULT_VERSION = "v1";
const PLAYBOOK_CATEGORIES = ["reservation", "support", "billing", "cancel_reservation", "reservation_flow", "modify_reservation"];
// Idiomas a eliminar en Astra (ajusta según necesidad)
const LANGS_TO_DELETE = ["es", "en", "pt"];
// Idiomas a subir en Astra (ajusta según necesidad)
const LANGS_TO_UPLOAD = ["es"];
function getTypeForCategory(category: string): "playbook" | "standard" {
    return PLAYBOOK_CATEGORIES.includes(category) ? "playbook" : "standard";
}

async function migrateTemplatesToHotelContent(): Promise<HotelContent[]> {
    const result: HotelContent[] = [];
    for (const category of Object.keys(promptMetadata)) {
        const validPromptKeys = new Set(promptMetadata[category]);
        if (!templates[category]) continue;
        for (const entry of templates[category]) {
            if (!validPromptKeys.has(entry.key)) continue;
            for (const lang of LANGS_TO_UPLOAD) {
                let title = await translateTextToLang(entry.title, lang);
                let body = await translateTextToLang(entry.body, lang);
                result.push({
                    hotelId: DEFAULT_HOTEL_ID,
                    category,
                    promptKey: entry.key,
                    lang,
                    version: DEFAULT_VERSION,
                    type: getTypeForCategory(category),
                    title,
                    body,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }
        }
    }
    return result;
}

async function main() {
    const migrated = await migrateTemplatesToHotelContent();
    writeFileSync("hotel_content.migrated.json", JSON.stringify(migrated, null, 2));
    console.log(`Migración completada: ${migrated.length} registros generados.`);

    // Insertar en Astra DB (colección o tabla "hotel_content")
    const db = getAstraDB();
    const collection = db.collection("hotel_content");

    // Limpiar todos los registros existentes para los idiomas seleccionados
    let deleted = 0;
    for (const category of Object.keys(promptMetadata)) {
        const validPromptKeys = new Set(promptMetadata[category]);
        for (const promptKey of validPromptKeys) {
            for (const lang of LANGS_TO_DELETE) {
                // Borra todos los registros con la combinación completa de claves primarias
                const filter = {
                    hotelId: DEFAULT_HOTEL_ID,
                    category,
                    promptKey,
                    lang,
                    version: DEFAULT_VERSION,
                };
                try {
                    const res = await collection.deleteMany(filter);
                    if (res.deletedCount) deleted += res.deletedCount;
                } catch (e) {
                    console.error("Error eliminando:", filter, String(e));
                }
            }
        }
    }
    console.log(`Registros de hotel_content eliminados: ${deleted}`);

    let inserted = 0;
    for (const doc of migrated) {
        try {
            await collection.insertOne(doc);
            inserted++;
        } catch (e) {
            const errMsg = (e instanceof Error && e.message) ? e.message : String(e);
            console.error("Error insertando doc:", doc, errMsg);
        }
    }
    console.log(`✔ Insertados en Astra: ${inserted} de ${migrated.length}`);
}


main().catch((e) => {
    console.error("Error en migración Astra:", e?.message || e);
    process.exit(1);
});