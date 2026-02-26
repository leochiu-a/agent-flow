import { NextResponse } from "next/server";
import { listAllSessions } from "@/lib/sessionStorage";

export const runtime = "nodejs";

export async function GET() {
  const sessions = await listAllSessions();
  return NextResponse.json({ sessions });
}
