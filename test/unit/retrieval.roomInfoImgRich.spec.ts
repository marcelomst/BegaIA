import { HumanMessage } from "@langchain/core/messages";
import { beforeEach, describe, expect, it, vi } from "vitest";

let lastCursor: { close: ReturnType<typeof vi.fn> } | null = null;

const roomInfoImgBody = [
  [
    "Tipo: Single Standard",
    "Icono: 🛏️",
    "Resumen visual: Capacidad: 1 huésped | Camas: 1 cama individual | Superficie: 22 m²",
    "Highlights: Vista al mar | Balcón | Calefacción | TV Smart | Caja fuerte | Minibar",
    'Images: ["/hotel999/rooms/single/single.jpg"]',
  ].join("\n"),
  [
    "Tipo: Doble",
    "Icono: 🛌",
    "Resumen visual: Capacidad: 2 huéspedes | Camas: 1 matrimonial | Superficie: 30 m²",
    "Highlights: Vista al mar | Balcón | Calefacción | TV Smart | Caja fuerte",
    'Images: ["/hotel999/rooms/double/double.jpg"]',
  ].join("\n"),
  [
    "Tipo: Twin",
    "Icono: 👥",
    "Resumen visual: Capacidad: 2 huéspedes | Camas: 2 camas individuales | Superficie: 30 m²",
    "Highlights: Vista al mar | Balcón | TV Smart | Caja fuerte | Wi-Fi alta velocidad",
    'Images: ["/hotel999/rooms/twin/twin.jpg"]',
  ].join("\n"),
  [
    "Tipo: Triple",
    "Icono: 👨‍👩‍👧",
    "Resumen visual: Capacidad: 3 huéspedes | Camas: 3 camas estándar | Superficie: 35 m²",
    "Highlights: Vista al mar | Balcón | Terraza",
    'Images: ["/hotel999/rooms/triple/hab-triple-1.jpg"]',
  ].join("\n"),
].join("\n\n");

vi.mock("@/lib/astra/connection", () => ({
  getHotelAstraCollection: vi.fn(() => ({
    find: vi.fn(() => {
      const cursor = {
        async *[Symbol.asyncIterator]() {
          yield {
            _id: "room-info-img-v4-1",
            category: "retrieval_based",
            promptKey: "room_info_img",
            targetLang: "es",
            version: "v4",
          };
        },
        close: vi.fn(),
      };
      lastCursor = cursor;
      return cursor;
    }),
  })),
}));

vi.mock("@/lib/retrieval", () => ({
  searchFromAstra: vi.fn(async () => [
    [
      "Tipo: Doble",
      "Icono: 🛏️",
      "Highlights: Capacidad: 2 | Cama: Queen",
      'Images: ["https://cdn.example.com/doble-1.jpg","https://cdn.example.com/doble-2.jpg"]',
    ].join("\n"),
  ]),
}));

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async () => ({
    hotelId: "hotel999",
    city: "Punta del Este",
    country: "UY",
    rooms: [
      {
        name: "Single Standard",
        capacity: 1,
        beds: "1 cama individual",
        sizeM2: 22,
        highlights: ["Vista al mar", "Balcón", "Calefacción", "TV Smart", "Caja fuerte", "Minibar"],
        images: ["/home/marcelo/begasist/public/hotel999/rooms/single/single.jpg"],
        icon: "🛏️",
      },
      {
        name: "Doble",
        capacity: 2,
        beds: "1 matrimonial",
        sizeM2: 30,
        highlights: ["Vista al mar", "Balcón", "Calefacción", "TV Smart", "Caja fuerte"],
        images: ["/home/marcelo/begasist/public/hotel999/rooms/double/double.jpg"],
        icon: "🛌",
      },
      {
        name: "Twin",
        capacity: 2,
        beds: "2 camas individuales",
        sizeM2: 30,
        highlights: ["Vista al mar", "Balcón", "TV Smart", "Caja fuerte", "Wi-Fi alta velocidad"],
        images: ["/home/marcelo/begasist/public/hotel999/rooms/twin/twin.jpg"],
        icon: "👥",
      },
      {
        name: "Triple",
        capacity: 3,
        beds: "3 camas estándar",
        sizeM2: 35,
        highlights: ["Vista al mar", "Balcón", "Terraza"],
        images: ["/home/marcelo/begasist/public/hotel999/rooms/triple/hab-triple-1.jpg"],
        icon: "👨‍👩‍👧",
      },
    ],
  })),
}));

vi.mock("@/lib/categories/resolveCategory", () => ({
  resolveCategoryForHotel: vi.fn(async () => ({
    content: {
      version: "v3",
      body: roomInfoImgBody,
    },
  })),
}));

vi.mock("@/lib/media/googlePlaces", () => ({
  searchNearbyPlaces: vi.fn(async () => []),
}));
vi.mock("@/lib/poi/searchEvents", () => ({
  searchEvents: vi.fn(async () => []),
}));
vi.mock("@/lib/poi/searchAttractions", () => ({
  searchAttractions: vi.fn(async () => []),
}));
vi.mock("@/lib/i18n/translateIfNeeded", () => ({
  translateIfNeeded: vi.fn(async (text: string) => text),
}));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    async invoke() {
      return { content: "Tenemos habitaciones Doble con cama Queen." };
    }
  },
}));

import { retrievalBased } from "@/lib/agents/retrieval_based";
import { searchFromAstra } from "@/lib/retrieval";

describe("retrievalBased room_info_img rich payload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastCursor = null;
  });

  it("builds complete deterministic room-info-img rich data without markdown image URLs", async () => {
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "room_info_img",
      category: "retrieval_based",
      normalizedMessage: "Que tipos de habitaciones tienen?",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("Que tipos de habitaciones tienen?")],
    } as any);

    expect(res?.meta?.rich?.type).toBe("room-info-img");
    expect(res?.meta?.rich?.data).toHaveLength(4);
    expect(res?.meta?.rich?.data?.map((item: any) => item.type)).toEqual([
      "Single Standard",
      "Doble",
      "Twin",
      "Triple",
    ]);
    expect(res?.meta?.rich?.data?.[0]).toEqual(expect.objectContaining({
      type: "Single Standard",
      icon: "🛏️",
      highlights: expect.arrayContaining(["Capacidad: 1 huésped", "Vista al mar"]),
      images: ["/hotel999/rooms/single/single.jpg"],
    }));
    expect(res?.meta?.rich?.data?.[3]).toEqual(expect.objectContaining({
      type: "Triple",
      images: ["/hotel999/rooms/triple/hab-triple-1.jpg"],
    }));
    const reply = String(res?.messages?.at(-1)?.content || "");
    expect(reply).not.toContain("![");
    expect(reply).not.toMatch(/https?:\/\/127\.0\.0\.1|\.jpg/i);
    expect(searchFromAstra).not.toHaveBeenCalled();
    expect(lastCursor).toBeNull();
  });
});
