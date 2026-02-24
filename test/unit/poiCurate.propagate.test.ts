import { beforeEach, describe, expect, it, vi } from "vitest";
import type { POIRecord } from "@/types/poi";

const { mockFind, mockUpdateOne } = vi.hoisted(() => ({
  mockFind: vi.fn(),
  mockUpdateOne: vi.fn(),
}));

vi.mock("@/lib/astra/connection", () => {
  return {
    getAstraDB: () => ({
      collection: () => ({
        find: mockFind,
        updateOne: mockUpdateOne,
      }),
    }),
  };
});

import { propagateLocalityById, setEventLocalityById } from "@/lib/db/poiCurate";

function makeEvent(partial: Partial<POIRecord>): POIRecord {
  const id = partial._id ?? `poi-${Math.random().toString(36).slice(2)}`;
  return {
    _id: id,
    type: "event",
    name: partial.name ?? "Evento",
    sourceId: partial.sourceId ?? "quehacemoshoy",
    ...partial,
  } as POIRecord & { _id?: string };
}

beforeEach(() => {
  mockFind.mockReset();
  mockUpdateOne.mockReset();
});

describe("propagateLocalityById", () => {
  it("agrupa por placeKey y actualiza todos los matches", async () => {
    const base = makeEvent({
      _id: "base",
      name: "Evento Base",
      location: { name: "Teatro Nogaro" },
    });

    const rows: POIRecord[] = [
      base,
      makeEvent({ _id: "m1", location: { address: "Teatro Nogaro" } }),
      makeEvent({ _id: "m2", name: "Teatro Nogaro" }),
      makeEvent({ _id: "nope", location: { name: "Otro Lugar" } }),
    ];

    mockFind.mockResolvedValueOnce([base]).mockResolvedValueOnce(rows);

    const res = await propagateLocalityById("base", "Maldonado", { updatedBy: "system" });
    expect(res.matched).toBe(3);
    expect(res.updated).toBe(3);
    expect(mockUpdateOne).toHaveBeenCalledTimes(3);

    const payloads = mockUpdateOne.mock.calls.map((call) => call[1]?.$set);
    for (const payload of payloads) {
      expect(payload).toEqual(
        expect.objectContaining({
          updatedBy: "system",
          updatedAt: expect.any(String),
          location: expect.any(Object),
        })
      );
    }

    const missingLocCall = mockUpdateOne.mock.calls.find((call) => call[0]?._id === "m2");
    expect(missingLocCall?.[1]?.$set?.location).toEqual({
      country: "Uruguay",
      adminArea1: "Maldonado",
      locality: "Maldonado",
    });
  });
});

describe("setEventLocalityById", () => {
  it("actualiza localidad cuando existe el evento", async () => {
    const base = makeEvent({
      _id: "evt-1",
      name: "Evento",
      location: { name: "Teatro" },
    });
    mockFind.mockResolvedValueOnce([base]);
    mockUpdateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });

    const res = await setEventLocalityById("evt-1", "Maldonado", { updatedBy: "system" });
    expect(res.matched).toBe(1);
    expect(res.updated).toBe(1);
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: "evt-1", type: "event" },
      expect.any(Object)
    );
  });

  it("retorna matched=0 cuando no existe el evento", async () => {
    mockFind.mockResolvedValueOnce([]);
    const res = await setEventLocalityById("missing", "Maldonado", { updatedBy: "system" });
    expect(res.matched).toBe(0);
    expect(res.updated).toBe(0);
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });
});
