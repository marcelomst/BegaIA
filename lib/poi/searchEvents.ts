// Path: /root/begasist/lib/poi/searchEvents.ts
import { getAstraDB } from "@/lib/astra/connection";
import { DateTime } from "luxon";
import type { POIRecord } from "@/types/poi";

function normalizeDateInput(date: string, boundary: "start" | "end", tz?: string) {
  const raw = (date || "").trim();
  if (!raw) throw new Error("normalizeDateInput: date requerido");

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    if (tz) {
      const base = DateTime.fromISO(raw, { zone: tz });
      const local = boundary === "start" ? base.startOf("day") : base.endOf("day");
      return local.toUTC().toISO()!;
    }
    const suffix = boundary === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z";
    return `${raw}${suffix}`;
  }
  if (tz) {
    const tryParseWithTz = () => {
      const iso = DateTime.fromISO(raw, { zone: tz });
      if (iso.isValid) return iso;
      const formats = ["d LLL yyyy", "d LLLL yyyy"];
      for (const locale of ["es", "pt"]) {
        for (const fmt of formats) {
          const dt = DateTime.fromFormat(raw, fmt, { zone: tz, locale });
          if (dt.isValid) return dt;
        }
      }
      return null;
    };
    const dt = tryParseWithTz();
    if (dt) {
      const local = boundary === "start" ? dt.startOf("day") : dt.endOf("day");
      return local.toUTC().toISO()!;
    }
  }

  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`normalizeDateInput: fecha inválida "${date}"`);
  }
  return new Date(parsed).toISOString();
}

function normalizeCity(input: string): string {
  return (input || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function col() {
  return getAstraDB().collection<POIRecord>("poi");
}

export async function searchEvents(args: {
  from: string;
  to: string;
  city?: string;
  region?: string;
  limit?: number;
  tz?: string;
}): Promise<POIRecord[]> {
  const fromISO = normalizeDateInput(args.from, "start", args.tz);
  const toISO = normalizeDateInput(args.to, "end", args.tz);
  const limit = Math.max(1, Math.min(Number(args.limit) || 10, 50));
  const cityNorm = args.city ? normalizeCity(args.city) : "";
  const region = (args.region || "").trim();

  // Query amplia: type=event y startsAt <= toISO
  // Si Astra no soporta filtros complejos, filtramos el solapamiento en memoria.
  const findQuery: Record<string, unknown> = { type: "event", startsAt: { $lte: toISO } };
  if (region) {
    findQuery.region = region;
  }
  // @ts-ignore Astra cursor options
  const cursor = await col().find(
    findQuery as any,
    { sort: { startsAt: 1 }, limit: limit * 5 } as any
  );
  const rows = Array.isArray(cursor) ? cursor : await (cursor?.toArray?.() ?? []);

  const out = rows
    .filter((r) => {
      if (region && (r.region || "").trim() !== region) return false;
      const startsAt = r.startsAt || r.startDate;
      const endsAt = r.endsAt || r.endDate;
      if (!startsAt) return false;
      const startMs = Date.parse(startsAt);
      const endMs = endsAt ? Date.parse(endsAt) : NaN;
      const fromMs = Date.parse(fromISO);
      const toMs = Date.parse(toISO);
      if (Number.isNaN(startMs) || Number.isNaN(fromMs) || Number.isNaN(toMs)) return false;
      const endsOk = Number.isNaN(endMs) ? true : endMs >= fromMs;
      return startMs <= toMs && endsOk;
    })
    .filter((r) => {
      if (!cityNorm) return true;
      const c = normalizeCity(r.location?.locality || "");
      return c === cityNorm;
    })
    .sort((a, b) => {
      const aStart = Date.parse(a.startsAt || a.startDate || "");
      const bStart = Date.parse(b.startsAt || b.startDate || "");
      return (Number.isNaN(aStart) ? 0 : aStart) - (Number.isNaN(bStart) ? 0 : bStart);
    })
    .slice(0, limit);

  return out;
}
