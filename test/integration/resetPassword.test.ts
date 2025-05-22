// /test/integration/resetPassword.test.ts
import { test, expect } from "vitest";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import { randomUUID } from "crypto";
import { hash, compare } from "bcryptjs";

const TEST_EMAIL = "marcelomst1@gmail.com";
const HOTEL_ID = "hotel999";

// Utilidad para simular el token de recuperación
async function prepareUserWithResetToken() {
  const config = await getHotelConfig(HOTEL_ID);
  if (!config?.users) throw new Error("Hotel o usuarios no encontrados");

  const user = config.users.find((u) => u.email === TEST_EMAIL);
  if (!user) throw new Error("Usuario de test no encontrado");

  const token = randomUUID();
  user.resetToken = token;
  user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const oldPassword = user.passwordHash;
  await updateHotelConfig(HOTEL_ID, { users: config.users });

  return { token, oldPassword };
}

test("reset-password actualiza la contraseña correctamente", async () => {
  const { token, oldPassword } = await prepareUserWithResetToken();

  const newPassword = "Nueva123!";

  const res = await fetch("http://localhost:3000/api/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword })
  });

  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.ok).toBe(true);

  // Verificamos que el hash haya cambiado y que coincida con el nuevo password
  const updated = await getHotelConfig(HOTEL_ID);
  const user = updated?.users?.find((u) => u.email === TEST_EMAIL);
  expect(user).toBeDefined();
  expect(user?.resetToken).toBeUndefined();
  expect(user?.resetTokenExpires).toBeUndefined();
  expect(user?.passwordHash).not.toBe(oldPassword);
  const match = await compare(newPassword, user!.passwordHash!);
  expect(match).toBe(true);
});
