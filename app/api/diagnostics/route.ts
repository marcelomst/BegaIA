// Path: /root/begasist/app/api/diagnostics/route.ts
import { NextResponse } from "next/server";
import { snapshot } from "@/lib/telemetry/metrics";
import { MH_VERSION } from "@/lib/handlers/messageHandler";

const ALLOW_DIAG = process.env.NODE_ENV !== "production" || process.env.DEBUG_BEGA === "1";

export async function GET() {
    if (!ALLOW_DIAG) {
        return new NextResponse(undefined, { status: 404 });
    }
    const metrics = snapshot();
    return NextResponse.json({ ok: true, version: MH_VERSION ?? null, metrics, now: new Date().toISOString() });
}
