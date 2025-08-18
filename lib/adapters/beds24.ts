// Path: /root/begasist/lib/adapters/beds24.ts
/* Beds24 JSON API adapter (MVP)
   - Auth: apiKey + propKey
   - Base: https://www.beds24.com/api/json/
   - Métodos: getBookings, getBookingById
*/

export interface Beds24Config {
  apiKey: string;
  propKey: string;
  baseUrl?: string; // override opcional
}

export interface Beds24Booking {
  bookId: number;
  status?: string;         // e.g. confirmed, cancelled
  firstname?: string;
  lastname?: string;
  email?: string;
  arrival?: string;        // YYYY-MM-DD
  departure?: string;      // YYYY-MM-DD
  roomId?: number;
  lastModified?: string;   // ISO
  // agrega campos que uses
}

export type GetBookingsParams = Partial<{
  modifiedSince: string;
  arrivalFrom: string;
  arrivalTo: string;
  departureFrom: string;
  departureTo: string;
  bookId: number;
  roomId: number;
  limit: number;
  offset: number;
}>;

export class Beds24Client {
  private apiKey: string;
  private propKey: string;
  private baseUrl: string;

  constructor(cfg: Beds24Config) {
    this.apiKey = cfg.apiKey;
    this.propKey = cfg.propKey;
    this.baseUrl = (cfg.baseUrl ?? "https://www.beds24.com/api/json").replace(/\/+$/, "");
    if (!this.apiKey || !this.propKey) throw new Error("Missing BEDS24_API_KEY or BEDS24_PROP_KEY");
  }

  private async post<T>(path: string, payload: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: this.apiKey, propKey: this.propKey, ...payload }),
    });
    if (!res.ok) throw new Error(`Beds24 HTTP ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async getBookings(params: GetBookingsParams = {}): Promise<Beds24Booking[]> {
    const allowed: (keyof GetBookingsParams)[] = [
      "modifiedSince","arrivalFrom","arrivalTo","departureFrom",
      "departureTo","bookId","roomId","limit","offset",
    ];
    const body: Record<string, unknown> = {};
    for (const k of allowed) {
      const v = params[k];
      if (v !== undefined && v !== null && v !== "") body[k] = v;
    }
    const data = await this.post<any>("getBookings", body);
    const rows: Beds24Booking[] = Array.isArray(data?.bookings) ? data.bookings : Array.isArray(data) ? data : [];
    return rows;
  }

  async getBookingById(bookId: number): Promise<Beds24Booking | null> {
    const list = await this.getBookings({ bookId, limit: 1 });
    return list[0] ?? null;
  }
}

export function makeBeds24FromEnv(): Beds24Client {
  return new Beds24Client({
    apiKey: process.env.BEDS24_API_KEY!,
    propKey: process.env.BEDS24_PROP_KEY!,
  });
}
