// Path: /root/begasist/lib/mcp/types.ts
export type MCPAction = "describe" | "call";

export type MCPFunctionSpec = {
  name: string;
  description: string;
  parameters: Record<string, string | { type: string; required?: boolean; enum?: string[] }>;
  returns: string | Record<string, unknown> | Array<unknown>;
};

export type AvailabilityQuery = {
  hotelId: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  guests?: number;
  roomType?: string;
};

export type AvailabilityItem = {
  roomType: string;
  description?: string;
  pricePerNight: number;
  currency: string;
  availability: number;
};

export type CreateReservationInput = {
  hotelId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  roomType: string;
  checkInDate: string;  // ISO
  checkOutDate: string; // ISO
  notes?: string;
};

export type Reservation = {
  reservationId: string;
  hotelId: string;
  roomType: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkInDate: string;
  checkOutDate: string;
  status: "confirmed" | "cancelled" | "pending";
  currency: string;
  priceTotal?: number;
  createdAt: string;
  updatedAt: string;
};

export type CancelReservationInput = {
  hotelId: string;
  reservationId: string;
  reason?: string;
};

export type ListReservationsQuery = {
  hotelId: string;
  from?: string; // ISO
  to?: string;   // ISO
  status?: "confirmed" | "cancelled" | "pending";
  page?: number;
  pageSize?: number;
};

export type ListReservationsResult = {
  items: Reservation[];
  page: number;
  pageSize: number;
  total: number;
};

// NUEVO: Update Reservation
export type UpdateReservationInput = {
  hotelId: string;
  reservationId: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  roomType?: string;
  checkInDate?: string;
  checkOutDate?: string;
  notes?: string;
};

export type UpdateReservationOutput = {
  ok: boolean;
  reservation?: Reservation;
  error?: string;
};

export interface ChannelManagerAdapter {
  searchAvailability(q: AvailabilityQuery): Promise<AvailabilityItem[]>;
  createReservation(input: CreateReservationInput): Promise<Reservation>;
  cancelReservation(input: CancelReservationInput): Promise<Reservation>;
  getReservation(hotelId: string, reservationId: string): Promise<Reservation | null>;
  listReservations(q: ListReservationsQuery): Promise<ListReservationsResult>;
  updateReservation(input: UpdateReservationInput): Promise<Reservation>;
}
