// /app/api/hotels/update/route.ts
/**
 * Endpoint para modificar datos de un hotel existente.
 * Solo permite cambiar campos no críticos.
 * Restricción: no se puede cambiar hotelId ni el nombre del hotel system.
 */
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import { resolveEmailCredentials } from "@/lib/email/resolveEmailCredentials";

export async function POST(req: NextRequest) {
  const { hotelId, updates } = await req.json();

  // Validación de campos básicos
  if (!hotelId || !updates) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }

  // ⚠️ No permitir cambio de hotelId
  if (updates.hotelId && updates.hotelId !== hotelId) {
    return NextResponse.json({ error: "No se puede cambiar el hotelId" }, { status: 400 });
  }

  // ⚠️ No cambiar nombre del hotel system
  if (hotelId === "system" && updates.hotelName) {
    return NextResponse.json({ error: "No se puede cambiar el nombre del hotel system" }, { status: 400 });
  }

  // Sanitización / reglas para channelConfigs.email
  const warnings: string[] = [];
  if (updates.channelConfigs?.email) {
    const email: any = updates.channelConfigs.email;
    const original = await getHotelConfig(hotelId);
    const currentEmail: any = original?.channelConfigs?.email || {};

    // Si viene credentialsStrategy = 'ref', intentar eliminar password si también hay secretRef
    if (email.credentialsStrategy === 'ref' && email.secretRef) {
      if (email.password) {
        delete email.password; // no permitimos reintroducir inline
        warnings.push('password_inline_removed');
      }
    }

    // Si secretRef existe pero no strategy, inferir
    if (email.secretRef && !email.credentialsStrategy) {
      email.credentialsStrategy = 'ref';
    }

    // Si se elimina secretRef pero había uno antes y se deja password => marcar advertencia
    if (!email.secretRef && currentEmail.secretRef && email.password) {
      warnings.push('secretRef_removed_fallback_to_inline');
    }

    // Pre-chequeo: test de resolución (no aborta, solo warning si none)
    const mergedEmail = { ...currentEmail, ...email };
    const creds = resolveEmailCredentials(mergedEmail);
    if (creds?.source === 'none') {
      warnings.push('email_credentials_unresolved');
    }
    // Hard-fail: estrategia ref exige secretRef válido con env var presente
    if (mergedEmail.credentialsStrategy === 'ref' && mergedEmail.secretRef) {
      if (creds?.source !== 'env') {
        return NextResponse.json({ error: 'email_secret_ref_env_missing', detail: { secretRef: mergedEmail.secretRef } }, { status: 400 });
      }
    }
    updates.channelConfigs.email = mergedEmail;
  }

  await updateHotelConfig(hotelId, updates);

  return NextResponse.json({ ok: true, warnings });
}
