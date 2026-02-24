import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get("file");

  if (!filename || filename.includes("/") || filename.includes("..")) {
    return NextResponse.json({ error: "invalid filename" }, { status: 400 });
  }

  const filePath = join(process.cwd(), "../../.ai-workflows", filename);

  try {
    const content = await readFile(filePath, "utf-8");
    return NextResponse.json({ filename, content });
  } catch {
    return NextResponse.json({ error: "file not found" }, { status: 404 });
  }
}
