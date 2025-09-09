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
