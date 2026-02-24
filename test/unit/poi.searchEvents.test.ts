// Path: /root/begasist/test/unit/poi.searchEvents.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFind } = vi.hoisted(() => ({
  mockFind: vi.fn(),
}));

vi.mock("@/lib/astra/connection", () => {
  return {
    getAstraDB: () => ({
      collection: () => ({
        find: mockFind,
      }),
    }),
  };
});

import { searchEvents } from "@/lib/poi/searchEvents";
import type { POIRecord } from "@/types/poi";

function makeEvent(partial: Partial<POIRecord>): POIRecord {
  return {
    _id: partial._id ?? `poi-${Math.random().toString(36).slice(2)}`,
    type: "event",
    name: partial.name ?? "Evento",
    sourceId: "quehacemoshoy",
    ...partial,
  };
}

beforeEach(() => {
  mockFind.mockReset();
});

describe("searchEvents", () => {
  it("filtra por rango incluyendo solapamiento", async () => {
    const rows: POIRecord[] = [
      makeEvent({
        _id: "e1",
        startsAt: "2026-01-15T00:00:00.000Z",
        endsAt: "2026-01-16T00:00:00.000Z",
      }),
      makeEvent({
        _id: "e2",
        startsAt: "2026-01-05T00:00:00.000Z",
        endsAt: "2026-01-12T00:00:00.000Z",
      }),
      makeEvent({
        _id: "e3",
        startsAt: "2026-01-21T00:00:00.000Z",
        endsAt: "2026-01-22T00:00:00.000Z",
      }),
      makeEvent({
        _id: "e4",
        startsAt: "2026-01-19T00:00:00.000Z",
      }),
    ];
    mockFind.mockResolvedValueOnce(rows);

    const res = await searchEvents({ from: "2026-01-10", to: "2026-01-20" });
    const ids = res.map((r) => r._id).sort();
    expect(ids).toEqual(["e1", "e2", "e4"].sort());
  });

  it("filtra por city con normalización de acentos", async () => {
    const rows: POIRecord[] = [
      makeEvent({
        _id: "e1",
        startsAt: "2026-02-01T10:00:00.000Z",
        location: { locality: "Piriápolis" },
      }),
      makeEvent({
        _id: "e2",
        startsAt: "2026-02-01T11:00:00.000Z",
        location: { locality: "Punta del Este" },
      }),
    ];
    mockFind.mockResolvedValueOnce(rows);

    const res = await searchEvents({ from: "2026-02-01", to: "2026-02-02", city: "piriapolis" });
    expect(res.map((r) => r._id)).toEqual(["e1"]);
  });

  it("filtra por region cuando se provee eventsRegion", async () => {
    const rows: POIRecord[] = [
      makeEvent({
        _id: "e1",
        startsAt: "2026-02-01T10:00:00.000Z",
        region: "maldonado_uy",
      }),
      makeEvent({
        _id: "e2",
        startsAt: "2026-02-01T11:00:00.000Z",
        region: "rocha_uy",
      }),
    ];
    mockFind.mockResolvedValueOnce(rows);

    const res = await searchEvents({
      from: "2026-02-01",
      to: "2026-02-02",
      region: "maldonado_uy",
    });
    expect(res.map((r) => r._id)).toEqual(["e1"]);
  });

  it("respeta limit y ordena por startsAt asc", async () => {
    const rows: POIRecord[] = [
      makeEvent({
        _id: "e1",
        startsAt: "2026-01-05T00:00:00.000Z",
      }),
      makeEvent({
        _id: "e2",
        startsAt: "2026-01-01T00:00:00.000Z",
      }),
      makeEvent({
        _id: "e3",
        startsAt: "2026-01-03T00:00:00.000Z",
      }),
    ];
    mockFind.mockResolvedValueOnce(rows);

    const res = await searchEvents({ from: "2026-01-01", to: "2026-01-10", limit: 2 });
    expect(res.map((r) => r._id)).toEqual(["e2", "e3"]);
  });

  it("interpreta YYYY-MM-DD en zona horaria local cuando tz está presente", async () => {
    const rows: POIRecord[] = [
      makeEvent({
        _id: "e1",
        startsAt: "2026-02-02T02:00:00.000Z",
        endsAt: "2026-02-02T02:00:00.000Z",
      }),
      makeEvent({
        _id: "e2",
        startsAt: "2026-02-02T15:00:00.000Z",
      }),
    ];
    mockFind.mockResolvedValueOnce(rows);

    const res = await searchEvents({
      from: "2026-02-02",
      to: "2026-02-02",
      tz: "America/Montevideo",
    });
    expect(res.map((r) => r._id)).toEqual(["e2"]);
  });

  it("interpreta 'd LLL yyyy' en zona horaria local cuando tz está presente", async () => {
    const rows: POIRecord[] = [
      makeEvent({
        _id: "e1",
        startsAt: "2026-02-02T02:00:00.000Z",
        endsAt: "2026-02-02T02:00:00.000Z",
      }),
      makeEvent({
        _id: "e2",
        startsAt: "2026-02-02T15:00:00.000Z",
      }),
    ];
    mockFind.mockResolvedValueOnce(rows);

    const res = await searchEvents({
      from: "2 feb 2026",
      to: "2 feb 2026",
      tz: "America/Montevideo",
    });
    expect(res.map((r) => r._id)).toEqual(["e2"]);
  });
});
