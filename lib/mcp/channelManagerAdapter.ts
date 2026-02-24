// Path: /root/begasist/lib/mcp/channelManagerAdapter.ts
import type {
  ChannelManagerAdapter,
  AvailabilityQuery,
  AvailabilityItem,
  CreateReservationInput,
  Reservation,
  CancelReservationInput,
  ListReservationsQuery,
  ListReservationsResult,
  UpdateReservationInput,
} from "./types";
import crypto from "crypto";

/**
 * Channel Manager provider selection (env):
 * - CM_PROVIDER=inmemory (default): adapter in-memory aislado por hotelId en registry Map.
 * - CM_PROVIDER=redis: reservado para implementación futura; esperado (cuando exista) CM_REDIS_URL.
 * - CM_PROVIDER=real: reservado para integración real; esperados (cuando exista) CM_API_BASE y CM_API_KEY.
 */
export class InMemoryCMAdapter implements ChannelManagerAdapter {
  private stores: Map<string, Map<string, Reservation>> = new Map();

  private getStore(hotelId: string): Map<string, Reservation> {
    const key = normalizeHotelKey(hotelId);
    const existing = this.stores.get(key);
    if (existing) return existing;
    const created = new Map<string, Reservation>();
    this.stores.set(key, created);
    return created;
  }

  async searchAvailability(q: AvailabilityQuery): Promise<AvailabilityItem[]> {
    this.getStore(q.hotelId);
    // Catálogo alineado con roomType canónico usado por el pipeline de reservas.
    const base: AvailabilityItem[] = [
      { roomType: "single", description: "Hab. Single", pricePerNight: 70, currency: "USD", availability: 5 },
      { roomType: "double", description: "Hab. Doble", pricePerNight: 100, currency: "USD", availability: 4 },
      { roomType: "triple", description: "Hab. Triple", pricePerNight: 140, currency: "USD", availability: 2 },
      { roomType: "suite", description: "Suite Ejecutiva", pricePerNight: 180, currency: "USD", availability: 1 },
    ];
    return q.roomType ? base.filter(b => b.roomType === q.roomType) : base;
  }

  async createReservation(input: CreateReservationInput): Promise<Reservation> {
    const store = this.getStore(input.hotelId);
    const reservationId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const nights = Math.max(1, Math.ceil((Date.parse(input.checkOutDate) - Date.parse(input.checkInDate)) / 86400000));
    const normalizedRoomType = String(input.roomType || "").toLowerCase();
    const pricePerNight =
      normalizedRoomType === "suite"
        ? 180
        : normalizedRoomType === "triple"
          ? 140
          : normalizedRoomType === "double"
            ? 100
            : 70;
    const currency = "USD";
    const priceTotal = pricePerNight * nights;

    const r: Reservation = {
      reservationId,
      hotelId: input.hotelId,
      roomType: input.roomType,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      status: "confirmed",
      currency,
      priceTotal,
      createdAt,
      updatedAt,
    };
    store.set(reservationId, r);
    return r;
  }

  async cancelReservation(input: CancelReservationInput): Promise<Reservation> {
    const store = this.getStore(input.hotelId);
    const r = store.get(input.reservationId);
    if (!r || r.hotelId !== input.hotelId) throw new Error("Reservation not found");
    const updated: Reservation = { ...r, status: "cancelled", updatedAt: new Date().toISOString() };
    store.set(input.reservationId, updated);
    return updated;
  }

  async getReservation(hotelId: string, reservationId: string): Promise<Reservation | null> {
    const store = this.getStore(hotelId);
    const r = store.get(reservationId);
    if (!r || r.hotelId !== hotelId) return null;
    return r;
  }

  async listReservations(q: ListReservationsQuery): Promise<ListReservationsResult> {
    const store = this.getStore(q.hotelId);
    const all = [...store.values()].filter(r => r.hotelId === q.hotelId);
    const filtered = all.filter(r => (q.status ? r.status === q.status : true));
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return { items, page, pageSize, total: filtered.length };
  }

  async updateReservation(input: UpdateReservationInput): Promise<Reservation> {
    const store = this.getStore(input.hotelId);
    const r = store.get(input.reservationId);
    if (!r || r.hotelId !== input.hotelId) throw new Error("Reservation not found");
    const updated: Reservation = {
      ...r,
      guestName: input.guestName ?? r.guestName,
      guestEmail: input.guestEmail ?? r.guestEmail,
      guestPhone: input.guestPhone ?? r.guestPhone,
      roomType: input.roomType ?? r.roomType,
      checkInDate: input.checkInDate ?? r.checkInDate,
      checkOutDate: input.checkOutDate ?? r.checkOutDate,
      updatedAt: new Date().toISOString(),
    };
    store.set(input.reservationId, updated);
    return updated;
  }
}

const registry = new Map<string, ChannelManagerAdapter>();

function normalizeHotelKey(hotelId?: string): string {
  const key = String(hotelId ?? "").trim();
  return key || "default";
}

function getInMemoryAdapter(hotelId?: string): ChannelManagerAdapter {
  const key = normalizeHotelKey(hotelId);
  const existing = registry.get(key);
  if (existing) return existing;
  const created = new InMemoryCMAdapter();
  registry.set(key, created);
  return created;
}

function resolveCMProvider(): "inmemory" | "redis" | "real" {
  const rawProvider = String(process.env.CM_PROVIDER ?? "").trim().toLowerCase();
  if (rawProvider === "redis" || rawProvider === "real" || rawProvider === "inmemory") {
    return rawProvider;
  }
  return "inmemory";
}

export function getCMProvider(): string {
  return resolveCMProvider();
}

// Factory para permitir cambiar a SiteMinder u otro CM por env
export function getCMAdapter(hotelId?: string): ChannelManagerAdapter {
  const provider = resolveCMProvider();
  switch (provider) {
    case "inmemory":
      return getInMemoryAdapter(hotelId);
    case "redis":
      throw new Error(
        "CM_PROVIDER=redis is not implemented yet. Configure CM_PROVIDER=inmemory or provide a Redis-backed adapter."
      );
    case "real":
      throw new Error(
        "CM_PROVIDER=real is not implemented yet. Missing real Channel Manager adapter/configuration."
      );
    // case "siteminder":
    //   return new SiteMinderAdapter({ baseUrl: process.env.CM_API_BASE!, apiKey: process.env.CM_API_KEY! });
    default:
      // Valor desconocido: fallback no disruptivo para dev/test.
      return getInMemoryAdapter(hotelId);
  }
}
