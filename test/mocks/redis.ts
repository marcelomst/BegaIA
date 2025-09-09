// Path: /root/begasist/test/mocks/redis.ts
class InMemoryRedis {
  private store = new Map<string, string>();
  private timers = new Map<string, any>();
  async get(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  async set(key: string, val: string, mode?: "EX" | "PX", ttl?: number) {
    this.store.set(key, val);
    if (mode && ttl) {
      if (this.timers.has(key)) clearTimeout(this.timers.get(key));
      const ms = mode === "EX" ? ttl * 1000 : ttl;
      this.timers.set(key, setTimeout(() => { this.store.delete(key); this.timers.delete(key); }, ms));
    }
    return "OK";
  }
  async del(key: string) {
    const had = this.store.delete(key);
    if (this.timers.has(key)) { clearTimeout(this.timers.get(key)); this.timers.delete(key); }
    return had ? 1 : 0;
  }
  async incr(key: string) {
    const v = Number(this.store.get(key) || "0") + 1;
    this.store.set(key, String(v));
    return v;
  }
  async expire(key: string, seconds: number) {
    await this.set(key, (this.store.get(key) ?? "1"), "EX", seconds);
    return 1;
  }
}
export const redis = new InMemoryRedis();
