import { NextRequest, NextResponse } from "next/server";
import { getConnector, updateConnectorStatus, deleteSecret } from "@/lib/connectorStorage";
import { logConnectorEvent } from "@/lib/connectorLogger";
import { unregisterSlackMcp } from "@/lib/claudeSettingsManager";

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
  if (!connector) {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 });
  }

  if (purgeSecret) {
    await deleteSecret(connectionId);
  }

  await updateConnectorStatus(connectionId, "disconnected");

  // Remove Slack MCP from .claude/settings.json so Claude Code no longer has access
  await unregisterSlackMcp();

  logConnectorEvent({
    event: "connector_oauth_callback", // reuse closest event type; a future "connector_disconnect" event can be added
    connectionId,
    result: "success",
    message: purgeSecret ? "disconnected and secret purged" : "disconnected (secret retained)",
  });

  return NextResponse.json({ connectionId, status: "disconnected", purgeSecret });
}
