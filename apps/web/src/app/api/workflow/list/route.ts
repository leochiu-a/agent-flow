import { NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

export const runtime = "nodejs";

export async function GET() {
  const workflowDir = join(process.cwd(), "../../.ai-workflows");
  if (!existsSync(workflowDir)) {
    return NextResponse.json({ workflows: [], dir: workflowDir });
  }
  const files = await readdir(workflowDir);
  const workflows = files.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
  return NextResponse.json({ workflows, dir: workflowDir });
}
