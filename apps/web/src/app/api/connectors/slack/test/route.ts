import { NextRequest, NextResponse } from "next/server";
import { getConnector, loadSecret, updateConnectorStatus } from "@/lib/connectorStorage";
import { logConnectorEvent } from "@/lib/connectorLogger";

export const runtime = "nodejs";

interface TestRequest {
  connectionId: string;
  mode?: "smoke";
}

interface SlackAuthTestResponse {
  ok: boolean;
  error?: string;
  team?: string;
  user?: string;
  user_id?: string;
  team_id?: string;
  bot_id?: string;
}

export async function POST(req: NextRequest) {
  const { connectionId, mode = "smoke" } = (await req.json()) as TestRequest;

  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  logConnectorEvent({
    event: "connector_test_start",
    connectionId,
  });

  const connector = await getConnector(connectionId);
  if (!connector) {
    logConnectorEvent({
      event: "connector_error",
      connectionId,
      result: "failed",
      errorType: "CONFIG_ERROR",
      message: "Connector not found",
    });
    return NextResponse.json({ error: "Connector not found" }, { status: 404 });
  }

  if (connector.status === "disconnected") {
    return NextResponse.json(
      { connectionId, status: "disconnected", ok: false, message: "Connector is disconnected" },
      { status: 200 },
    );
  }

  let token: string;
  try {
    token = await loadSecret(connectionId);
  } catch {
    logConnectorEvent({
      event: "connector_error",
      connectionId,
      result: "failed",
      errorType: "AUTH_ERROR",
      message: "Failed to load connector secret",
    });
    await updateConnectorStatus(connectionId, "error", {
      lastCheckedAt: Date.now(),
      lastError: "Failed to decrypt secret",
    });
    return NextResponse.json(
      { connectionId, ok: false, error: "Failed to load token" },
      { status: 500 },
    );
  }

  // Smoke test: call slack.auth.test to verify the bot token is valid
  let authResult: SlackAuthTestResponse;
  try {
    const res = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    authResult = (await res.json()) as SlackAuthTestResponse;
  } catch (err) {
    logConnectorEvent({
      event: "connector_error",
      connectionId,
      result: "failed",
      errorType: "RUNTIME_ERROR",
      message: "auth.test request failed",
    });
    console.error("[connector] auth.test error:", err instanceof Error ? err.message : "unknown");
    await updateConnectorStatus(connectionId, "error", {
      lastCheckedAt: Date.now(),
      lastError: "auth.test request failed",
    });
    return NextResponse.json(
      { connectionId, ok: false, error: "Slack API unreachable" },
      { status: 502 },
    );
  }

  const now = Date.now();
  if (authResult.ok) {
    await updateConnectorStatus(connectionId, "connected", { lastCheckedAt: now });
    logConnectorEvent({
      event: "connector_test_done",
      connectionId,
      result: "success",
    });
    return NextResponse.json({
      connectionId,
      mode,
      ok: true,
      workspace: { teamId: authResult.team_id, teamName: authResult.team },
    });
  } else {
    const errMsg = authResult.error ?? "unknown";
    await updateConnectorStatus(connectionId, "error", {
      lastCheckedAt: now,
      lastError: errMsg,
    });
    logConnectorEvent({
      event: "connector_test_done",
      connectionId,
      result: "failed",
      errorType: "AUTH_ERROR",
      message: `auth.test failed: ${errMsg}`,
    });
    return NextResponse.json({ connectionId, ok: false, error: errMsg }, { status: 200 });
  }
}
