// Path: /home/marcelo/begasist/test/security/p-safe.staff-auth.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hash } from "bcryptjs";

const authState = vi.hoisted(() => ({
  configs: [] as any[],
  accessClaims: [] as any[],
  refreshClaims: [] as any[],
  refreshPayload: null as any,
}));

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getAllHotelConfigs: vi.fn(async () => authState.configs),
  getHotelConfigCollection: vi.fn(() => ({
    findOne: vi.fn(async ({ hotelId }: { hotelId: string }) =>
      authState.configs.find((config) => config.hotelId === hotelId) ?? null),
  })),
}));

vi.mock("@/lib/auth/jwt", () => ({
  signJWT: vi.fn(async (claims: any) => {
    authState.accessClaims.push(claims);
    return "access-token";
  }),
  signRefreshToken: vi.fn(async (claims: any) => {
    authState.refreshClaims.push(claims);
    return "refresh-token";
  }),
  verifyRefreshToken: vi.fn(async () => authState.refreshPayload),
}));

import { POST as findHotels } from "@/app/api/users/hotels-for-user/route";
import { POST as login } from "@/app/api/login/route";
import { GET as refresh } from "@/app/api/refresh/route";

function post(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function refreshRequest(token = "refresh-token"): any {
  return {
    cookies: {
      get: (name: string) => name === "refreshToken" ? { value: token } : undefined,
    },
  };
}

describe("P-SAFE staff JWT authorization boundary", () => {
  beforeEach(async () => {
    authState.accessClaims.length = 0;
    authState.refreshClaims.length = 0;
    authState.refreshPayload = null;
    const authorizedPasswordHash = await hash("correct-password", 4);
    authState.configs = [{
      hotelId: "hotel-a",
      hotelName: "Hotel A",
      users: [{
        userId: "user-a",
        email: "staff@example.com",
        active: true,
        roleLevel: 20,
        passwordHash: authorizedPasswordHash,
      }],
    }, {
      hotelId: "hotel-b",
      hotelName: "Hotel B",
      users: [{
        userId: "user-b",
        email: "other@example.com",
        active: true,
        roleLevel: 10,
        passwordHash: authorizedPasswordHash,
      }],
    }];
  });

  it("rechaza login directo sin contraseña", async () => {
    const response = await login(post("http://localhost/api/login", {
      userId: "user-a",
      hotelId: "hotel-a",
    }));

    expect(response.status).toBe(400);
    expect(authState.accessClaims).toHaveLength(0);
    expect(authState.refreshClaims).toHaveLength(0);
  });

  it("rechaza usuario inexistente, inactivo o ajeno al hotel", async () => {
    const missing = await login(post("http://localhost/api/login", {
      userId: "missing",
      hotelId: "hotel-a",
      password: "correct-password",
    }));
    authState.configs[0].users[0].active = false;
    const inactive = await login(post("http://localhost/api/login", {
      userId: "user-a",
      hotelId: "hotel-a",
      password: "correct-password",
    }));
    const foreign = await login(post("http://localhost/api/login", {
      userId: "user-a",
      hotelId: "hotel-b",
      password: "correct-password",
    }));

    expect(missing.status).toBe(403);
    expect(inactive.status).toBe(403);
    expect(foreign.status).toBe(403);
    expect(authState.accessClaims).toHaveLength(0);
  });

  it("rechaza contraseña inválida sin emitir tokens", async () => {
    const response = await login(post("http://localhost/api/login", {
      userId: "user-a",
      hotelId: "hotel-a",
      password: "wrong-password",
    }));

    expect(response.status).toBe(401);
    expect(authState.accessClaims).toHaveLength(0);
    expect(authState.refreshClaims).toHaveLength(0);
  });

  it("conserva selección de hotel y deriva los claims del registro autorizado", async () => {
    const selection = await findHotels(post("http://localhost/api/users/hotels-for-user", {
      email: "staff@example.com",
      password: "correct-password",
    }));
    const selectionBody = await selection.json();
    const response = await login(post("http://localhost/api/login", {
      userId: selectionBody.hotels[0].userId,
      hotelId: selectionBody.hotels[0].hotelId,
      password: "correct-password",
      roleLevel: 99,
      email: "attacker@example.com",
    }));

    expect(selection.status).toBe(200);
    expect(selectionBody).toMatchObject({ autoLogin: true, hotels: [{ hotelId: "hotel-a", userId: "user-a" }] });
    expect(response.status).toBe(200);
    expect(authState.accessClaims).toEqual([{
      email: "staff@example.com",
      hotelId: "hotel-a",
      roleLevel: 20,
      userId: "user-a",
    }]);
    expect(authState.refreshClaims).toEqual(authState.accessClaims);
    expect(response.headers.get("set-cookie")).toContain("token=access-token");
    expect(response.headers.get("set-cookie")).toContain("refreshToken=refresh-token");
  });

  it("refresh revalida membresía activa y vuelve a derivar roles server-side", async () => {
    authState.refreshPayload = {
      email: "stale@example.com",
      hotelId: "hotel-a",
      roleLevel: 99,
      userId: "user-a",
    };
    const success = await refresh(refreshRequest());
    expect(success.status).toBe(200);
    expect(authState.accessClaims.at(-1)).toEqual({
      email: "staff@example.com",
      hotelId: "hotel-a",
      roleLevel: 20,
      userId: "user-a",
    });

    authState.configs[0].users[0].active = false;
    const rejected = await refresh(refreshRequest());
    expect(rejected.status).toBe(401);
    expect(authState.accessClaims).toHaveLength(1);
  });
});
