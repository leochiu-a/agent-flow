import { NextRequest, NextResponse } from "next/server";
import { getConnector, listConnectors, updateConnectorStatus } from "@/lib/connectorStorage";
import { logConnectorEvent } from "@/lib/connectorLogger";
import { unregisterJiraMcp } from "@/lib/claudeSettingsManager";

export const runtime = "nodejs";

interface DisconnectRequest {
  connectionId: string;
  purgeSecret?: boolean;
}

export async function POST(req: NextRequest) {
  const { connectionId, purgeSecret = false } = (await req.json()) as DisconnectRequest;

  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  const connector = await getConnector(connectionId);
  if (!connector || connector.type !== "jira") {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 });
  }

  await updateConnectorStatus(connectionId, "disconnected");

  // Keep Jira MCP registration aligned with connected Jira connectors.
  const connectors = await listConnectors();
  const connectedJira = connectors.find((c) => c.type === "jira" && c.status === "connected");
  if (!connectedJira) {
    await unregisterJiraMcp();
  }

  logConnectorEvent({
    provider: "jira",
    event: "connector_oauth_callback",
    connectionId,
    result: "success",
    message: purgeSecret ? "disconnected" : "disconnected",
  });

  return NextResponse.json({ connectionId, status: "disconnected", purgeSecret });
}
