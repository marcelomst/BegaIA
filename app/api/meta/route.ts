// Path: /app/api/meta/route.ts
import { NextResponse } from "next/server";
import pkg from "../../../package.json";

export async function GET() {
    // Nota: mantener campos no sensibles; si en prod se requiere auth, se puede agregar.
    const version = pkg?.version || null;
    const commit =
        process.env.GIT_COMMIT_SHA ||
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.COMMIT_SHA ||
        null;
    const env = process.env.NODE_ENV || "development";
    const providers = {
        openai: Boolean(process.env.OPENAI_API_KEY),
        groq: Boolean(process.env.GROQ_API_KEY),
    };
    const features = {
        autosendSafeIntents: true,
        idempotentChatAck: true,
        swaggerUi: true,
    };

    return NextResponse.json({
        ok: true,
        version,
        commit,
        env,
        providers,
        features,
        now: new Date().toISOString(),
    });
}
