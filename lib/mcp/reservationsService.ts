// Path: /root/begasist/lib/mcp/reservationsService.ts
import type {
  MCPFunctionSpec,
  AvailabilityQuery,
  CreateReservationInput,
  CancelReservationInput,
  ListReservationsQuery,
} from "./types";
import { getCMAdapter } from "./channelManagerAdapter";

export function getReservationsCapabilities() {
  const base: MCPFunctionSpec[] = [
    {
      name: "searchAvailability",
      description: "Lista disponibilidad y tarifas por tipo de habitación en un rango de fechas",
      parameters: {
        hotelId: "string",
        startDate: "ISO string",
        endDate: "ISO string",
        guests: { type: "number", required: false },
        roomType: { type: "string", required: false },
      },
      returns: "[AvailabilityItem]",
    },
    {
      name: "createReservation",
      description: "Crea una reserva",
      parameters: {
        hotelId: "string",
        guestName: "string",
        guestEmail: { type: "string", required: false },
        guestPhone: { type: "string", required: false },
        roomType: "string",
        checkInDate: "ISO string",
        checkOutDate: "ISO string",
        notes: { type: "string", required: false },
      },
      returns: "Reservation",
    },
    {
      name: "cancelReservation",
      description: "Cancela una reserva existente",
      parameters: {
        hotelId: "string",
        reservationId: "string",
        reason: { type: "string", required: false },
      },
      returns: "Reservation",
    },
    {
      name: "getReservation",
      description: "Obtiene una reserva por ID",
      parameters: {
        hotelId: "string",
        reservationId: "string",
      },
      returns: "Reservation | null",
    },
    {
      name: "listReservations",
      description: "Lista reservas con filtros y paginación",
      parameters: {
        hotelId: "string",
        from: { type: "ISO string", required: false },
        to: { type: "ISO string", required: false },
        status: { type: "string", required: false },
        page: { type: "number", required: false },
        pageSize: { type: "number", required: false },
      },
      returns: "ListReservationsResult",
    },
  ];

  return {
    name: "hotel-assistant-mcp",
    version: "0.1.0",
    description: "MCP de gestión de reservas conectado a Channel Manager",
    functions: base,
  };
}

export async function handleMcpCall(name: string, params: any) {
  const cm = getCMAdapter();

  switch (name) {
    case "searchAvailability": {
      const p: AvailabilityQuery = ensure(params, ["hotelId", "startDate", "endDate"]);
      return cm.searchAvailability(p);
    }
    case "createReservation": {
      const p: CreateReservationInput = ensure(params, [
        "hotelId",
        "guestName",
        "roomType",
        "checkInDate",
        "checkOutDate",
      ]);
      return cm.createReservation(p);
    }
    case "cancelReservation": {
      const p: CancelReservationInput = ensure(params, ["hotelId", "reservationId"]);
      return cm.cancelReservation(p);
    }
    case "getReservation": {
      const { hotelId, reservationId } = ensure(params, ["hotelId", "reservationId"]);
      return cm.getReservation(hotelId, reservationId);
    }
    case "listReservations": {
      const p: ListReservationsQuery = ensure(params, ["hotelId"], true);
      return cm.listReservations(p);
    }
    default:
      throw new Error(`Unknown MCP function: ${name}`);
  }
}

function ensure<T extends Record<string, any>>(obj: any, required: string[], allowPartial = false): T {
  if (!obj || typeof obj !== "object") throw new Error("Invalid parameters");
  if (!allowPartial) {
    for (const k of required) {
      if (obj[k] === undefined || obj[k] === null || obj[k] === "") {
        throw new Error(`Missing parameter: ${k}`);
      }
    }
  }
  return obj as T;
}
