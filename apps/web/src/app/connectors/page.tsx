"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileSidebar } from "@/components/FileSidebar/FileSidebar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlackConnectorRecord {
  id: string;
  type: "slack";
  name: string;
  status: "connected" | "disconnected" | "error" | "connecting";
  workspace: { teamId?: string; teamName?: string; botUserId?: string };
  lastError?: string;
}

interface JiraConnectorRecord {
  id: string;
  type: "jira";
  name: string;
  status: "connected" | "disconnected" | "error" | "connecting";
  workspace: { siteUrl: string; email: string; accountId?: string; displayName?: string };
  lastError?: string;
}

type ConnectorStatus = "connected" | "disconnected" | "error" | "connecting";

interface OAuthConfigPublic {
  configured: boolean;
  redirectUri?: string;
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ConnectorStatus }) {
  const styles = {
    connected: "bg-pink/10 text-pink border border-pink/30",
    disconnected: "bg-disabled text-ink border border-border",
    error: "bg-orange/10 text-orange border border-orange/30",
    connecting: "bg-disabled text-ink border border-border",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[status]}`}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ConnectorsPage() {
  // ── Slack state ──
  const [slackConnectors, setSlackConnectors] = useState<SlackConnectorRecord[]>([]);
  const [slackOauthConfig, setSlackOauthConfig] = useState<OAuthConfigPublic | null>(null);
  const [showSlackConfigure, setShowSlackConfigure] = useState(false);
  const [slackClientId, setSlackClientId] = useState("");
  const [slackClientSecret, setSlackClientSecret] = useState("");
  const [slackRedirectUri, setSlackRedirectUri] = useState("");
  const [slackCfgSaving, setSlackCfgSaving] = useState(false);
  const [slackCfgError, setSlackCfgError] = useState<string | null>(null);

  // ── Jira state ──
  const [jiraConnectors, setJiraConnectors] = useState<JiraConnectorRecord[]>([]);
  const [jiraSiteUrl, setJiraSiteUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraApiToken, setJiraApiToken] = useState("");
  const [jiraConnecting, setJiraConnecting] = useState(false);
  const [jiraConnectError, setJiraConnectError] = useState<string | null>(null);

  // ── Shared test/disconnect state ──
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    ok: boolean;
    message?: string;
  } | null>(null);

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
      if (slackCfg.redirectUri) setSlackRedirectUri(slackCfg.redirectUri);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SLACK_OAUTH_CALLBACK_PATH = "/api/connectors/slack/oauth/callback";
    setSlackRedirectUri((v) => v || `${window.location.origin}${SLACK_OAUTH_CALLBACK_PATH}`);
  }, []);

  // ── Slack handlers ──

  const handleSlackSaveConfig = async () => {
    if (!slackClientId.trim() || !slackClientSecret.trim()) return;
    setSlackCfgSaving(true);
    setSlackCfgError(null);
    try {
      const fallback =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/connectors/slack/oauth/callback`
          : "";
      const res = await fetch("/api/connectors/slack/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: slackClientId.trim(),
          clientSecret: slackClientSecret.trim(),
          redirectUri: slackRedirectUri.trim() || fallback,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        window.location.href = "/api/connectors/slack/oauth/start?returnTo=/connectors";
      } else {
        setSlackCfgError(data.error ?? "Failed to save");
      }
    } catch {
      setSlackCfgError("Network error");
    } finally {
      setSlackCfgSaving(false);
    }
  };

  const handleSlackRemoveConfig = async () => {
    await fetch("/api/connectors/slack/config", { method: "DELETE" });
    await fetchAll();
  };

  // ── Jira handlers ──

  const handleJiraConnect = async () => {
    if (!jiraSiteUrl.trim() || !jiraEmail.trim() || !jiraApiToken.trim()) return;
    setJiraConnecting(true);
    setJiraConnectError(null);
    try {
      const res = await fetch("/api/connectors/jira/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: jiraSiteUrl.trim(),
          email: jiraEmail.trim(),
          apiToken: jiraApiToken.trim(),
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setJiraSiteUrl("");
        setJiraEmail("");
        setJiraApiToken("");
        await fetchAll();
      } else {
        setJiraConnectError(data.error ?? "Connection failed");
      }
    } catch {
      setJiraConnectError("Network error");
    } finally {
      setJiraConnecting(false);
    }
  };

  // ── Shared test/disconnect ──

  const handleTest = async (id: string, provider: "slack" | "jira") => {
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

  const handleDisconnect = async (id: string, provider: "slack" | "jira") => {
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

  const hasSlackConnected = slackConnectors.some((c) => c.status === "connected");
  const hasJiraConnected = jiraConnectors.some((c) => c.status === "connected");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas text-dark">
      <header className="flex h-12 shrink-0 items-center border-b border-border bg-white px-4 shadow-sm">
        <Link href="/" className="text-sm font-bold tracking-wide text-pink hover:opacity-80">
          AGENT FLOW
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <FileSidebar />

        <div className="mx-auto w-full max-w-xl flex-1 overflow-y-auto px-6 py-8">
          {/* ══════════════════════════════════════════════════════════
              SLACK SECTION
          ══════════════════════════════════════════════════════════ */}

          {/* Connected Slack workspaces */}
          {!loading && slackConnectors.length > 0 && (
            <div className="mb-8 flex flex-col gap-3">
              {slackConnectors.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-border bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-dark">{c.name}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      {c.workspace.teamId && (
                        <div className="mt-0.5 text-[11px] text-muted-fg">
                          {c.workspace.teamId}
                          {c.workspace.botUserId && ` · ${c.workspace.botUserId}`}
                        </div>
                      )}
                      {c.lastError && (
                        <div className="mt-1 text-[11px] text-orange">{c.lastError}</div>
                      )}
                      {testResult?.id === c.id && (
                        <div
                          className={`mt-1 text-[11px] ${testResult.ok ? "text-pink" : "text-orange"}`}
                        >
                          {testResult.ok
                            ? "✓ Connection OK"
                            : `✗ ${testResult.message ?? "Test failed"}`}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleTest(c.id, "slack")}
                        disabled={testingId === c.id || c.status === "disconnected"}
                        className="rounded-md border border-border px-2.5 py-1 text-[11px] text-ink transition hover:border-pink hover:text-pink disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {testingId === c.id ? "Testing…" : "Test"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDisconnect(c.id, "slack")}
                        disabled={disconnectingId === c.id || c.status === "disconnected"}
                        className="rounded-md border border-border px-2.5 py-1 text-[11px] text-ink transition hover:border-orange hover:text-orange disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {disconnectingId === c.id ? "…" : "Disconnect"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Slack connect panel — only shown when no active connection */}
          {!hasSlackConnected && (
            <div className="rounded-lg border border-border bg-white px-5 py-5 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <path
                    d="M6 15a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2zm1 0a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5zm2-9a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9zm0 1a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5zm9 2a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2v-2zm-1 0a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5zm-2 9a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2zm0-1a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-5z"
                    fill="#E01E5A"
                  />
                </svg>
                <span className="text-sm font-bold text-dark">
                  {hasSlackConnected ? "Connect another Slack workspace" : "Connect Slack"}
                </span>
              </div>

              <ol className="mb-5 space-y-2 text-[11px] text-ink">
                <li className="flex gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-pink/10 text-[9px] font-bold text-pink">
                    1
                  </span>
                  <span>
                    <a
                      href="https://api.slack.com/apps?new_app=1"
                      target="_blank"
                      rel="noreferrer"
                      className="text-pink underline underline-offset-2 hover:opacity-80"
                    >
                      Create a Slack App
                    </a>{" "}
                    at api.slack.com, then copy its{" "}
                    <code className="rounded bg-disabled px-1 text-dark">Client ID</code> and{" "}
                    <code className="rounded bg-disabled px-1 text-dark">Client Secret</code>.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-pink/10 text-[9px] font-bold text-pink">
                    2
                  </span>
                  <span>
                    Enter your credentials below, then click{" "}
                    <strong className="text-dark">Connect with Slack</strong> to authorize via
                    OAuth.
                  </span>
                </li>
              </ol>

              {!slackOauthConfig?.configured || showSlackConfigure ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={slackClientId}
                    onChange={(e) => setSlackClientId(e.target.value)}
                    placeholder="Client ID"
                    className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 text-[11px] text-dark placeholder-muted-fg outline-none transition focus:border-pink"
                  />
                  <input
                    type="password"
                    value={slackClientSecret}
                    onChange={(e) => setSlackClientSecret(e.target.value)}
                    placeholder="Client Secret"
                    className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 text-[11px] text-dark placeholder-muted-fg outline-none transition focus:border-pink"
                  />
                  <input
                    type="text"
                    value={slackRedirectUri}
                    onChange={(e) => setSlackRedirectUri(e.target.value)}
                    placeholder="Redirect URI"
                    className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 font-mono text-[10px] text-dark placeholder-muted-fg outline-none transition focus:border-pink"
                  />
                  <div className="text-[10px] leading-relaxed text-muted-fg">
                    Add the Redirect URI above to your Slack App under{" "}
                    <span className="text-dark">OAuth &amp; Permissions → Redirect URLs</span>.
                  </div>
                  {slackOauthConfig?.configured && showSlackConfigure && (
                    <div className="text-[10px] leading-relaxed text-muted-fg">
                      Reconfiguration requires entering Client ID and Client Secret again for
                      safety.
                    </div>
                  )}
                  {slackCfgError && <div className="text-[11px] text-orange">{slackCfgError}</div>}
                  <button
                    type="button"
                    onClick={() => void handleSlackSaveConfig()}
                    disabled={slackCfgSaving || !slackClientId.trim() || !slackClientSecret.trim()}
                    className="w-full rounded-md bg-pink py-1.5 text-xs font-semibold text-white transition hover:bg-pink/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {slackCfgSaving ? "Saving…" : "Connect with Slack"}
                  </button>
                  {slackOauthConfig?.configured && showSlackConfigure && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSlackConfigure(false);
                        setSlackCfgError(null);
                      }}
                      className="w-full rounded-md border border-border py-1.5 text-xs font-semibold text-ink transition hover:border-pink hover:text-pink"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[11px] text-muted-fg">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-pink" />
                    OAuth app configured
                    <span className="font-mono text-[10px]">{slackOauthConfig.redirectUri}</span>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href="/api/connectors/slack/oauth/start?returnTo=/connectors"
                      className="inline-flex flex-1 items-center justify-center rounded-md bg-pink py-1.5 text-xs font-semibold text-white transition hover:bg-pink/90"
                    >
                      Connect with Slack
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowSlackConfigure(true)}
                      className="rounded-md border border-border px-3 py-1.5 text-[11px] text-ink transition hover:border-pink hover:text-pink"
                    >
                      Reconfigure
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSlackRemoveConfig()}
                      className="rounded-md border border-border px-3 py-1.5 text-[11px] text-ink transition hover:border-orange hover:text-orange"
                    >
                      Remove credentials
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              JIRA SECTION
          ══════════════════════════════════════════════════════════ */}

          {/* Connected Jira sites */}
          {!loading && jiraConnectors.length > 0 && (
            <div className="mb-4 mt-8 flex flex-col gap-3">
              {jiraConnectors.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-border bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-dark">{c.name}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-fg">
                        {c.workspace.email}
                        {c.workspace.displayName && ` · ${c.workspace.displayName}`}
                      </div>
                      <div className="text-[11px] font-mono text-muted-fg">
                        {c.workspace.siteUrl.replace(/^https?:\/\//, "")}
                      </div>
                      {c.lastError && (
                        <div className="mt-1 text-[11px] text-orange">{c.lastError}</div>
                      )}
                      {testResult?.id === c.id && (
                        <div
                          className={`mt-1 text-[11px] ${testResult.ok ? "text-pink" : "text-orange"}`}
                        >
                          {testResult.ok
                            ? "✓ Connection OK"
                            : `✗ ${testResult.message ?? "Test failed"}`}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleTest(c.id, "jira")}
                        disabled={testingId === c.id || c.status === "disconnected"}
                        className="rounded-md border border-border px-2.5 py-1 text-[11px] text-ink transition hover:border-pink hover:text-pink disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {testingId === c.id ? "Testing…" : "Test"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDisconnect(c.id, "jira")}
                        disabled={disconnectingId === c.id || c.status === "disconnected"}
                        className="rounded-md border border-border px-2.5 py-1 text-[11px] text-ink transition hover:border-orange hover:text-orange disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {disconnectingId === c.id ? "…" : "Disconnect"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Jira connect panel — only shown when no active connection */}
          {!hasJiraConnected && (
            <div className="mt-6 rounded-lg border border-border bg-white px-5 py-5 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 32 32" fill="none" className="shrink-0">
                  <path
                    d="M15.977 0C7.163 0 0 7.163 0 15.977c0 8.815 7.163 16.046 15.977 16.046 8.815 0 16.046-7.231 16.046-16.046C32.023 7.163 24.792 0 15.977 0zm.137 5.534l6.617 9.72-6.617 9.72-6.617-9.72 6.617-9.72z"
                    fill="#2684FF"
                  />
                </svg>
                <span className="text-sm font-bold text-dark">Connect Jira</span>
              </div>

              <ol className="mb-5 space-y-2 text-[11px] text-ink">
                <li className="flex gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-pink/10 text-[9px] font-bold text-pink">
                    1
                  </span>
                  <span>
                    Go to{" "}
                    <a
                      href="https://id.atlassian.com/manage-profile/security/api-tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="text-pink underline underline-offset-2 hover:opacity-80"
                    >
                      Atlassian API Tokens
                    </a>{" "}
                    and create a new token. Copy the generated value.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-pink/10 text-[9px] font-bold text-pink">
                    2
                  </span>
                  <span>
                    Enter your Jira site URL, Atlassian account email, and the API token below.
                  </span>
                </li>
              </ol>

              <div className="space-y-2">
                <input
                  type="text"
                  value={jiraSiteUrl}
                  onChange={(e) => setJiraSiteUrl(e.target.value)}
                  placeholder="https://your-domain.atlassian.net"
                  className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 font-mono text-[10px] text-dark placeholder-muted-fg outline-none transition focus:border-pink"
                />
                <input
                  type="text"
                  value={jiraEmail}
                  onChange={(e) => setJiraEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 text-[11px] text-dark placeholder-muted-fg outline-none transition focus:border-pink"
                />
                <input
                  type="password"
                  value={jiraApiToken}
                  onChange={(e) => setJiraApiToken(e.target.value)}
                  placeholder="API Token"
                  className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 text-[11px] text-dark placeholder-muted-fg outline-none transition focus:border-pink"
                />
                {jiraConnectError && (
                  <div className="text-[11px] text-orange">{jiraConnectError}</div>
                )}
                <button
                  type="button"
                  onClick={() => void handleJiraConnect()}
                  disabled={
                    jiraConnecting ||
                    !jiraSiteUrl.trim() ||
                    !jiraEmail.trim() ||
                    !jiraApiToken.trim()
                  }
                  className="w-full rounded-md bg-pink py-1.5 text-xs font-semibold text-white transition hover:bg-pink/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {jiraConnecting ? "Connecting…" : "Connect Jira"}
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 rounded-lg border border-border bg-surface px-4 py-3 text-[11px] text-ink">
            <div className="font-semibold text-dark">How it works</div>
            <div className="mt-1 leading-relaxed">
              <strong>Slack</strong> — Token is written to{" "}
              <code className="text-pink">.claude/settings.json</code> as an MCP server config.
              Claude Code starts the Slack MCP server automatically on each workflow step.
            </div>
            <div className="mt-1 leading-relaxed">
              <strong>Jira</strong> — API token is encrypted and stored locally. Workflow steps
              receive <code className="text-pink">JIRA_SITE_URL</code>,{" "}
              <code className="text-pink">JIRA_USER_EMAIL</code>, and{" "}
              <code className="text-pink">JIRA_API_TOKEN</code> as environment variables.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
