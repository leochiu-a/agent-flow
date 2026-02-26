import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEPRECATED_MSG = {
  error: "Jira OAuth flow is deprecated. Use manual token via POST /api/connectors/jira/token",
};

export async function GET() {
  return NextResponse.json(DEPRECATED_MSG, { status: 410 });
}

export async function POST() {
  return NextResponse.json(DEPRECATED_MSG, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json(DEPRECATED_MSG, { status: 410 });
}
