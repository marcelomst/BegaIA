// Path: /root/begasist/test/mocks/astra.ts
type Doc = Record<string, any>;

class InMemoryCollection {
  private data = new Map<string, Doc>();
  constructor(private name: string) {}
  async insertOne(doc: Doc) {
    const _id = doc._id ?? (globalThis as any).crypto.randomUUID();
    const toStore = { ...doc, _id };
    this.data.set(_id, toStore);
    return { acknowledged: true, insertedId: _id };
  }
  async findOne(filter: Partial<Doc>) {
    for (const d of this.data.values()) {
      let ok = true;
      for (const [k, v] of Object.entries(filter)) if (d[k] !== v) { ok = false; break; }
      if (ok) return structuredClone(d);
    }
    return null;
  }
  async findMany(filter: Partial<Doc> = {}, opts: { sort?: [string, 1 | -1] } = {}) {
    const arr = [...this.data.values()].filter(d => {
      for (const [k, v] of Object.entries(filter)) if (d[k] !== v) return false;
      return true;
    });
    if (opts.sort) {
      const [key, dir] = opts.sort;
      arr.sort((a, b) => (a[key] ?? 0) > (b[key] ?? 0) ? dir : (a[key] ?? 0) < (b[key] ?? 0) ? -dir : 0);
    }
    return structuredClone(arr);
  }
  find(filter: Partial<Doc> = {}) {
    return {
      toArray: async () => this.findMany(filter),
    };
  }
  private matches(d: Doc, filter: Partial<Doc>) {
    for (const [k, v] of Object.entries(filter)) if (d[k] !== v) return false;
    return true;
  }
  private applySetPatch(base: Doc, patch: Doc) {
    const next = structuredClone(base);
    for (const [key, value] of Object.entries(patch)) {
      const parts = key.split(".");
      let target = next;
      for (let i = 0; i < parts.length - 1; i += 1) {
        const part = parts[i];
        const current = target[part];
        if (!current || typeof current !== "object" || Array.isArray(current)) {
          target[part] = {};
        }
        target = target[part];
      }
      target[parts[parts.length - 1]] = value;
    }
    return next;
  }
  private applyUpdate(base: Doc, update: Partial<Doc>) {
    const asAny = update as any;
    const setPatch = asAny?.$set && typeof asAny.$set === "object" ? asAny.$set : null;
    return setPatch ? this.applySetPatch(base, setPatch) : { ...base, ...update };
  }
  async updateOne(filter: Partial<Doc>, update: Partial<Doc>) {
    for (const [id, d] of this.data.entries()) {
      if (this.matches(d, filter)) {
        this.data.set(id, this.applyUpdate(d, update));
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedId: null };
      }
    }
    return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedId: null };
  }
  async updateMany(filter: Partial<Doc>, update: Partial<Doc>) {
    let matchedCount = 0;
    let modifiedCount = 0;
    for (const [id, d] of this.data.entries()) {
      if (!this.matches(d, filter)) continue;
      matchedCount += 1;
      this.data.set(id, this.applyUpdate(d, update));
      modifiedCount += 1;
    }
    return { acknowledged: true, matchedCount, modifiedCount, upsertedCount: 0, upsertedId: null };
  }
  async upsert(filter: Partial<Doc>, update: Partial<Doc>) {
    const found = await this.findOne(filter);
    if (found) return this.updateOne({ _id: found._id }, update);
    return this.insertOne({ ...filter, ...update });
  }
  async deleteOne(filter: Partial<Doc>) {
    for (const [id, d] of this.data.entries()) {
      let ok = true;
      for (const [k, v] of Object.entries(filter)) if (d[k] !== v) { ok = false; break; }
      if (ok) {
        this.data.delete(id);
        return { acknowledged: true, deletedCount: 1 };
      }
    }
    return { acknowledged: true, deletedCount: 0 };
  }
  async count(filter: Partial<Doc> = {}) {
    const arr = await this.findMany(filter);
    return arr.length;
  }
  _dump() { return [...this.data.values()].map(x => ({ ...x })); }
}
const collections: Record<string, InMemoryCollection> = {
  messages: new InMemoryCollection("messages"),
  conversations: new InMemoryCollection("conversations"),
  convState: new InMemoryCollection("convState"),
  hotel_config: new InMemoryCollection("hotel_config"),
};
export function __resetAstraMock() { /* no-op */ }
export function getCollection(name: string) {
  if (!collections[name]) collections[name] = new InMemoryCollection(name);
  return collections[name];
}

