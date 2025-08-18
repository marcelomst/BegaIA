// Path: /root/begasist/scripts/fix-guest-name.ts
/**
 * Corrige el nombre de un huésped en la colección "guests" de Astra.
 *
 * Uso (cualquiera de estas variantes):
 *   pnpm tsx scripts/fix-guest-name.ts --hotelId=hotel999 --guestId=marcelomst1@gmail.com --name="Marcelo Martinez"
 *   pnpm tsx scripts/fix-guest-name.ts --id=6dbe0748-149f-4749-be07-48149f674913 --name="Marcelo Martinez"
 *
 * También podés usar variables de entorno:
 *   HOTEL_ID=hotel999 GUEST_ID=marcelomst1@gmail.com NEW_NAME="Marcelo Martinez" pnpm tsx scripts/fix-guest-name.ts
 *   DOC_ID=6dbe0748-149f-4749-be07-48149f674913 NEW_NAME="Marcelo Martinez" pnpm tsx scripts/fix-guest-name.ts
 */

import { getAstraDB } from "../lib/astra/connection";

type Args = {
  id?: string;        // _id del documento
  hotelId?: string;
  guestId?: string;
  name?: string;      // nuevo nombre
};

function parseArgs(): Args {
  const out: Args = {};
  for (const raw of process.argv.slice(2)) {
    const m = raw.match(/^--([^=]+)=(.*)$/);
    if (m) {
      const k = m[1];
      const v = m[2];
      if (k === "id") out.id = v;
      if (k === "hotelId") out.hotelId = v;
      if (k === "guestId") out.guestId = v;
      if (k === "name") out.name = v;
    }
  }
  // env fallbacks
  out.id ??= process.env.DOC_ID;
  out.hotelId ??= process.env.HOTEL_ID;
  out.guestId ??= process.env.GUEST_ID;
  out.name ??= process.env.NEW_NAME;
  return out;
}

async function main() {
  const { id, hotelId, guestId, name } = parseArgs();

  if (!name || !name.trim()) {
    throw new Error(
      `NEW_NAME/--name requerido. Ej: --name="Marcelo Martinez"`
    );
  }

  const db = getAstraDB(); // tu helper
  const guests = db.collection("guests");

  // Armar filtro: por _id si viene, sino por (hotelId, guestId)
  let filter: Record<string, any> | null = null;
  if (id && id.trim()) {
    filter = { _id: id.trim() };
  } else if (hotelId && guestId) {
    filter = { hotelId: hotelId.trim(), guestId: guestId.trim() };
  } else {
    throw new Error(
      `Debes pasar --id=<docId> o ( --hotelId=<hotel> y --guestId=<guest> ).`
    );
  }

  console.log("➡️  Filtro:", filter);
  console.log("✏️  Nuevo nombre:", name);

  // (Opcional) Mostrar documento actual
  const before = await guests.findOne(filter);
  console.log("📄 Antes:", before ?? "(no encontrado)");

  // Actualizar
  const res = await guests.updateOne(
    filter,
    { $set: { name: name.trim(), updatedAt: new Date().toISOString() } },
    { upsert: false }
  );
  console.log("🛠  Resultado updateOne:", res);

  // Verificar
  const after = await guests.findOne(filter);
  console.log("✅ Después:", after ?? "(no encontrado)");
}

main().catch((err) => {
  console.error("💥 Error corrigiendo nombre:", err);
  process.exit(1);
});
