import { NextRequest, NextResponse } from "next/server";
import { getConnector, updateConnectorStatus, deleteSecret } from "@/lib/connectorStorage";
import { logConnectorEvent } from "@/lib/connectorLogger";

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

  if (purgeSecret) {
    await deleteSecret(connectionId);
  }

  await updateConnectorStatus(connectionId, "disconnected");

  logConnectorEvent({
    provider: "jira",
    event: "connector_oauth_callback",
    connectionId,
    result: "success",
    message: purgeSecret ? "disconnected and secret purged" : "disconnected (secret retained)",
  });

  return NextResponse.json({ connectionId, status: "disconnected", purgeSecret });
}
