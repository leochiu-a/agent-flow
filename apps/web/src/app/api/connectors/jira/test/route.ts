import { NextRequest, NextResponse } from "next/server";
import { getConnector, loadJiraTokenBundle, updateConnectorStatus } from "@/lib/connectorStorage";
import { logConnectorEvent } from "@/lib/connectorLogger";
import type { JiraConnectorRecord } from "@/lib/connectorStorage";

export const runtime = "nodejs";

interface TestRequest {
  connectionId: string;
  mode?: "smoke";
}

interface AtlassianMyselfResponse {
  accountId?: string;
  displayName?: string;
  emailAddress?: string;
}

function buildBasicAuth(email: string, apiToken: string): string {
  return `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;
}

export async function POST(req: NextRequest) {
  const { connectionId, mode = "smoke" } = (await req.json()) as TestRequest;

  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  logConnectorEvent({ provider: "jira", event: "connector_test_start", connectionId });

  const connector = await getConnector(connectionId);
  if (!connector || connector.type !== "jira") {
    logConnectorEvent({
      provider: "jira",
      event: "connector_error",
      connectionId,
      result: "failed",
      errorType: "CONFIG_ERROR",
      message: "Jira connector not found",
    });
    return NextResponse.json({ error: "Connector not found" }, { status: 404 });
  }

  if (connector.status === "disconnected") {
    return NextResponse.json(
      { connectionId, status: "disconnected", ok: false, message: "Connector is disconnected" },
      { status: 200 },
    );
  }

  const jiraConnector = connector as JiraConnectorRecord;

  let apiToken: string;
  try {
    const bundle = await loadJiraTokenBundle(connectionId);
    apiToken = bundle.apiToken;
  } catch {
    logConnectorEvent({
      provider: "jira",
      event: "connector_error",
      connectionId,
      result: "failed",
      errorType: "AUTH_ERROR",
      message: "Failed to load Jira token",
    });
    await updateConnectorStatus(connectionId, "error", {
      lastCheckedAt: Date.now(),
      lastError: "Failed to decrypt token",
    });
    return NextResponse.json(
      { connectionId, ok: false, error: "Failed to load token" },
      { status: 500 },
    );
  }

  const { siteUrl, email } = jiraConnector.workspace;

  let myself: AtlassianMyselfResponse;
  try {
    const res = await fetch(`${siteUrl}/rest/api/3/myself`, {
      headers: {
        Authorization: buildBasicAuth(email, apiToken),
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const now = Date.now();
      const errMsg = `HTTP ${res.status}`;
      await updateConnectorStatus(connectionId, "error", { lastCheckedAt: now, lastError: errMsg });
      logConnectorEvent({
        provider: "jira",
        event: "connector_test_done",
        connectionId,
        result: "failed",
        errorType: "AUTH_ERROR",
        message: `myself returned ${errMsg}`,
      });
      return NextResponse.json({ connectionId, ok: false, error: errMsg }, { status: 200 });
    }

    myself = (await res.json()) as AtlassianMyselfResponse;
  } catch {
    const now = Date.now();
    await updateConnectorStatus(connectionId, "error", {
      lastCheckedAt: now,
      lastError: "Jira API unreachable",
    });
    logConnectorEvent({
      provider: "jira",
      event: "connector_error",
      connectionId,
      result: "failed",
      errorType: "RUNTIME_ERROR",
      message: "myself request failed",
    });
    return NextResponse.json(
      { connectionId, ok: false, error: "Jira API unreachable" },
      { status: 502 },
    );
  }

  const now = Date.now();
  await updateConnectorStatus(connectionId, "connected", { lastCheckedAt: now });
  logConnectorEvent({
    provider: "jira",
    event: "connector_test_done",
    connectionId,
    result: "success",
  });

  return NextResponse.json({
    connectionId,
    mode,
    ok: true,
    site: { siteUrl },
    user: {
      accountId: myself.accountId,
      displayName: myself.displayName,
      email: myself.emailAddress,
    },
  });
}
