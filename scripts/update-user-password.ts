// /scripts/update-user-password.ts

import { DataAPIClient } from "@datastax/astra-db-ts";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
dotenv.config();

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
const collectionName = "hotel_config"; // Cambia si usás otra colección

async function run(email: string, hotelId: string, newPassword: string) {
  if (!email || !hotelId || !newPassword) {
    console.error("Debe pasar: email, hotelId, newPassword");
    process.exit(1);
  }

  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
  const collection = db.collection(collectionName);

  // Buscar el documento del hotel
  const doc = await collection.findOne({ hotelId });
  if (!doc) {
    console.error(`No se encontró hotelId=${hotelId}`);
    process.exit(1);
  }

  // Buscar usuario
  const users = doc.users || [];
  const userIdx = users.findIndex((u: any) => u.email === email);

  if (userIdx === -1) {
    console.error(`No se encontró el usuario: ${email}`);
    process.exit(1);
  }

  // Actualizar password
  const hash = await bcrypt.hash(newPassword, 10);
  users[userIdx].passwordHash = hash;

  await collection.updateOne(
    { hotelId },
    { $set: { users } }
  );

  console.log(`✅ Password actualizado para ${email} en hotelId=${hotelId}`);
}

// Permite correr desde línea de comandos: tsx scripts/update-user-password.ts email hotelId newPassword
const [,, email, hotelId, newPassword] = process.argv;
run(email, hotelId, newPassword);
