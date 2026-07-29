// Path: /root/begasist/scripts/repair-guest-aliases-by-guest.ts

import { getAstraDB } from "@/lib/astra/connection";
import {
  getGuestAliasesByGuestId,
  getGuestIdByAlias,
  normalizeGuestAlias,
  removeGuestAliasFromReverseLookup,
  upsertGuestAliasReverseLookup,
} from "@/lib/db/guestAliases";

type GuestDoc = {
  hotelId?: string;
  guestId?: string;
  aliases?: string[];
  tags?: string[];
};

type RepairOptions = {
  hotelId: string;
  apply?: boolean;
};

type RepairSummary = {
  hotelId: string;
  apply: boolean;
  guestsScanned: number;
  aliasesScanned: number;
  reverseRowsScanned: number;
  reverseRowsInserted: number;
  reverseRowsRemoved: number;
  alreadyConsistent: number;
  canonicalContradictions: number;
  absorbedGuestAliases: number;
  skippedMissingCanonical: number;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeGuestAlias).filter(Boolean)));
}

function isAbsorbedGuest(guest: GuestDoc): boolean {
  const tags = Array.isArray(guest.tags) ? guest.tags : [];
  return tags.some((tag) => {
    const value = String(tag);
    return value === "merged" || value.startsWith("merged-into:");
  });
}

async function loadGuests(hotelId: string): Promise<GuestDoc[]> {
  const col = getAstraDB().collection<GuestDoc>("guests");
  const cursor = await col.find({ hotelId });
  if (Array.isArray(cursor)) return cursor;
  return await (cursor?.toArray?.() ?? []);
}

export async function repairGuestAliasesByGuest(options: RepairOptions): Promise<RepairSummary> {
  const hotelId = normalizeText(options.hotelId);
  if (!hotelId) throw new Error("hotelId required");

  const summary: RepairSummary = {
    hotelId,
    apply: options.apply === true,
    guestsScanned: 0,
    aliasesScanned: 0,
    reverseRowsScanned: 0,
    reverseRowsInserted: 0,
    reverseRowsRemoved: 0,
    alreadyConsistent: 0,
    canonicalContradictions: 0,
    absorbedGuestAliases: 0,
    skippedMissingCanonical: 0,
  };

  const guests = await loadGuests(hotelId);
  summary.guestsScanned = guests.length;

  for (const guest of guests) {
    const guestId = normalizeText(guest.guestId);
    if (!guestId) continue;

    const absorbed = isAbsorbedGuest(guest);
    const aliases = unique(Array.isArray(guest.aliases) ? guest.aliases : []);
    summary.aliasesScanned += aliases.length;

    const reverseRows = await getGuestAliasesByGuestId({ hotelId, guestId }).catch(() => []);
    const reverseAliases = unique(reverseRows.map((row) => row.alias));
    summary.reverseRowsScanned += reverseAliases.length;

    for (const reverseAlias of reverseAliases) {
      const canonicalGuestId = await getGuestIdByAlias({ hotelId, alias: reverseAlias });
      const belongsToGuestAliases = aliases.includes(reverseAlias);
      const shouldRemove =
        absorbed ||
        canonicalGuestId !== guestId ||
        !belongsToGuestAliases;

      if (!shouldRemove) continue;
      if (absorbed) summary.absorbedGuestAliases += 1;
      if (canonicalGuestId && canonicalGuestId !== guestId) summary.canonicalContradictions += 1;
      if (options.apply) {
        await removeGuestAliasFromReverseLookup({ hotelId, guestId, alias: reverseAlias });
      }
      summary.reverseRowsRemoved += 1;
    }

    for (const alias of aliases) {
      const canonicalGuestId = await getGuestIdByAlias({ hotelId, alias });
      if (!canonicalGuestId) {
        summary.skippedMissingCanonical += 1;
        continue;
      }
      if (canonicalGuestId !== guestId) {
        summary.canonicalContradictions += 1;
        continue;
      }
      if (absorbed) {
        summary.absorbedGuestAliases += 1;
        continue;
      }
      if (reverseAliases.includes(alias)) {
        summary.alreadyConsistent += 1;
        continue;
      }
      if (options.apply) {
        await upsertGuestAliasReverseLookup({ hotelId, guestId, alias });
      }
      summary.reverseRowsInserted += 1;
    }
  }

  return summary;
}

function parseArgs(argv: string[]): RepairOptions {
  const hotelIdArg = argv.find((arg) => arg.startsWith("--hotel="));
  return {
    hotelId: hotelIdArg?.slice("--hotel=".length) || process.env.HOTEL_ID || "hotel999",
    apply: argv.includes("--apply"),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  repairGuestAliasesByGuest(parseArgs(process.argv.slice(2)))
    .then((summary) => {
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((error) => {
      console.error("[repair-guest-aliases-by-guest] failed", error);
      process.exitCode = 1;
    });
}
