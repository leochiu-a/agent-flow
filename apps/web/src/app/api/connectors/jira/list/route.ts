import { NextResponse } from "next/server";
import { listConnectors } from "@/lib/connectorStorage";
import type { JiraConnectorRecord } from "@/lib/connectorStorage";

export const runtime = "nodejs";

export async function GET() {
  const all = await listConnectors();
  const jiraConnectors = all.filter((c): c is JiraConnectorRecord => c.type === "jira");

  // Strip secretRef before sending to client
  const safe = jiraConnectors.map(({ secretRef: _secretRef, ...rest }) => rest);

  return NextResponse.json({ connectors: safe });
}
