// Path: /root/begasist/app/api/debug/fastpath/route.ts
import { NextResponse } from "next/server";
import "@/lib/utils/debugLog";

export async function GET() {
    const IS_TEST_ENV = process.env.NODE_ENV === 'test' || Boolean((globalThis as any).vitest) || Boolean(process.env.VITEST);
    const FORCE_GENERATION = process.env.FORCE_GENERATION === '1';
    const ENABLE_TEST_FASTPATH = process.env.ENABLE_TEST_FASTPATH === '1' || process.env.DEBUG_FASTPATH === '1' || IS_TEST_ENV;
    const openaiKeyPresent = Boolean(process.env.OPENAI_API_KEY);
    const FAST_ROUTE_MODE = !FORCE_GENERATION && (ENABLE_TEST_FASTPATH || !openaiKeyPresent);
    const reasons: string[] = [];
    if (FORCE_GENERATION) reasons.push('FORCE_GENERATION=1');
    if (ENABLE_TEST_FASTPATH) reasons.push('ENABLE_TEST_FASTPATH');
    if (!openaiKeyPresent) reasons.push('NO_OPENAI_API_KEY');
    return NextResponse.json({
        IS_TEST_ENV,
        FORCE_GENERATION,
        ENABLE_TEST_FASTPATH,
        openaiKeyPresent,
        FAST_ROUTE_MODE,
        reasons,
        nodeEnv: process.env.NODE_ENV,
    });
}