export function getTable(name: string) {
  const collection = getCollection(`table:${name}`);
  return {
    async insertOne(row: Doc) {
      const key = `${row.hotel_id}:${row.reservation_id}`;
      const existing = await collection.findOne({ _id: key });
      if (existing) await collection.updateOne({ _id: key }, { $set: { ...row, _id: key } });
      else await collection.insertOne({ ...row, _id: key });
    },
    findOne: (filter: Partial<Doc>) => collection.findOne(filter),
    find: (filter: Partial<Doc> = {}) => collection.find(filter),
    deleteOne: (filter: Partial<Doc>) => collection.deleteOne(filter),
  };
}

export async function getAstraCollection(name: string) {
  return getCollection(name);
}

type CassandraFailureMode =
  | "insert_guest_aliases"
  | "insert_guest_aliases_by_guest"
  | "delete_guest_aliases_by_guest";

const cassandraFailures: Partial<Record<CassandraFailureMode, string[]>> = {};

export function failNextCassandraExecute(mode: CassandraFailureMode, message: string) {
  cassandraFailures[mode] = [...(cassandraFailures[mode] || []), message];
}

function maybeFailCassandraExecute(mode: CassandraFailureMode) {
  const failures = cassandraFailures[mode];
  const message = failures?.shift();
  if (message) throw new Error(message);
}

function toCqlRow(doc: Doc | null) {
  if (!doc) return null;
  return {
    get: (key: string) => (doc as any)[key],
  };
}

export function getMockCassandraClient() {
  return {
    async execute(query: string, params: any[] = []) {
      const q = String(query || "").toLowerCase();
      if (q.includes("guest_aliases_by_guest")) {
        const col = getCollection("guest_aliases_by_guest");
        if (q.trim().startsWith("select")) {
          const [hotelId, guestId] = params;
          const rowsDocs = await col.findMany(
            { hotelid: hotelId, guestid: guestId },
            { sort: ["createdat", 1] },
          );
          const row = toCqlRow(rowsDocs[0] ?? null);
          return {
            first: () => row,
            rows: rowsDocs.map((doc) => toCqlRow(doc)),
          };
        }
        if (q.trim().startsWith("insert")) {
          maybeFailCassandraExecute("insert_guest_aliases_by_guest");
          const [hotelId, guestId, alias, createdAt] = params;
          await col.upsert(
            { hotelid: hotelId, guestid: guestId, alias },
            { hotelid: hotelId, guestid: guestId, alias, createdat: createdAt },
          );
          return {
            first: () => null,
            rows: [],
          };
        }
        if (q.trim().startsWith("delete")) {
          maybeFailCassandraExecute("delete_guest_aliases_by_guest");
          const [hotelId, guestId, alias] = params;
          const rows = await col.findMany({ hotelid: hotelId, guestid: guestId, alias });
          for (const row of rows) {
            await (col as any).deleteOne({ _id: row._id });
          }
          return {
            first: () => null,
            rows: [],
          };
        }
      }
      if (q.includes("guest_aliases")) {
        const col = getCollection("guest_aliases");
        if (q.trim().startsWith("select")) {
          const [hotelId, secondParam] = params;
          let rowsDocs: Doc[] = [];
          if (q.includes("and alias = ?")) {
            const found = await col.findOne({ hotelid: hotelId, alias: secondParam });
            if (found) rowsDocs = [found];
          } else if (q.includes("and guestid = ?")) {
            rowsDocs = await col.findMany(
              { hotelid: hotelId, guestid: secondParam },
              { sort: ["createdat", 1] },
            );
          }
          const row = toCqlRow(rowsDocs[0] ?? null);
          return {
            first: () => row,
            rows: rowsDocs.map((doc) => toCqlRow(doc)),
          };
        }
        if (q.trim().startsWith("insert")) {
          maybeFailCassandraExecute("insert_guest_aliases");
          const [hotelId, alias, guestId, createdAt] = params;
          await col.upsert(
            { hotelid: hotelId, alias },
            {
            hotelid: hotelId,
            alias,
            guestid: guestId,
            createdat: createdAt,
            },
          );
          return {
            first: () => null,
            rows: [],
          };
        }
      }
      return {
        first: () => null,
        rows: [],
      };
    },
  };
}
