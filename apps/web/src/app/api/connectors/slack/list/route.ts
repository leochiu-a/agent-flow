import { NextResponse } from "next/server";
import { listConnectors } from "@/lib/connectorStorage";
import type { SlackConnectorRecord } from "@/lib/connectorStorage";

export const runtime = "nodejs";

export async function GET() {
  const all = await listConnectors();
  const slackConnectors = all.filter((c): c is SlackConnectorRecord => c.type === "slack");
  // Backward-compatible sanitization: older records may still contain legacy fields.
  const safe = slackConnectors.map((connector) => {
    const {
      secretRef: _legacySecretRef,
      mcpProfile: _legacyMcpProfile,
      ...rest
    } = connector as SlackConnectorRecord & {
      secretRef?: string;
      mcpProfile?: unknown;
    };
    return rest;
  });
  return NextResponse.json({ connectors: safe });
}
