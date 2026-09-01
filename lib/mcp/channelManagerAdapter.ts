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
  QuoteReservationModificationInput,
  ReservationModificationQuote,
} from "./types";
import crypto from "crypto";
import {
  deleteDemoChannelManagerReservationsForHotel,
  getDemoChannelManagerReservation,
  listDemoChannelManagerReservations,
  saveDemoChannelManagerReservation,
} from "@/lib/db/demoChannelManagerReservations";

export type DemoInventoryRoomSnapshot = {
  roomType: string;
  description: string;
  stock: number;
  maxGuests: number;
  activeReservationsCount: number;
  activeReservationIds: string[];
  availableUnitsFromActiveReservations: number;
};

export type DemoInventorySearchRoomDebug = {
  roomType: string;
  description: string;
  stock: number;
  matchesRoomTypeFilter: boolean;
  matchesGuestCapacity: boolean;
  overlappingReservationsCount: number;
  overlappingReservationIds: string[];
  stayPressure: number;
  computedAvailability: number;
  returnedBySearch: boolean;
};

export type DemoInventorySnapshot = {
  provider: "astra-demo";
  hotelId: string;
  hotelKey: string;
  sharedByHotelId: true;
  totals: {
    totalReservations: number;
    activeReservations: number;
    cancelledReservations: number;
  };
  roomTypes: DemoInventoryRoomSnapshot[];
  activeReservations: Reservation[];
  cancelledReservations: Reservation[];
  searchDebug?: {
    query: {
      startDate: string;
      endDate: string;
      roomType?: string;
      guests?: number;
    };
    returnedOptions: AvailabilityItem[];
    rooms: DemoInventorySearchRoomDebug[];
  };
};

