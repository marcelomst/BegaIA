// Path: /root/begasist/scripts/mcp_smoke_reservations.ts
type Args = {
  baseUrl: string;
  hotelId?: string;
  hotelId2?: string;
};

type McpSuccess<T> = { ok: true; data: T };
type McpFailure = { ok: false; error?: string };
type McpResponse<T> = McpSuccess<T> | McpFailure;

function parseArgs(argv: string[]): Args {
  const args: Args = { baseUrl: "http://localhost:3000" };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const [rawKey, rawVal] = token.slice(2).split("=");
    const key = rawKey as keyof Args;
    const val = rawVal ?? argv[i + 1];
    if (rawVal === undefined && argv[i + 1] && !argv[i + 1].startsWith("--")) i += 1;
    if (!val) continue;
    if (key === "baseUrl" || key === "hotelId" || key === "hotelId2") {
      args[key] = val;
    }
  }
  return args;
}

async function callMcp<T>(baseUrl: string, name: string, params: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const mcpKey = String(process.env.MCP_API_KEY ?? "").trim();
  if (mcpKey) headers["x-mcp-key"] = mcpKey;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "call", name, params }),
  });

  const json = (await res.json()) as McpResponse<T> & { error?: string };
  if (!res.ok || !json.ok) {
    const reason = json?.error || `HTTP ${res.status}`;
    throw new Error(`MCP ${name} failed: ${reason}`);
  }
  return json.data;
}

function plusDaysIso(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.hotelId) {
    console.error("❌ Missing --hotelId");
    console.error("Usage: tsx scripts/mcp_smoke_reservations.ts --hotelId=hotel123 [--baseUrl=http://localhost:3000] [--hotelId2=hotel999]");
    process.exit(1);
  }

  const baseUrl = args.baseUrl;
  const hotelId = args.hotelId;
  const hotelId2 = args.hotelId2;
  const checkIn = plusDaysIso(7);
  const checkOut = plusDaysIso(9);
  let reservationId = "";
  let cancelledStatus = "";

  console.log(`[mcp:smoke] baseUrl=${baseUrl} hotelId=${hotelId}${hotelId2 ? ` hotelId2=${hotelId2}` : ""}`);

  try {
    const availability = await callMcp<Array<{ roomType: string; pricePerNight?: number; currency?: string; availability?: number }>>(
      baseUrl,
      "searchAvailability",
      { hotelId, startDate: checkIn, endDate: checkOut, roomType: "double", guests: 2 }
    );
    console.log(`✅ searchAvailability: options=${availability.length}`);

    const created = await callMcp<{ reservationId: string; status: string }>(baseUrl, "createReservation", {
      hotelId,
      guestName: "MCP Smoke",
      roomType: "double",
      checkInDate: checkIn,
      checkOutDate: checkOut,
    });
    reservationId = created.reservationId;
    console.log(`✅ createReservation: reservationId=${reservationId} status=${created.status}`);

    const gotBeforeCancel = await callMcp<{ reservationId: string; status: string } | null>(baseUrl, "getReservation", {
      hotelId,
      reservationId,
    });
    if (!gotBeforeCancel) throw new Error("getReservation returned null right after create");
    console.log(`✅ getReservation(before cancel): status=${gotBeforeCancel.status}`);

    if (hotelId2) {
      const fromHotel2 = await callMcp<{ reservationId: string; status: string } | null>(baseUrl, "getReservation", {
        hotelId: hotelId2,
        reservationId,
      });
      if (fromHotel2 !== null) throw new Error(`Isolation failed: hotelId2 can read reservationId=${reservationId}`);
      console.log("✅ isolation OK: hotelId2 cannot read reservation from hotelId");
    }

    const cancelled = await callMcp<{ reservationId: string; status: string }>(baseUrl, "cancelReservation", {
      hotelId,
      reservationId,
    });
    cancelledStatus = cancelled.status;
    console.log(`✅ cancelReservation: status=${cancelledStatus}`);

    const gotAfterCancel = await callMcp<{ reservationId: string; status: string } | null>(baseUrl, "getReservation", {
      hotelId,
      reservationId,
    });
    if (!gotAfterCancel) throw new Error("getReservation returned null after cancel");
    if (gotAfterCancel.status !== "cancelled") {
      throw new Error(`Expected cancelled status, got ${gotAfterCancel.status}`);
    }
    console.log(`✅ getReservation(after cancel): status=${gotAfterCancel.status}`);

    console.log("");
    console.log("Summary");
    console.log(`✅ reservationId=${reservationId}`);
    console.log(`✅ finalStatus=${gotAfterCancel.status}`);
    console.log(`✅ smokeResult=PASS`);
  } catch (err: any) {
    console.error(`❌ smokeResult=FAIL ${err?.message || err}`);
    if (reservationId) {
      console.error(`❌ reservationId=${reservationId} cancelledStatus=${cancelledStatus || "unknown"}`);
    }
    process.exit(1);
  }
}

main();
