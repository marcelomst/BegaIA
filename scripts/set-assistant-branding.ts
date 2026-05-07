#!/usr/bin/env tsx
import { getHotelConfig, getHotelConfigCollection, updateHotelConfig } from "../lib/config/hotelConfig.server";

type Args = {
  hotelId: string;
  displayName: string;
  roleLabel: string;
  apply: boolean;
  clear: boolean;
  clearDisplayName: boolean;
  clearRoleLabel: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let hotelId = process.env.HOTEL_ID || "hotel999";
  let displayName = "Vera";
  let roleLabel = "la asistente hotelera digital";
  let apply = false;
  let clear = false;
  let clearDisplayName = false;
  let clearRoleLabel = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === "--hotel" || arg === "-h") && args[i + 1]) {
      hotelId = args[++i];
      continue;
    }
    if (arg.startsWith("--hotel=")) {
      hotelId = arg.slice("--hotel=".length);
      continue;
    }
    if ((arg === "--displayName" || arg === "-d") && args[i + 1]) {
      displayName = args[++i];
      continue;
    }
    if (arg.startsWith("--displayName=")) {
      displayName = arg.slice("--displayName=".length);
      continue;
    }
    if ((arg === "--roleLabel" || arg === "-r") && args[i + 1]) {
      roleLabel = args[++i];
      continue;
    }
    if (arg.startsWith("--roleLabel=")) {
      roleLabel = arg.slice("--roleLabel=".length);
      continue;
    }
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    if (arg === "--clear") {
      clear = true;
      continue;
    }
    if (arg === "--clear-displayName") {
      clearDisplayName = true;
      continue;
    }
    if (arg === "--clear-roleLabel") {
      clearRoleLabel = true;
    }
  }

  return { hotelId, displayName, roleLabel, apply, clear, clearDisplayName, clearRoleLabel };
}

async function main() {
  const {
    hotelId,
    displayName,
    roleLabel,
    apply,
    clear,
    clearDisplayName,
    clearRoleLabel,
  } = parseArgs();

  const current = await getHotelConfig(hotelId);
  if (!current) {
    console.error(`[set-assistant-branding] no existe hotel_config para ${hotelId}`);
    process.exit(1);
  }

  const nextBranding = { ...(current.assistantBranding || {}) } as Record<string, string>;

  if (clear) {
    delete nextBranding.displayName;
    delete nextBranding.roleLabel;
  } else {
    if (clearDisplayName) delete nextBranding.displayName;
    else nextBranding.displayName = displayName;

    if (clearRoleLabel) delete nextBranding.roleLabel;
    else nextBranding.roleLabel = roleLabel;
  }

  const normalizedBranding = Object.keys(nextBranding).length > 0 ? nextBranding : undefined;

  if (!apply) {
    console.log("[set-assistant-branding] dry-run", {
      hotelId,
      current: current.assistantBranding || null,
      next: normalizedBranding || null,
    });
    console.log(
      "[set-assistant-branding] usa --apply para persistir. Ejemplo: pnpm exec tsx scripts/set-assistant-branding.ts --hotel hotel999 --apply"
    );
    return;
  }

  const shouldUnsetAll = clear || (!normalizedBranding && (clearDisplayName || clearRoleLabel));

  if (shouldUnsetAll) {
    const unset: Record<string, string> = {};
    if (clear || clearDisplayName) unset["assistantBranding.displayName"] = "";
    if (clear || clearRoleLabel) unset["assistantBranding.roleLabel"] = "";

    await getHotelConfigCollection().updateOne(
      { hotelId },
      {
        $unset: unset,
        $set: { lastUpdated: new Date().toISOString() },
      } as any
    );
  } else {
    const updatedPartial: Record<string, any> = {};
    if (clearDisplayName) {
      await getHotelConfigCollection().updateOne(
        { hotelId },
        {
          $unset: { "assistantBranding.displayName": "" },
          $set: {
            "assistantBranding.roleLabel": normalizedBranding?.roleLabel,
            lastUpdated: new Date().toISOString(),
          },
        } as any
      );
    } else if (clearRoleLabel) {
      await getHotelConfigCollection().updateOne(
        { hotelId },
        {
          $unset: { "assistantBranding.roleLabel": "" },
          $set: {
            "assistantBranding.displayName": normalizedBranding?.displayName,
            lastUpdated: new Date().toISOString(),
          },
        } as any
      );
    } else {
      updatedPartial.assistantBranding = normalizedBranding;
      await updateHotelConfig(hotelId, updatedPartial);
    }
  }

  const updated = await getHotelConfig(hotelId);
  if (!updated) {
    console.error(`[set-assistant-branding] no se pudo recargar hotel_config para ${hotelId}`);
    process.exit(1);
  }

  console.log("[set-assistant-branding] updated", {
    hotelId: updated.hotelId,
    assistantBranding: updated.assistantBranding || null,
    lastUpdated: updated.lastUpdated || null,
  });
}

main().catch((err) => {
  console.error("[set-assistant-branding] failed", err);
  process.exit(1);
});
