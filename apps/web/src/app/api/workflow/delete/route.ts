import { NextRequest, NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

function isValidWorkflowFilename(filename: string): boolean {
  if (!filename) return false;
  if (filename.includes("/") || filename.includes("..")) return false;
  return filename.endsWith(".yaml") || filename.endsWith(".yml");
}

export async function DELETE(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get("file");

  if (!filename || !isValidWorkflowFilename(filename)) {
    return NextResponse.json({ error: "invalid filename" }, { status: 400 });
  }

  const filePath = join(process.cwd(), "../../.ai-workflows", filename);

  try {
    await unlink(filePath);
    return NextResponse.json({ ok: true, filename });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "file not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "failed to delete file" }, { status: 500 });
  }
}
