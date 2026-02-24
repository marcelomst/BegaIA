import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockSetEventLocalityById, mockPropagateById } = vi.hoisted(() => ({
  mockSetEventLocalityById: vi.fn(),
  mockPropagateById: vi.fn(),
}));

vi.mock("@/lib/db/poiCurate", () => ({
  setEventLocalityById: mockSetEventLocalityById,
  propagateLocalityById: mockPropagateById,
}));

import { PATCH } from "@/app/api/admin/poi/event/route";
import { POST } from "@/app/api/admin/poi/propagate-locality/route";

describe("admin POI routes", () => {
  beforeEach(() => {
    mockSetEventLocalityById.mockReset();
    mockPropagateById.mockReset();
    process.env.ADMIN_API_KEY = "secret";
  });

  it("PATCH /api/admin/poi/event devuelve 404 si no existe el POI", async () => {
    mockSetEventLocalityById.mockResolvedValueOnce({ ok: true, matched: 0, updated: 0 });
    const req = new NextRequest("http://localhost/api/admin/poi/event", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-admin-key": "secret",
        "x-hotel-id": "system",
      },
      body: JSON.stringify({ id: "missing", locality: "Maldonado" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: "POI not found", id: "missing" });
  });

  it("POST /api/admin/poi/propagate-locality devuelve 404 si no existe el POI base", async () => {
    mockPropagateById.mockResolvedValueOnce({ ok: true, matched: 0, updated: 0 });
    const req = new NextRequest("http://localhost/api/admin/poi/propagate-locality", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-key": "secret",
        "x-hotel-id": "system",
      },
      body: JSON.stringify({ id: "missing", locality: "Maldonado" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: "POI not found", id: "missing" });
  });
});
