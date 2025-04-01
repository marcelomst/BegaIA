// app/api/whatsapp/route.ts

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "🟢 WhatsApp bot is running." });
}

export async function POST() {
  return NextResponse.json({ status: "🟢 WhatsApp bot is running independently and does not require webhooks." });
}
