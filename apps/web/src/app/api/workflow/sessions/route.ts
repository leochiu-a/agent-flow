import { NextRequest, NextResponse } from "next/server";
import { listSessions } from "@/lib/sessionStorage";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file");

  if (!file) {
    return NextResponse.json({ error: "Missing file param" }, { status: 400 });
  }

  const sessions = await listSessions(file);
  return NextResponse.json({ workflowFile: file, sessions });
}
