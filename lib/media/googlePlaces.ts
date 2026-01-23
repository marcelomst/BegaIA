export type GooglePlace = {
  name: string;
  description?: string;
  placeId?: string;
  mapsUrl?: string;
  photoName?: string;
};

type PlacesResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    primaryTypeDisplayName?: { text?: string };
    shortFormattedAddress?: string;
    formattedAddress?: string;
    googleMapsUri?: string;
    photos?: Array<{ name?: string }>;
  }>;
};

const PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_RESULTS = 20;

function toNumber(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function mapPlacesResponse(data: PlacesResponse): GooglePlace[] {
  const items = Array.isArray(data?.places) ? data.places : [];
  return items
    .map((p) => {
      const name = (p.displayName?.text || "").trim();
      if (!name) return null;
      const description =
        (p.primaryTypeDisplayName?.text || "").trim() ||
        (p.shortFormattedAddress || "").trim() ||
        (p.formattedAddress || "").trim() ||
        undefined;
      const photoName = p.photos?.[0]?.name;
      return {
        name,
        description,
        placeId: p.id,
        mapsUrl: p.googleMapsUri,
        photoName,
      } as GooglePlace;
    })
    .filter(Boolean) as GooglePlace[];
}

export function buildPlacePhotoUrl(
  photoName: string,
  opts?: { maxWidthPx?: number; maxHeightPx?: number }
): string {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !photoName) return "";
  const maxWidthPx = Math.max(1, Math.min(opts?.maxWidthPx ?? 1200, 4096));
  const maxHeightPx = Math.max(1, Math.min(opts?.maxHeightPx ?? 800, 4096));
  const params = new URLSearchParams({
    key: apiKey,
    maxWidthPx: String(maxWidthPx),
    maxHeightPx: String(maxHeightPx),
  });
  return `https://places.googleapis.com/v1/${photoName}/media?${params.toString()}`;
}

export async function searchNearbyPlaces(args: {
  queryText: string;
  locationText?: string;
  lang?: "es" | "en" | "pt";
  count?: number;
}): Promise<GooglePlace[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (process.env.DEBUG_NEARBY_POINTS === "1") {
    debugLog("[googlePlaces] api key present", { hasKey: Boolean(apiKey) });
  }
  if (!apiKey) return [];

  const count = Math.max(
    1,
    Math.min(
      args.count ?? toNumber(process.env.GOOGLE_PLACES_MAX_RESULTS, DEFAULT_MAX_RESULTS),
      DEFAULT_MAX_RESULTS
    )
  );
  const locationText = (args.locationText || "").trim();
  const queryText = (args.queryText || "").trim();
  const queryHasLocation =
    locationText &&
    queryText.toLowerCase().includes(locationText.toLowerCase());
  const textQuery = `${queryText}${locationText && !queryHasLocation ? ` ${locationText}` : ""}`.trim();
  if (!textQuery) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(PLACES_TEXT_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.primaryTypeDisplayName",
          "places.shortFormattedAddress",
          "places.formattedAddress",
          "places.googleMapsUri",
          "places.photos",
        ].join(","),
      },
      body: JSON.stringify({
        textQuery,
        languageCode: args.lang,
        maxResultCount: count,
        // Sin locationBias porque no hay lat/lng disponibles en este Hito.
      }),
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as PlacesResponse;
    return mapPlacesResponse(data).slice(0, count);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
import { debugLog } from "@/lib/utils/debugLog";
