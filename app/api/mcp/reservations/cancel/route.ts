// Path: /root/begasist/app/api/mcp/reservations/cancel/route.ts

// POST /api/mcp/reservations/cancel
export async function POST() {
  return Response.json(
    { ok: false, error: "Cancellation is temporarily disabled" },
    { status: 403 },
  );
}
