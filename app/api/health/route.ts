// Path: /root/begasist/app/api/health/route.ts
import { NextResponse } from "next/server";
import pkg from "../../../package.json";

export async function GET() {
  const version = pkg?.version || null;
  const commit =
    process.env.GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.COMMIT_SHA ||
    null;

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    version,
    commit,
  });
}
