import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { name, content } = (await req.json()) as { name: string; content: string };

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Ensure filename ends with .yaml
  const filename = name.endsWith(".yaml") || name.endsWith(".yml") ? name : `${name}.yaml`;

  // Guard against path traversal
  if (filename.includes("/") || filename.includes("..")) {
    return NextResponse.json({ error: "invalid filename" }, { status: 400 });
  }

  const workflowDir = join(process.cwd(), "../../.ai-workflows");
  await mkdir(workflowDir, { recursive: true });

  const filePath = join(workflowDir, filename);
  await writeFile(filePath, content ?? "", "utf-8");

  return NextResponse.json({ filename, filePath });
}
