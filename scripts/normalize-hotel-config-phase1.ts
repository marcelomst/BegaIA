// Path: /root/begasist/scripts/normalize-hotel-config-phase1.ts
import fs from "node:fs/promises";
import path from "node:path";
import { getHotelConfig, updateHotelConfig } from "../lib/config/hotelConfig.server";
import { getHotelConfigCollection } from "../lib/config/hotelConfig.server";

type Change = { field: string; before: unknown; after: unknown };

function normalizeDateToYmd(input: unknown): string | undefined {
  const raw = String(input ?? "").trim();
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return raw;
  return new Date(ts).toISOString().slice(0, 10);
}

function addChange(changes: Change[], field: string, before: unknown, after: unknown) {
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  changes.push({ field, before, after });
}

async function backupRawHotelConfig(hotelId: string) {
  const raw = await getHotelConfigCollection().findOne({ hotelId } as any);
  if (!raw) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(process.cwd(), "exports");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `hotel-config-backup.${hotelId}.${stamp}.json`);
  await fs.writeFile(file, JSON.stringify(raw, null, 2), "utf8");
  return file;
}

async function main() {
  const hotelId = process.argv[2] || "hotel999";
  const apply = process.argv.includes("--apply");

  const cfg = await getHotelConfig(hotelId);
  if (!cfg) {
    console.error("[hotel-phase1] hotel not found", { hotelId });
    process.exit(1);
  }

  const changes: Change[] = [];
  const updates: any = {};

  // 1) channelConfigs.whatsapp.celNumber -> string
  const wa = (cfg.channelConfigs as any)?.whatsapp;
  if (wa && "celNumber" in wa) {
    const before = wa.celNumber;
    if (typeof before === "number") {
      const after = String(before);
      updates.channelConfigs = {
        ...(updates.channelConfigs || {}),
        whatsapp: { ...wa, celNumber: after },
      };
      addChange(changes, "channelConfigs.whatsapp.celNumber", before, after);
    }
  }

  // 2) postalCode -> string
  if (typeof (cfg as any).postalCode === "number") {
    const before = (cfg as any).postalCode;
    const after = String(before);
    updates.postalCode = after;
    addChange(changes, "postalCode", before, after);
  }

  // 3) touristEvents dates -> YYYY-MM-DD
  const events = Array.isArray((cfg as any).touristEvents) ? (cfg as any).touristEvents : [];
  if (events.length) {
    const nextEvents = events.map((ev: any, idx: number) => {
      const beforeStart = ev?.startsAt;
      const beforeEnd = ev?.endsAt;
      const nextStart = normalizeDateToYmd(beforeStart);
      const nextEnd = normalizeDateToYmd(beforeEnd);
      if (nextStart !== beforeStart) {
        addChange(changes, `touristEvents[${idx}].startsAt`, beforeStart, nextStart);
      }
      if (nextEnd !== beforeEnd) {
        addChange(changes, `touristEvents[${idx}].endsAt`, beforeEnd, nextEnd);
      }
      return {
        ...ev,
        startsAt: nextStart,
        endsAt: nextEnd,
      };
    });
    if (JSON.stringify(nextEvents) !== JSON.stringify(events)) {
      updates.touristEvents = nextEvents;
    }
  }

  // 4) email credentials strategy normalization (safe, no secret removal)
  const email = (cfg.channelConfigs as any)?.email;
  if (email) {
    const currentStrategy = typeof email.credentialsStrategy === "string" ? email.credentialsStrategy : undefined;
    const inferred =
      email.secretRef ? "ref" : email.password ? "inline" : currentStrategy;
    if (inferred && inferred !== currentStrategy) {
      updates.channelConfigs = {
        ...(updates.channelConfigs || {}),
        email: { ...email, credentialsStrategy: inferred },
      };
      addChange(changes, "channelConfigs.email.credentialsStrategy", currentStrategy, inferred);
    }
  }

  const result = {
    hotelId,
    mode: apply ? "apply" : "dry-run",
    changesCount: changes.length,
    changes,
  };

  if (!apply) {
    console.log("[hotel-phase1] dry-run", result);
    return;
  }

  const backupFile = await backupRawHotelConfig(hotelId);
  if (changes.length > 0) {
    await updateHotelConfig(hotelId, updates);
  }
  console.log("[hotel-phase1] applied", {
    ...result,
    backupFile,
  });
}

main().catch((err) => {
  console.error("[hotel-phase1] error", err);
  process.exit(1);
});
