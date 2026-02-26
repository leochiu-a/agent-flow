import { NextResponse } from "next/server";
import { listConnectors } from "@/lib/connectorStorage";
import type { SlackConnectorRecord } from "@/lib/connectorStorage";

export const runtime = "nodejs";

export async function GET() {
  const all = await listConnectors();
  const slackConnectors = all.filter((c): c is SlackConnectorRecord => c.type === "slack");
  // Never include secretRef value in the response (it's a file path, not the token itself,
  // but we omit it anyway to keep the API surface clean)
  const safe = slackConnectors.map(({ secretRef: _secretRef, ...rest }) => rest);
  return NextResponse.json({ connectors: safe });
}
