// Path: test/frontend/adminLayout.brandIdentity.spec.tsx
// @vitest-environment jsdom
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminLayout from "@/app/admin/layout";

const mocks = vi.hoisted(() => ({
  fetchWithAuth: vi.fn(),
  getDictionary: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, priority: _priority, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

vi.mock("@/components/ui/ThemeToggle", () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

vi.mock("@/lib/client/fetchWithAuth", () => ({
  fetchWithAuth: mocks.fetchWithAuth,
}));

vi.mock("@/lib/i18n/getDictionary", () => ({
  getDictionary: mocks.getDictionary,
}));

describe("AdminLayout brand identity", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    mocks.fetchWithAuth.mockReset();
    mocks.getDictionary.mockReset();
    mocks.fetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        email: "demo@hotel.com",
        hotelId: "hotel999",
        hotelName: "Hotel Demo",
        defaultLanguage: "es",
        roleLevel: 20,
      }),
    });
    mocks.getDictionary.mockResolvedValue({
      layout: {
        panelTitle: "Panel de Control",
        home: "Inicio",
        channels: "Canales",
        hotels: "Hoteles",
        prompts: "Prompts",
        embeddings: "Embeddings",
        logs: "Logs",
        changePassword: "Cambiar contraseña",
        hideSidebar: "Ocultar sidebar",
        showSidebar: "Mostrar sidebar",
        checkingSession: "Verificando sesión...",
      },
    });
  });

  it("renderiza identidad global BegaIA con símbolo oficial en el shell Admin", async () => {
    const { container } = render(
      <AdminLayout>
        <main>Contenido admin</main>
      </AdminLayout>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "BegaIA" })).toBeInTheDocument();
    });

    expect(screen.getByText("Panel de Control")).toBeInTheDocument();
    expect(container.querySelector('img[src="/brand/begaia-monocromatico-blanco-1024.png"]')).toBeInTheDocument();
    expect(container.querySelector('img[src="/brand/begaia-monocromatico-blanco-1024.png"]')).toHaveAttribute(
      "src",
      "/brand/begaia-monocromatico-blanco-1024.png",
    );
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Contenido admin")).toBeInTheDocument();
  });
});
