import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      error: "Jira OAuth flow is deprecated. Use manual token via POST /api/connectors/jira/token",
    },
    { status: 410 },
  );
}
