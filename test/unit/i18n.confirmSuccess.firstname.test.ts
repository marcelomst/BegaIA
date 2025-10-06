import { describe, it, expect } from "vitest";
import es from "@/lib/i18n/es";
import en from "@/lib/i18n/en";
import pt from "@/lib/i18n/pt";

describe("i18n reservation.confirmSuccess first-name addressing", () => {
    const created = { reservationId: "R-1" };
    const slots = {
        guestName: "María José López",
        roomType: "double",
        checkIn: "2025-10-10",
        checkOut: "2025-10-12",
        numGuests: "2",
    } as const;

    it("ES usa el nombre de pila", () => {
        const msg = es.reservation.confirmSuccess(created, slots);
        expect(msg).toMatch(/¡Gracias, María!/);
    });

    it("EN uses first name", () => {
        const msg = (en as any).reservation.confirmSuccess(created, slots);
        expect(msg).toMatch(/Thank you, María!/);
    });

    it("PT usa o primeiro nome", () => {
        const msg = (pt as any).reservation.confirmSuccess(created, slots);
        expect(msg).toMatch(/Obrigado, María!/);
    });
});
