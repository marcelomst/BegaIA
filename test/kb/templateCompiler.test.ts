// Path: /root/begasist/test/kb/templateCompiler.test.ts

import { describe, it, expect } from "vitest";
import { compileTemplate } from "@/lib/kb/templateCompiler";

const ctx = {
    hotelConfig: {} as any,
    categoryId: "contacts",
    lang: "es",
};

describe("templateCompiler – Fase B", () => {
    it("compila Teléfono → contacts.phone", () => {
        const src = "Teléfono: +598 1234 5678";
        const out = compileTemplate(src, ctx);

        expect(out.text).toBe(
            "Teléfono: [[key: contacts.phone | default: +598 1234 5678]]"
        );
        expect(out.warnings).toEqual([]);
    });

    it("compila Teléfono fijo → contacts.landline", () => {
        const src = "- Teléfono fijo: 123456";
        const out = compileTemplate(src, ctx);

        expect(out.text).toBe(
            "- Teléfono fijo: [[key: contacts.landline | default: 123456]]"
        );
    });

    it("compila Whatsapp → contacts.whatsapp", () => {
        const src = "* Whatsapp: +598 99 111 222";
        const out = compileTemplate(src, ctx);

        expect(out.text).toBe(
            "* Whatsapp: [[key: contacts.whatsapp | default: +598 99 111 222]]"
        );
    });

    it("no toca líneas sin patrón label: valor", () => {
        const src = "Check-in desde las 14:00.";
        const out = compileTemplate(src, ctx);
        expect(out.text).toBe(src);
    });

    it("no toca líneas que ya contienen tokens [[key: ...]]", () => {
        const src =
            "Teléfono: [[key: contacts.phone | default: +598 1234 5678]]";
        const out = compileTemplate(src, ctx);
        expect(out.text).toBe(src);
        expect(out.warnings).toEqual([]);
    });

    it("emite warning cuando la etiqueta no se reconoce", () => {
        const src = "Algo raro: valor";
        const out = compileTemplate(src, ctx);

        expect(out.text).toBe(src);
        expect(out.warnings.length).toBe(1);
        expect(out.warnings[0]).toMatch(/No se reconoce la etiqueta/);
    });

    it("emite warning si la key derivada no está en knownKeys", () => {
        const src = "Teléfono: 123";
        const out = compileTemplate(src, ctx, { knownKeys: [] });

        expect(out.text).toBe(
            "Teléfono: [[key: contacts.phone | default: 123]]"
        );
        expect(out.warnings.some((w) => w.includes("no figura en knownKeys"))).toBe(
            true
        );
    });

    it("escapa secuencias de cierre de token en default", () => {
        const src = "Email: test]]@example.com";
        const out = compileTemplate(src, ctx);

        expect(out.text).toContain("\\]\\]");
    });
});
