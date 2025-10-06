import { describe, it, expect } from "vitest";
import { firstNameOf, normalizeNameCase } from "@/lib/agents/helpers";

describe("firstNameOf", () => {
    it("extrae el nombre de pila y remueve honoríficos comunes", () => {
        expect(firstNameOf("Sr. Juan Pérez"))
            .toBe("Juan");
        expect(firstNameOf("Sra. Lucia Gómez"))
            .toBe("Lucia");
        expect(firstNameOf("Mr. John Doe"))
            .toBe("John");
        // "Ana Maria" se considera compuesto común → mantener ambos
        expect(firstNameOf("Dra. Ana Maria Gomes"))
            .toBe("Ana Maria");
        expect(firstNameOf("Doña Sofía de la Torre"))
            .toBe("Sofía");
    });

    it("normaliza mayúsculas/minúsculas y toma el primer token cuando hay compuesto", () => {
        // Por heurística compuesta, debería devolver "María José"
        expect(firstNameOf("maría josé lópez")).toBe("María José");
        expect(firstNameOf("  dr.   pedro   alonso  ")).toBe("Pedro");
    });

    it("maneja conectores (del/da/do) y guiones en nombres compuestos", () => {
        expect(firstNameOf("María del Carmen Ruiz")).toBe("María del Carmen");
        // 'da' no se considera conector para compuesto → retorna solo el primero
        expect(firstNameOf("Maria da Silva" as any)).toBe("Maria");
        expect(firstNameOf("Ana-Paula Souza")).toBe("Ana-Paula");
    });

    it("retorna string vacío si no hay nombre válido", () => {
        expect(firstNameOf("")).toBe("");
        expect(firstNameOf(undefined as unknown as string)).toBe("");
    });
});
