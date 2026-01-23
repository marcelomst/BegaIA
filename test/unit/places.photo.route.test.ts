// Path: /root/begasist/test/unit/places.photo.route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/places/photo/route";

describe("places photo route", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GOOGLE_PLACES_API_KEY;

  beforeEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => {
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    }));
  });

  afterEach(() => {
    if (originalFetch) global.fetch = originalFetch;
    process.env.GOOGLE_PLACES_API_KEY = originalKey;
  });

  it("returns image bytes with cache headers", async () => {
    const req = new NextRequest("http://localhost/api/places/photo?name=places/abc/photos/def&maxWidth=600");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toContain("max-age=86400");
  });
});
