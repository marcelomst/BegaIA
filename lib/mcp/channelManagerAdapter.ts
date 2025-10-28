import type { UpdateReservationInput } from "./types";
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
} from "./types";
import crypto from "crypto";

/**
 * Mock in-memory. Reemplazar por implementación real (SiteMinder, etc).
 * Para real: leer envs como CM_PROVIDER, CM_API_BASE, CM_API_KEY, etc.
 */
export class InMemoryCMAdapter implements ChannelManagerAdapter {
  private reservations: Map<string, Reservation> = new Map();

  async searchAvailability(q: AvailabilityQuery): Promise<AvailabilityItem[]> {
    // Simulación simple
    const base: AvailabilityItem[] = [
      { roomType: "standard", description: "Hab. Estándar", pricePerNight: 80, currency: "USD", availability: 5 },
      { roomType: "deluxe", description: "Hab. Deluxe", pricePerNight: 120, currency: "USD", availability: 3 },
      { roomType: "suite", description: "Suite Ejecutiva", pricePerNight: 180, currency: "USD", availability: 1 },
    ];
    return q.roomType ? base.filter(b => b.roomType === q.roomType) : base;
  }

  async createReservation(input: CreateReservationInput): Promise<Reservation> {
    const reservationId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const nights = Math.max(1, Math.ceil((Date.parse(input.checkOutDate) - Date.parse(input.checkInDate)) / 86400000));
    const pricePerNight = input.roomType === "suite" ? 180 : input.roomType === "deluxe" ? 120 : 80;
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
    this.reservations.set(reservationId, r);
    return r;
  }

  async cancelReservation(input: CancelReservationInput): Promise<Reservation> {
    const r = this.reservations.get(input.reservationId);
    if (!r || r.hotelId !== input.hotelId) throw new Error("Reservation not found");
    const updated: Reservation = { ...r, status: "cancelled", updatedAt: new Date().toISOString() };
    this.reservations.set(input.reservationId, updated);
    return updated;
  }

  async getReservation(hotelId: string, reservationId: string): Promise<Reservation | null> {
    const r = this.reservations.get(reservationId);
    if (!r || r.hotelId !== hotelId) return null;
    return r;
  }

  async listReservations(q: ListReservationsQuery): Promise<ListReservationsResult> {
    const all = [...this.reservations.values()].filter(r => r.hotelId === q.hotelId);
    const filtered = all.filter(r => (q.status ? r.status === q.status : true));
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return { items, page, pageSize, total: filtered.length };
  }

  async updateReservation(input: UpdateReservationInput): Promise<Reservation> {
    const r = this.reservations.get(input.reservationId);
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
    this.reservations.set(input.reservationId, updated);
    return updated;
  }
}

// Factory para permitir cambiar a SiteMinder u otro CM por env
export function getCMAdapter(): ChannelManagerAdapter {
  const provider = process.env.CM_PROVIDER?.toLowerCase() || "inmemory";
  switch (provider) {
    // case "siteminder":
    //   return new SiteMinderAdapter({ baseUrl: process.env.CM_API_BASE!, apiKey: process.env.CM_API_KEY! });
    default:
      return new InMemoryCMAdapter();
  }
}
