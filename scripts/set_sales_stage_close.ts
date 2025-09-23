// scripts/set_sales_stage_close.ts
// Ejecutar con:
// pnpm tsx scripts/set_sales_stage_close.ts
import { upsertConvState } from "../lib/db/convState";

// Reemplaza estos valores por los de tu caso
async function main() {
    const hotelId = "hotel999";
    const conversationId = "09ea8a53-48a4-4a26-b8fb-d51630c735c3";
    await upsertConvState(hotelId, conversationId, {
        salesStage: "close",
        updatedBy: "script",
    });
    console.log("salesStage actualizado a 'close' para", hotelId, conversationId);
}

main().catch(console.error);
