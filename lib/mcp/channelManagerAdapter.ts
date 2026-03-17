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
    const store = this.getStore(q.hotelId);
    const startDate = parseIsoDate(q.startDate);
    const endDate = parseIsoDate(q.endDate);
    const nights = startDate && endDate ? getNights(startDate, endDate) : 1;
    const seasonalMultiplier = getSeasonalMultiplier(startDate, endDate);
    const weekendMultiplier = touchesWeekend(startDate, endDate) ? 1.15 : 1;
    const guestCount = typeof q.guests === "number" && q.guests > 0 ? q.guests : undefined;

    const items = ROOM_CATALOG
      .filter((room) => !q.roomType || room.roomType === q.roomType)
      .filter((room) => !guestCount || guestCount <= room.maxGuests)
      .map((room) => {
        const overlappingReservations = [...store.values()].filter(
          (reservation) =>
            reservation.status !== "cancelled" &&
            reservation.roomType === room.roomType &&
            overlaps(startDate, endDate, parseIsoDate(reservation.checkInDate), parseIsoDate(reservation.checkOutDate)),
        ).length;

        const stayPressure = nights >= 14 ? 1 : nights >= 7 ? 0.5 : 0;
        const availability = Math.max(0, Math.floor(room.stock - overlappingReservations - stayPressure));
        const pricePerNight = Math.round(room.basePrice * seasonalMultiplier * weekendMultiplier);

        return {
          roomType: room.roomType,
          description: room.description,
          pricePerNight,
          currency: "USD",
          availability,
        } satisfies AvailabilityItem;
      })
      .filter((room) => room.availability > 0);

    return items;
  }

  async createReservation(input: CreateReservationInput): Promise<Reservation> {
    const store = this.getStore(input.hotelId);
    const reservationId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const checkIn = parseIsoDate(input.checkInDate);
    const checkOut = parseIsoDate(input.checkOutDate);
    const nights = checkIn && checkOut ? getNights(checkIn, checkOut) : 1;
    const normalizedRoomType = String(input.roomType || "").toLowerCase();
    const room = ROOM_CATALOG.find((entry) => entry.roomType === normalizedRoomType);
    const pricePerNight = Math.round(
      (room?.basePrice ?? 70) * getSeasonalMultiplier(checkIn, checkOut) * (touchesWeekend(checkIn, checkOut) ? 1.15 : 1),
    );
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

type DemoRoom = {
  roomType: string;
  description: string;
  basePrice: number;
  stock: number;
  maxGuests: number;
};

const ROOM_CATALOG: DemoRoom[] = [
  { roomType: "single", description: "Hab. Single", basePrice: 70, stock: 5, maxGuests: 1 },
  { roomType: "double", description: "Hab. Doble", basePrice: 100, stock: 4, maxGuests: 2 },
  { roomType: "triple", description: "Hab. Triple", basePrice: 140, stock: 2, maxGuests: 3 },
  { roomType: "suite", description: "Suite Ejecutiva", basePrice: 180, stock: 1, maxGuests: 4 },
];

function parseIsoDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getNights(startDate: Date, endDate: Date): number {
  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.ceil(diff / 86400000));
}

function overlaps(
  startA: Date | null,
  endA: Date | null,
  startB: Date | null,
  endB: Date | null,
): boolean {
  if (!startA || !endA || !startB || !endB) return false;
  return startA < endB && startB < endA;
}

function touchesWeekend(startDate: Date | null, endDate: Date | null): boolean {
  if (!startDate || !endDate) return false;
  for (const cursor = new Date(startDate); cursor < endDate; cursor.setDate(cursor.getDate() + 1)) {
    const day = cursor.getDay();
    if (day === 5 || day === 6) return true;
  }
  return false;
}

function getSeasonalMultiplier(startDate: Date | null, endDate: Date | null): number {
  const range = [startDate, endDate].filter(Boolean) as Date[];
  if (!range.length) return 1;
  const hasHighSeasonMonth = range.some((date) => {
    const month = date.getMonth() + 1;
    return month === 12 || month <= 2;
  });
  return hasHighSeasonMonth ? 1.2 : 1;
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

export function getCMProvider(): string {
  return "inmemory";
}

export function getCMAdapter(hotelId?: string): ChannelManagerAdapter {
  return getInMemoryAdapter(hotelId);
}
