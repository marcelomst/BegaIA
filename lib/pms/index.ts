export type ReservationStatus = "confirmed" | "cancelled";

export interface Reservation {
  guest: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  status: ReservationStatus;
}

export class PMS {
  private reservations: Record<string, Reservation> = {}; // 🔥 Reemplazamos `any` por `Reservation`

  createReservation(guest: string, roomType: string, checkIn: string, checkOut: string): Reservation & { id: string } {
    const id = `res-${Date.now()}`;
    this.reservations[id] = { guest, roomType, checkIn, checkOut, status: "confirmed" };
    return { id, ...this.reservations[id] };
  }

  getReservation(id: string): Reservation | null {
    return this.reservations[id] || null;
  }

  cancelReservation(id: string): Reservation | null {
    if (this.reservations[id]) {
      this.reservations[id].status = "cancelled";
      return this.reservations[id];
    }
    return null;
  }
}

export const pms = new PMS();
