import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const collections = new Map<string, { find: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> }>();
  const collection = vi.fn((name: string) => {
    let entry = collections.get(name);
    if (!entry) {
      entry = {
        find: vi.fn(() => ({ toArray: async () => [] })),
        deleteMany: vi.fn(async () => ({ deletedCount: 0 })),
      };
      collections.set(name, entry);
    }
    return entry;
  });
  const cqlClient = {
    execute: vi.fn(async (..._args: unknown[]) => ({ first: () => null, rows: [] })),
    shutdown: vi.fn(async () => {}),
  };
  return {
    collections,
    collection,
    getAstraDB: vi.fn(() => ({ collection })),
    getCassandraClient: vi.fn(() => cqlClient),
    cqlClient,
    deleteDemoChannelManagerReservationsForHotel: vi.fn(async () => 0),
  };
});

vi.mock("../../lib/astra/connection", () => ({
  getAstraDB: mocks.getAstraDB,
  getCassandraClient: mocks.getCassandraClient,
}));
vi.mock("../../lib/db/demoChannelManagerReservations", () => ({
  deleteDemoChannelManagerReservationsForHotel: mocks.deleteDemoChannelManagerReservationsForHotel,
}));

import { main } from "../../scripts/wipe-conversations-and-messages";

const argv = (...args: string[]) => ["node", "runtime:wipe", ...args];

describe("runtime:wipe demo_cm_reservations safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.collections.clear();
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps demo_cm_reservations untouched during dry-runs and when --force is absent", async () => {
    await main(argv("--only=demo_cm_reservations", "--hotel=hotel-a"));

    expect(mocks.deleteDemoChannelManagerReservationsForHotel).not.toHaveBeenCalled();
    for (const entry of mocks.collections.values()) {
      expect(entry.deleteMany).not.toHaveBeenCalled();
    }
  });

  it("requires --hotel before a forced demo_cm_reservations wipe", async () => {
    await main(argv("--only=demo_cm_reservations", "--force"));

    expect(mocks.deleteDemoChannelManagerReservationsForHotel).not.toHaveBeenCalled();
    expect(mocks.collections.size).toBe(4);
  });

  it("deletes only the selected hotel's demo reservations when explicitly forced", async () => {
    await main(argv("--only=demo_cm_reservations", "--hotel=hotel-a", "--force"));

    expect(mocks.deleteDemoChannelManagerReservationsForHotel).toHaveBeenCalledTimes(1);
    expect(mocks.deleteDemoChannelManagerReservationsForHotel).toHaveBeenCalledWith("hotel-a");
    for (const entry of mocks.collections.values()) {
      expect(entry.deleteMany).not.toHaveBeenCalled();
    }
    expect(mocks.cqlClient.execute.mock.calls.some(([query]) => String(query).startsWith("DELETE"))).toBe(false);
  });

  it("keeps demo_cm_reservations out of a forced generic wipe", async () => {
    await main(argv("--hotel=hotel-a", "--force"));

    expect(mocks.deleteDemoChannelManagerReservationsForHotel).not.toHaveBeenCalled();
  });

  it("never selects demo_cm_reservations from a generic wipe without --hotel", async () => {
    await main(argv("--force"));

    expect(mocks.deleteDemoChannelManagerReservationsForHotel).not.toHaveBeenCalled();
  });

  it("rejects forced execution outside development and test before connecting to stores", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await main(argv("--only=demo_cm_reservations", "--hotel=hotel-a", "--force"));

    expect(mocks.getAstraDB).not.toHaveBeenCalled();
    expect(mocks.getCassandraClient).not.toHaveBeenCalled();
    expect(mocks.deleteDemoChannelManagerReservationsForHotel).not.toHaveBeenCalled();
  });
});
