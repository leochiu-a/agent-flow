"use client";

import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SlackConnectorRecord {
  id: string;
  type: "slack";
  name: string;
  status: ConnectorStatus;
  workspace: { teamId?: string; teamName?: string; botUserId?: string };
  lastError?: string;
}

export interface JiraConnectorRecord {
  id: string;
  type: "jira";
  name: string;
  status: ConnectorStatus;
  workspace: { siteUrl: string; email: string; accountId?: string; displayName?: string };
  lastError?: string;
}

export type ConnectorStatus = "connected" | "disconnected" | "error" | "connecting";

export interface OAuthConfigPublic {
  configured: boolean;
  redirectUri?: string;
}

export type TestResult = { id: string; ok: boolean; message?: string };

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useConnectors() {
  const [slackConnectors, setSlackConnectors] = useState<SlackConnectorRecord[]>([]);
  const [slackOauthConfig, setSlackOauthConfig] = useState<OAuthConfigPublic | null>(null);
  const [jiraConnectors, setJiraConnectors] = useState<JiraConnectorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [slackConnRes, slackCfgRes, jiraConnRes] = await Promise.all([
        fetch("/api/connectors/slack/list"),
        fetch("/api/connectors/slack/config"),
        fetch("/api/connectors/jira/list"),
      ]);
      const slackData = (await slackConnRes.json()) as { connectors: SlackConnectorRecord[] };
      const slackCfg = (await slackCfgRes.json()) as OAuthConfigPublic;
      const jiraData = (await jiraConnRes.json()) as { connectors: JiraConnectorRecord[] };

      setSlackConnectors(slackData.connectors);
      setSlackOauthConfig(slackCfg);
      setJiraConnectors(jiraData.connectors);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // ── Slack ──

  const saveSlackConfig = async (clientId: string, clientSecret: string, redirectUri: string) => {
    const res = await fetch("/api/connectors/slack/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret, redirectUri }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (data.ok) {
      window.location.href = "/api/connectors/slack/oauth/start?returnTo=/connectors";
    } else {
      throw new Error(data.error ?? "Failed to save");
    }
  };

  const removeSlackConfig = async () => {
    await fetch("/api/connectors/slack/config", { method: "DELETE" });
    await fetchAll();
  };

  // ── Jira ──

  const connectJira = async (siteUrl: string, email: string, apiToken: string) => {
    const res = await fetch("/api/connectors/jira/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteUrl, email, apiToken }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) throw new Error(data.error ?? "Connection failed");
    await fetchAll();
  };

  // ── Shared ──

  const testConnector = async (id: string, provider: "slack" | "jira") => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/connectors/${provider}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: id, mode: "smoke" }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      setTestResult({ id, ok: data.ok, message: data.error });
      await fetchAll();
    } catch {
      setTestResult({ id, ok: false, message: "Network error" });
    } finally {
      setTestingId(null);
    }
  };

  const disconnectConnector = async (id: string, provider: "slack" | "jira") => {
    setDisconnectingId(id);
    try {
      await fetch(`/api/connectors/${provider}/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: id }),
      });
      await fetchAll();
    } finally {
      setDisconnectingId(null);
    }
  };

  return {
    slackConnectors,
    slackOauthConfig,
    jiraConnectors,
    loading,
    testingId,
    disconnectingId,
    testResult,
    saveSlackConfig,
    removeSlackConfig,
    connectJira,
    testConnector,
    disconnectConnector,
  };
}