export class DurableDemoCMAdapter implements ChannelManagerAdapter {
  async searchAvailability(q: AvailabilityQuery): Promise<AvailabilityItem[]> {
    const reservations = await listDemoChannelManagerReservations(q.hotelId);
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
        const overlappingReservations = reservations.filter(
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
    const reservationId = await buildHumanReservationId(input.hotelId);
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
    return saveDemoChannelManagerReservation(r);
  }

  async cancelReservation(input: CancelReservationInput): Promise<Reservation> {
    const r = await getDemoChannelManagerReservation(input.hotelId, input.reservationId);
    if (!r) throw new Error("Reservation not found");
    const updated: Reservation = { ...r, status: "cancelled", updatedAt: new Date().toISOString() };
    return saveDemoChannelManagerReservation(updated);
  }

  async getReservation(hotelId: string, reservationId: string): Promise<Reservation | null> {
    return getDemoChannelManagerReservation(hotelId, reservationId);
  }

  async listReservations(q: ListReservationsQuery): Promise<ListReservationsResult> {
    const all = await listDemoChannelManagerReservations(q.hotelId);
    const filtered = all.filter(r => (q.status ? r.status === q.status : true));
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return { items, page, pageSize, total: filtered.length };
  }

  async updateReservation(input: UpdateReservationInput): Promise<Reservation> {
    const r = await getDemoChannelManagerReservation(input.hotelId, input.reservationId);
    if (!r) throw new Error("Reservation not found");
    if (!input.quoteId || !input.quoteVersion) throw new Error("QUOTE_REQUIRED");
    const quote = await this.quoteReservationModification(input);
    if (!quote.available) throw new Error("QUOTE_UNAVAILABLE");
    if (input.quoteId !== quote.quoteId || input.quoteVersion !== quote.quoteVersion) {
      throw new Error("QUOTE_STALE");
    }
    const updated: Reservation = {
      ...r,
      guestName: input.guestName ?? r.guestName,
      guestEmail: input.guestEmail ?? r.guestEmail,
      guestPhone: input.guestPhone ?? r.guestPhone,
      roomType: input.roomType ?? r.roomType,
      checkInDate: input.checkInDate ?? r.checkInDate,
      checkOutDate: input.checkOutDate ?? r.checkOutDate,
      currency: quote.currency,
      priceTotal: quote.priceTotal,
      updatedAt: new Date().toISOString(),
    };
    return saveDemoChannelManagerReservation(updated);
  }

  async quoteReservationModification(input: QuoteReservationModificationInput): Promise<ReservationModificationQuote> {
    const reservation = await getDemoChannelManagerReservation(input.hotelId, input.reservationId);
    if (!reservation) throw new Error("Reservation not found");
    const patch = {
      roomType: input.roomType ?? reservation.roomType,
      guests: input.guests,
      checkInDate: input.checkInDate ?? reservation.checkInDate,
      checkOutDate: input.checkOutDate ?? reservation.checkOutDate,
    };
    const options = await this.searchAvailability({
      hotelId: input.hotelId,
      roomType: patch.roomType,
      guests: patch.guests,
      startDate: patch.checkInDate,
      endDate: patch.checkOutDate,
    });
    const option = options[0];
    const nights = Math.max(1, Math.ceil((Date.parse(patch.checkOutDate) - Date.parse(patch.checkInDate)) / 86400000));
    const quoteVersion = reservation.updatedAt;
    const priceTotal = (option?.pricePerNight || 0) * nights;
    const quoteId = crypto.createHash("sha256")
      .update(JSON.stringify({ reservationId: reservation.reservationId, quoteVersion, patch, priceTotal }))
      .digest("hex").slice(0, 24);
    return {
      available: Boolean(option), reservationId: reservation.reservationId, patch,
      currency: option?.currency || reservation.currency, priceTotal, pricePerNight: option?.pricePerNight,
      quoteId, quoteVersion,
    };
  }

  async debugSnapshot(hotelId: string): Promise<{ hotelKey: string; reservations: Reservation[] }> {
    return {
      hotelKey: normalizeHotelKey(hotelId),
      reservations: await listDemoChannelManagerReservations(hotelId),
    };
  }

  async resetHotelStore(hotelId: string): Promise<{ hotelKey: string; clearedReservations: number }> {
    return {
      hotelKey: normalizeHotelKey(hotelId),
      clearedReservations: await deleteDemoChannelManagerReservationsForHotel(hotelId),
    };
  }
}

/** @deprecated Use DurableDemoCMAdapter. Kept for import compatibility only. */
export class InMemoryCMAdapter extends DurableDemoCMAdapter {}

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

async function buildHumanReservationId(hotelId: string): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const candidate = `RES-${suffix}`;
    if (!await getDemoChannelManagerReservation(hotelId, candidate)) return candidate;
  }
  return `RES-${Date.now().toString(36).toUpperCase()}`;
}

const registry = new Map<string, ChannelManagerAdapter>();

function normalizeHotelKey(hotelId?: string): string {
  const key = String(hotelId ?? "").trim();
  return key || "default";
}

function getDurableDemoAdapter(hotelId?: string): DurableDemoCMAdapter {
  const key = normalizeHotelKey(hotelId);
  const existing = registry.get(key);
  if (existing instanceof DurableDemoCMAdapter) return existing;
  const created = new DurableDemoCMAdapter();
  registry.set(key, created);
  return created;
}

function getStayPressure(startDate: Date | null, endDate: Date | null): number {
  const nights = startDate && endDate ? getNights(startDate, endDate) : 1;
  return nights >= 14 ? 1 : nights >= 7 ? 0.5 : 0;
}

