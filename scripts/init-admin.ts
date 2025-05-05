// /scripts/init-admin.ts
import { collection } from "@/lib/config/hotelConfig.server";
import { hash } from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
dotenv.config();

const hotelId = "hotel123"; // Cambiar según necesidad

async function main() {
  const password = "admin123";
  const passwordHash = await hash(password, 10);

  const adminUser = {
    userId: uuidv4(),
    email: "admin@hotel.com",
    name: "Administrador Tecnico",
    roleLevel: 0, // técnico
    active: true,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  const result = await collection.updateOne(
    { hotelId },
    { $push: { users: adminUser }, $setOnInsert: { hotelId } },
    { upsert: true }
  );

  console.log("✅ Usuario admin tecnico creado o actualizado:", adminUser.email);
}

main().catch((err) => {
  console.error("❌ Error al crear usuario:", err);
  process.exit(1);
});
