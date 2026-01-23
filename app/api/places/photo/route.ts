import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_MAX_WIDTH = 600;
const MAX_WIDTH_LIMIT = 1600;

function clampWidth(v: string | null): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return DEFAULT_MAX_WIDTH;
  return Math.max(1, Math.min(n, MAX_WIDTH_LIMIT));
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return new NextResponse(null, { status: 404 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return new NextResponse(null, { status: 204 });

  const maxWidth = clampWidth(req.nextUrl.searchParams.get("maxWidth"));
  const safeName = name.startsWith("/") ? name.slice(1) : name;
  const url = `https://places.googleapis.com/v1/${safeName}/media?key=${apiKey}&maxWidthPx=${maxWidth}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return new NextResponse(null, { status: 204 });
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
