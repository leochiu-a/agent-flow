import { NextRequest, NextResponse } from "next/server";
import { access, rename } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

function isValidWorkflowFilename(filename: string): boolean {
  if (!filename) return false;
  if (filename.includes("/") || filename.includes("..")) return false;
  return filename.endsWith(".yaml") || filename.endsWith(".yml");
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { from?: string; to?: string };
  const { from, to } = body;

  if (!from || !isValidWorkflowFilename(from)) {
    return NextResponse.json({ error: "invalid 'from' filename" }, { status: 400 });
  }
  if (!to || !isValidWorkflowFilename(to)) {
    return NextResponse.json({ error: "invalid 'to' filename" }, { status: 400 });
  }

  const workflowDir = join(process.cwd(), "../../.ai-workflows");
  const fromPath = join(workflowDir, from);
  const toPath = join(workflowDir, to);

  try {
    await access(fromPath);
  } catch {
    return NextResponse.json({ error: "file not found" }, { status: 404 });
  }

  try {
    await access(toPath);
    return NextResponse.json({ error: "target filename already exists" }, { status: 409 });
  } catch {
    // target does not exist — proceed
  }

  try {
    await rename(fromPath, toPath);
    return NextResponse.json({ ok: true, filename: to });
  } catch {
    return NextResponse.json({ error: "failed to rename file" }, { status: 500 });
  }
}
