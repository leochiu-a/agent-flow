import { NextResponse } from "next/server";
import { listSkills } from "@agent-flow/core";

export async function GET() {
  const skills = await listSkills();
  return NextResponse.json({ skills });
}
