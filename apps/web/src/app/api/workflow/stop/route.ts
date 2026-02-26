import { NextRequest, NextResponse } from "next/server";
import { getRunner, unregisterRunner } from "@/lib/runnerRegistry";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { sessionId } = (await req.json()) as { sessionId: string };

  const runner = getRunner(sessionId);
  if (!runner) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  runner.abort();
  unregisterRunner(sessionId);

  return NextResponse.json({ ok: true });
}
