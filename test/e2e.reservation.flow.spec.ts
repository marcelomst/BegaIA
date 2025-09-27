import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/convState", () => ({ getConvState: vi.fn(), upsertConvState: vi.fn() }));
vi.mock("@/lib/agents/reservations", () => ({ fillSlotsWithLLM: vi.fn(), askAvailability: vi.fn(), confirmAndCreate: vi.fn() }));

import { agentGraph } from "@/lib/agents/graph";
import { getConvState, upsertConvState } from "@/lib/db/convState";
import { fillSlotsWithLLM, askAvailability, confirmAndCreate } from "@/lib/agents/reservations";

const hotelId = "hotel999";
const conversationId = "conv-e2e-1";

// Minimal happy path: name -> room -> dates -> guests -> availability -> confirm

describe("e2e reservation flow (single-slot Q, guests and checkout mapping)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getConvState as any).mockResolvedValue(null);
    });

    it("collects slots turn by turn and confirms, localizing roomType in ES", async () => {
        // 1) name only
        (fillSlotsWithLLM as any).mockResolvedValueOnce({ need: "question", partial: { guestName: "Marcelo Martinez", locale: "es" }, question: "¿Cuál es el tipo de habitación que preferís?" });
        let res = await agentGraph.invoke({ normalizedMessage: "Marcelo Martinez", detectedLanguage: "es", hotelId, conversationId, reservationSlots: {} });
        expect(String(res.messages?.[0]?.content)).toMatch(/habitación/);

        // 2) room type only
        ; (fillSlotsWithLLM as any).mockResolvedValueOnce({ need: "question", partial: { guestName: "Marcelo Martinez", roomType: "double", locale: "es" }, question: "¿Cuál es la fecha de check-in?" });
        res = await agentGraph.invoke({ normalizedMessage: "doble", detectedLanguage: "es", hotelId, conversationId, reservationSlots: { guestName: "Marcelo Martinez" } });
        expect(String(res.messages?.[0]?.content)).toMatch(/check-in/);

        // 3) single date: check-in
        ; (fillSlotsWithLLM as any).mockResolvedValueOnce({ need: "question", partial: { guestName: "Marcelo Martinez", roomType: "double", checkIn: "2025-10-02", locale: "es" }, question: "¿Cuál es la fecha de check-out?" });
        res = await agentGraph.invoke({ normalizedMessage: "02/10/2025", detectedLanguage: "es", hotelId, conversationId, reservationSlots: { guestName: "Marcelo Martinez", roomType: "doble" } });
        expect(String(res.messages?.[0]?.content)).toMatch(/check-out/);

        // 4) single date reply mapped to checkOut by graph signals
        ; (fillSlotsWithLLM as any).mockResolvedValueOnce({ need: "question", partial: { guestName: "Marcelo Martinez", roomType: "double", checkIn: "2025-10-02", checkOut: "2025-10-04", locale: "es" }, question: "¿Cuántos huéspedes se alojarán?" });
        res = await agentGraph.invoke({ normalizedMessage: "04/10/2025", detectedLanguage: "es", hotelId, conversationId, reservationSlots: { guestName: "Marcelo Martinez", roomType: "doble", checkIn: "2025-10-02" } });
        expect(String(res.messages?.[0]?.content)).toMatch(/huéspedes/);

        // 5) numeric guests reply consolidated by graph
        ; (fillSlotsWithLLM as any).mockResolvedValueOnce({ need: "none", slots: { guestName: "Marcelo Martinez", roomType: "double", numGuests: 2, checkIn: "2025-10-02", checkOut: "2025-10-04", locale: "es" } });
        ; (askAvailability as any).mockResolvedValueOnce({ ok: true, available: true, proposal: "Tengo double disponible. Tarifa por noche: 100 USD.", options: [{ roomType: "double", pricePerNight: 100, currency: "USD" }] });
        res = await agentGraph.invoke({ normalizedMessage: "2", detectedLanguage: "es", hotelId, conversationId, reservationSlots: { guestName: "Marcelo Martinez", roomType: "doble", checkIn: "2025-10-02", checkOut: "2025-10-04" } });
        expect(String(res.messages?.[0]?.content)).toMatch(/CONFIRMAR/);

        // 6) confirm
        ; (getConvState as any).mockResolvedValueOnce({ _id: `${hotelId}:${conversationId}`, hotelId, conversationId, reservationSlots: { guestName: "Marcelo Martinez", roomType: "double", checkIn: "2025-10-02", checkOut: "2025-10-04", numGuests: "2", locale: "es" } });
        ; (confirmAndCreate as any).mockResolvedValueOnce({ ok: true, reservationId: "mock-211075", message: "✅ Reserva creada. ID: mock-211075" });
        res = await agentGraph.invoke({ normalizedMessage: "CONFIRMAR", detectedLanguage: "es", hotelId, conversationId, reservationSlots: {} });
        const text = String(res.messages?.[0]?.content);
        expect(text).toMatch(/Reserva confirmada/);
        expect(text).toMatch(/Habitación \*\*doble\*\*/);
    });
});
