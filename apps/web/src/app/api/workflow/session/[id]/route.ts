import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/sessionStorage";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file");
  const { id } = await params;

  if (!file) {
    return NextResponse.json({ error: "Missing file param" }, { status: 400 });
  }

  const session = await getSession(file, id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file");
  const { id } = await params;

  if (!file) {
    return NextResponse.json({ error: "Missing file param" }, { status: 400 });
  }

  const deleted = await deleteSession(file, id);
  if (!deleted) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
