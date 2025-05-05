// /root/begasist/test/integration/UserStatus.test.tsx
/// <reference types="vitest" />

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import UserStatus from "@/components/UsertStatus.tsx";
import { UserProvider } from "@/lib/context/UserContext";

// 🔧 Mock de fetchWithAuth
vi.mock("@/lib/client/fetchWithAuth", () => ({
  fetchWithAuth: vi.fn(),
}));

import { fetchWithAuth as fetchWithAuthOriginal } from "@/lib/client/fetchWithAuth";
const fetchWithAuth = fetchWithAuthOriginal as unknown as vi.Mock;

describe("<UserStatus />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra datos del usuario después de cargar", async () => {
    
    fetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        email: "admin@hotel.com",
        hotelId: "hotel123",
        roleLevel: 0,
        userId: "abc123",
      }),
    } as Response);
    

    render(
      <UserProvider>
        <UserStatus />
      </UserProvider>
    );

    expect(screen.getByText(/Cargando usuario/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/admin@hotel\.com/i)).toBeInTheDocument();
      expect(screen.getByText(/hotel123/i)).toBeInTheDocument();
      expect(screen.getByText(/0/)).toBeInTheDocument(); // roleLevel
    });
  });

  it("refresca usuario al hacer clic en el botón", async () => {
    fetchWithAuth
      // primer loadUser
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: "admin@hotel.com",
          hotelId: "hotel123",
          roleLevel: 0,
          userId: "abc123",
        }),
      })
      // segundo loadUser (tras refresh)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: "admin@hotel.com",
          hotelId: "hotel123",
          roleLevel: 1,
          userId: "abc123",
        }),
      });

    render(
      <UserProvider>
        <UserStatus />
      </UserProvider>
    );

    await screen.findByText("admin@hotel.com");
    const btn = screen.getByRole("button", { name: /refrescar/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument(); // nuevo roleLevel
    });
  });
});
