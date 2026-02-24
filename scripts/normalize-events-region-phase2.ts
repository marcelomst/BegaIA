import { getAstraDB } from "../lib/astra/connection";

type HotelDoc = Record<string, any>;
type PoiDoc = Record<string, any>;

const DEFAULT_REGION = "maldonado_uy";
const DEFAULT_PROVIDER = "places";
const TARGET_HOTELS = ["hotel999", "system"];

function hasValue(v: unknown): boolean {
  return typeof v === "string" ? v.trim().length > 0 : v != null;
}

async function normalizeHotels(apply: boolean) {
  const hotels = getAstraDB().collection<HotelDoc>("hotel_config");
  const report: Array<Record<string, unknown>> = [];

  for (const hotelId of TARGET_HOTELS) {
    const doc = await hotels.findOne({ hotelId } as any);
    if (!doc) {
      report.push({ hotelId, status: "not_found" });
      continue;
    }

    const currentRegion = String(doc.eventsRegion || "").trim();
    const currentProvider = String(doc.globalEventsProvider || "").trim();
    const hasCustom = hasValue(doc.customEventsSource);

    const nextRegion = currentRegion || DEFAULT_REGION;
    const nextProvider = currentProvider || DEFAULT_PROVIDER;

    const willSet = currentRegion !== nextRegion || currentProvider !== nextProvider;
    const willUnsetCustom = hasCustom;

    if (apply && (willSet || willUnsetCustom)) {
      const update: any = {};
      if (willSet) {
        update.$set = {
          ...(update.$set || {}),
          eventsRegion: nextRegion,
          globalEventsProvider: nextProvider,
          lastUpdated: new Date().toISOString(),
        };
      }
      if (willUnsetCustom) {
        update.$unset = { ...(update.$unset || {}), customEventsSource: "" };
      }
      await hotels.updateOne({ hotelId } as any, update);
    }

    report.push({
      hotelId,
      before: {
        eventsRegion: currentRegion || undefined,
        globalEventsProvider: currentProvider || undefined,
        customEventsSource: doc.customEventsSource ?? undefined,
      },
      after: {
        eventsRegion: nextRegion,
        globalEventsProvider: nextProvider,
        customEventsSource: undefined,
      },
      changed: willSet || willUnsetCustom,
    });
  }

  return report;
}

async function backfillPoiRegion(apply: boolean) {
  const poi = getAstraDB().collection<PoiDoc>("poi");
  const cursor = await poi.find({ sourceId: "quehacemoshoy" } as any);
  const rows = Array.isArray(cursor) ? cursor : await (cursor?.toArray?.() ?? []);

  const toFix = rows.filter((r) => String(r.region || "").trim() !== DEFAULT_REGION);
  if (apply) {
    for (const r of toFix) {
      await poi.updateOne(
        { _id: r._id } as any,
        { $set: { region: DEFAULT_REGION } } as any
      );
    }
  }

  return {
    scanned: rows.length,
    toFix: toFix.length,
    fixed: apply ? toFix.length : 0,
    region: DEFAULT_REGION,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const hotels = await normalizeHotels(apply);
  const poi = await backfillPoiRegion(apply);

  console.log("[normalize-events-region-phase2]", {
    mode: apply ? "apply" : "dry-run",
    hotels,
    poi,
  });
}

main().catch((err) => {
  console.error("[normalize-events-region-phase2] error", err);
  process.exit(1);
});
