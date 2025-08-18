// Path: /root/begasist/lib/adapters/beds24_v2.ts
/**
 * Beds24 API V2 adapter (Token-based)
 *
 * Requiere:
 *   - BEDS24_V2_LONG_LIFE_TOKEN=...         (token para header `token`)
 *   - (Opcional) BEDS24_V2_BASE=https://api.beds24.com
 *   - (Opcional) BEDS24_V2_PROPERTY_ID=12345 (filtro por propiedad por defecto)
 *
 * Endpoints típicos:
 *   - GET /v2/bookings?modified_since&property_id&id&limit&offset
 */

export interface Beds24V2Config {
  baseUrl?: string;             // default: https://api.beds24.com
  accessToken?: string;         // Long Life Token
  propertyId?: string | number; // opcional: para filtrar por propiedad
}

export interface Beds24V2Booking {
  id: number;                   // booking id
  status?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  arrival?: string;             // YYYY-MM-DD
  departure?: string;           // YYYY-MM-DD
  roomId?: number | string;
  lastModified?: string;        // ISO
  propertyId?: number | string;
}

export type GetBookingsV2Params = Partial<{
  modified_since: string;       // ISO
  property_id: string | number;
  id: number;                   // booking id
  limit: number;
  offset: number;
}>;

const DEFAULT_BASE = "https://api.beds24.com";
const PATH_BOOKINGS = "/v2/bookings";

export class Beds24V2Client {
  private baseUrl: string;
  private accessToken: string | null;
  private defaultPropertyId?: string | number;

  constructor(cfg: Beds24V2Config = {}) {
    this.baseUrl = (cfg.baseUrl ?? process.env.BEDS24_V2_BASE ?? DEFAULT_BASE).replace(/\/+$/, "");
    this.accessToken = cfg.accessToken ?? process.env.BEDS24_V2_LONG_LIFE_TOKEN ?? null;
    this.defaultPropertyId = cfg.propertyId ?? process.env.BEDS24_V2_PROPERTY_ID ?? undefined;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private ensureToken() {
    if (!this.accessToken) {
      throw new Error(
        "Beds24V2: missing access token. Set BEDS24_V2_LONG_LIFE_TOKEN or call setAccessToken(token)."
      );
    }
  }

  private buildQuery(params?: Record<string, any>) {
    const u = new URL(this.baseUrl + PATH_BOOKINGS);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
      });
    }
    return u.toString();
  }

  private async getJSON<T>(url: string): Promise<T> {
    this.ensureToken();
    const res = await fetch(url, {
      method: "GET",
      headers: {
        // Beds24 V2 usa header `token`, no Authorization: Bearer
        token: String(this.accessToken),
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Beds24 V2 HTTP ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  async getBookings(params: GetBookingsV2Params = {}): Promise<Beds24V2Booking[]> {
    const withDefaults: GetBookingsV2Params = { ...params };
    if (this.defaultPropertyId && withDefaults.property_id === undefined) {
      withDefaults.property_id = this.defaultPropertyId;
    }
    const url = this.buildQuery(withDefaults);
    const data = await this.getJSON<any>(url);

    if (Array.isArray((data as any)?.data)) return (data as any).data as Beds24V2Booking[];
    if (Array.isArray((data as any)?.bookings)) return (data as any).bookings as Beds24V2Booking[];
    if (Array.isArray(data)) return data as Beds24V2Booking[];
    return [];
  }

  async getBookingById(id: number): Promise<Beds24V2Booking | null> {
    const list = await this.getBookings({ id, limit: 1 });
    return list[0] ?? null;
  }
}

export function makeBeds24V2FromEnv(): Beds24V2Client {
  return new Beds24V2Client({});
}
