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
  async updateOne(filter: Partial<Doc>, update: Partial<Doc>) {
    for (const [id, d] of this.data.entries()) {
      let ok = true;
      for (const [k, v] of Object.entries(filter)) if (d[k] !== v) { ok = false; break; }
      if (ok) {
        const nd = { ...d, ...update };
        this.data.set(id, nd);
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedId: null };
      }
    }
    return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedId: null };
  }
  async upsert(filter: Partial<Doc>, update: Partial<Doc>) {
    const found = await this.findOne(filter);
    if (found) return this.updateOne({ _id: found._id }, update);
    return this.insertOne({ ...filter, ...update });
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
export async function getAstraCollection(name: string) {
  return getCollection(name);
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