function buildSearchDebug(
  reservations: Reservation[],
  query: { startDate: string; endDate: string; roomType?: string; guests?: number }
): DemoInventorySnapshot["searchDebug"] {
  const startDate = parseIsoDate(query.startDate);
  const endDate = parseIsoDate(query.endDate);
  const stayPressure = getStayPressure(startDate, endDate);
  const guestCount = typeof query.guests === "number" && query.guests > 0 ? query.guests : undefined;

  const rooms = ROOM_CATALOG.map((room) => {
    const overlappingReservations = reservations.filter(
      (reservation) =>
        reservation.status !== "cancelled" &&
        reservation.roomType === room.roomType &&
        overlaps(startDate, endDate, parseIsoDate(reservation.checkInDate), parseIsoDate(reservation.checkOutDate)),
    );
    const matchesRoomTypeFilter = !query.roomType || room.roomType === query.roomType;
    const matchesGuestCapacity = !guestCount || guestCount <= room.maxGuests;
    const computedAvailability = Math.max(0, Math.floor(room.stock - overlappingReservations.length - stayPressure));

    return {
      roomType: room.roomType,
      description: room.description,
      stock: room.stock,
      matchesRoomTypeFilter,
      matchesGuestCapacity,
      overlappingReservationsCount: overlappingReservations.length,
      overlappingReservationIds: overlappingReservations.map((reservation) => reservation.reservationId),
      stayPressure,
      computedAvailability,
      returnedBySearch: matchesRoomTypeFilter && matchesGuestCapacity && computedAvailability > 0,
    } satisfies DemoInventorySearchRoomDebug;
  });

  const returnedOptions = rooms
    .filter((room) => room.returnedBySearch)
    .map((room) => {
      const base = ROOM_CATALOG.find((entry) => entry.roomType === room.roomType);
      const pricePerNight = Math.round(
        (base?.basePrice ?? 70) *
          getSeasonalMultiplier(startDate, endDate) *
          (touchesWeekend(startDate, endDate) ? 1.15 : 1),
      );
      return {
        roomType: room.roomType,
        description: room.description,
        pricePerNight,
        currency: "USD",
        availability: room.computedAvailability,
      } satisfies AvailabilityItem;
    });

  return {
    query,
    returnedOptions,
    rooms,
  };
}

export function getCMProvider(): string {
  return "astra-demo";
}

export function getCMAdapter(hotelId?: string): ChannelManagerAdapter {
  return getDurableDemoAdapter(hotelId);
}

export async function inspectDemoInventory(
  hotelId: string,
  query?: { startDate?: string; endDate?: string; roomType?: string; guests?: number }
): Promise<DemoInventorySnapshot> {
  const adapter = getDurableDemoAdapter(hotelId);
  const { hotelKey, reservations } = await adapter.debugSnapshot(hotelId);
  const activeReservations = reservations.filter((reservation) => reservation.status !== "cancelled");
  const cancelledReservations = reservations.filter((reservation) => reservation.status === "cancelled");

  const roomTypes = ROOM_CATALOG.map((room) => {
    const activeForRoom = activeReservations.filter((reservation) => reservation.roomType === room.roomType);
    return {
      roomType: room.roomType,
      description: room.description,
      stock: room.stock,
      maxGuests: room.maxGuests,
      activeReservationsCount: activeForRoom.length,
      activeReservationIds: activeForRoom.map((reservation) => reservation.reservationId),
      availableUnitsFromActiveReservations: Math.max(0, room.stock - activeForRoom.length),
    } satisfies DemoInventoryRoomSnapshot;
  });

  const searchDebug =
    query?.startDate && query?.endDate
      ? buildSearchDebug(activeReservations, {
          startDate: query.startDate,
          endDate: query.endDate,
          roomType: query.roomType,
          guests: query.guests,
        })
      : undefined;

  return {
    provider: "astra-demo",
    hotelId,
    hotelKey,
    sharedByHotelId: true,
    totals: {
      totalReservations: reservations.length,
      activeReservations: activeReservations.length,
      cancelledReservations: cancelledReservations.length,
    },
    roomTypes,
    activeReservations,
    cancelledReservations,
    searchDebug,
  };
}

export async function resetDemoInventory(hotelId: string): Promise<{ hotelId: string; hotelKey: string; clearedReservations: number }> {
  const adapter = getDurableDemoAdapter(hotelId);
  const { hotelKey, clearedReservations } = await adapter.resetHotelStore(hotelId);
  return {
    hotelId,
    hotelKey,
    clearedReservations,
  };
}
