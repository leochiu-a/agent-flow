import { NextResponse } from "next/server";
import { listConnectors } from "@/lib/connectorStorage";
import type { JiraConnectorRecord } from "@/lib/connectorStorage";

export const runtime = "nodejs";

export async function GET() {
  const all = await listConnectors();
  const jiraConnectors = all.filter((c): c is JiraConnectorRecord => c.type === "jira");

  // Backward-compatible sanitization: older records may still contain legacy fields.
  const safe = jiraConnectors.map((connector) => {
    const { secretRef: _legacySecretRef, ...rest } = connector as JiraConnectorRecord & {
      secretRef?: string;
    };
    return rest;
  });

  return NextResponse.json({ connectors: safe });
}
