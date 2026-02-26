"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface ConnectorRecord {
  id: string;
  type: "slack";
  name: string;
  status: "connected" | "disconnected" | "error" | "connecting";
  workspace: { teamId?: string; teamName?: string; botUserId?: string };
  lastError?: string;
}

interface SlackOAuthConfigPublic {
  configured: boolean;
  redirectUri?: string;
}

function StatusBadge({ status }: { status: ConnectorRecord["status"] }) {
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

const SLACK_OAUTH_CALLBACK_PATH = "/api/connectors/slack/oauth/callback";

function buildDefaultRedirectUri(origin: string): string {
  return `${origin}${SLACK_OAUTH_CALLBACK_PATH}`;
}

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [oauthConfig, setOauthConfig] = useState<SlackOAuthConfigPublic | null>(null);

  // Configure OAuth app state
  const [showConfigure, setShowConfigure] = useState(false);
  const [cfgClientId, setCfgClientId] = useState("");
  const [cfgClientSecret, setCfgClientSecret] = useState("");
  const [cfgRedirectUri, setCfgRedirectUri] = useState("");
  const [cfgSaving, setCfgSaving] = useState(false);
  const [cfgError, setCfgError] = useState<string | null>(null);

  // Test / disconnect state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    ok: boolean;
    message?: string;
  } | null>(null);

  const fetchConnectors = useCallback(async () => {
    try {
      const [connRes, cfgRes] = await Promise.all([
        fetch("/api/connectors/slack/list"),
        fetch("/api/connectors/slack/config"),
      ]);
      const connData = (await connRes.json()) as { connectors: ConnectorRecord[] };
      const cfgData = (await cfgRes.json()) as SlackOAuthConfigPublic;
      setConnectors(connData.connectors);
      setOauthConfig(cfgData);
      if (cfgData.redirectUri) {
        setCfgRedirectUri(cfgData.redirectUri);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConnectors();
  }, [fetchConnectors]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCfgRedirectUri((value) => value || buildDefaultRedirectUri(window.location.origin));
  }, []);

  const handleSaveConfig = async () => {
    if (!cfgClientId.trim() || !cfgClientSecret.trim()) return;
    setCfgSaving(true);
    setCfgError(null);
    try {
      const fallbackRedirectUri =
        typeof window !== "undefined" ? buildDefaultRedirectUri(window.location.origin) : "";
      const res = await fetch("/api/connectors/slack/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: cfgClientId.trim(),
          clientSecret: cfgClientSecret.trim(),
          redirectUri: cfgRedirectUri.trim() || fallbackRedirectUri,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        window.location.href = "/api/connectors/slack/oauth/start?returnTo=/connectors";
      } else {
        setCfgError(data.error ?? "Failed to save");
      }
    } catch {
      setCfgError("Network error");
    } finally {
      setCfgSaving(false);
    }
  };

  const handleRemoveConfig = async () => {
    await fetch("/api/connectors/slack/config", { method: "DELETE" });
    await fetchConnectors();
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch("/api/connectors/slack/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: id, mode: "smoke" }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      setTestResult({ id, ok: data.ok, message: data.error });
      await fetchConnectors();
    } catch {
      setTestResult({ id, ok: false, message: "Network error" });
    } finally {
      setTestingId(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    setDisconnectingId(id);
    try {
      await fetch("/api/connectors/slack/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: id }),
      });
      await fetchConnectors();
    } finally {
      setDisconnectingId(null);
    }
  };

  const hasConnected = connectors.some((c) => c.status === "connected");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas text-dark">
      <header className="flex h-12 shrink-0 items-center border-b border-border bg-white px-4 shadow-sm">
        <Link href="/" className="text-sm font-bold tracking-wide text-pink hover:opacity-80">
          AGENT FLOW
        </Link>
        <span className="ml-3 text-[11px] uppercase tracking-[0.14em] text-muted-fg">
          Connectors
        </span>
      </header>

      <div className="mx-auto w-full max-w-xl flex-1 overflow-y-auto px-6 py-8">
        {/* Connected workspaces */}
        {!loading && connectors.length > 0 && (
          <div className="mb-8 flex flex-col gap-3">
            {connectors.map((c) => (
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
                      onClick={() => void handleTest(c.id)}
                      disabled={testingId === c.id || c.status === "disconnected"}
                      className="rounded-md border border-border px-2.5 py-1 text-[11px] text-ink transition hover:border-pink hover:text-pink disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {testingId === c.id ? "Testing…" : "Test"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDisconnect(c.id)}
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

        {/* ── Connect panel ── */}
        <div className="rounded-lg border border-border bg-white px-5 py-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path
                d="M6 15a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2zm1 0a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5zm2-9a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9zm0 1a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5zm9 2a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2v-2zm-1 0a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5zm-2 9a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2zm0-1a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-5z"
                fill="#E01E5A"
              />
            </svg>
            <span className="text-sm font-bold text-dark">
              {hasConnected ? "Connect another workspace" : "Connect Slack"}
            </span>
          </div>

          {/* Step 1: create app */}
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
                <strong className="text-dark">Connect with Slack</strong> to authorize via OAuth —
                no admin approval needed.
              </span>
            </li>
          </ol>

          {/* OAuth config form */}
          {!oauthConfig?.configured || showConfigure ? (
            <div className="space-y-2">
              <input
                type="text"
                value={cfgClientId}
                onChange={(e) => setCfgClientId(e.target.value)}
                placeholder="Client ID"
                className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 text-[11px] text-dark placeholder-muted-fg outline-none transition focus:border-pink"
              />
              <input
                type="password"
                value={cfgClientSecret}
                onChange={(e) => setCfgClientSecret(e.target.value)}
                placeholder="Client Secret"
                className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 text-[11px] text-dark placeholder-muted-fg outline-none transition focus:border-pink"
              />
              <input
                type="text"
                value={cfgRedirectUri}
                onChange={(e) => setCfgRedirectUri(e.target.value)}
                placeholder="Redirect URI"
                className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 font-mono text-[10px] text-dark placeholder-muted-fg outline-none transition focus:border-pink"
              />
              <div className="text-[10px] leading-relaxed text-muted-fg">
                Add the Redirect URI above to your Slack App under{" "}
                <span className="text-dark">OAuth &amp; Permissions → Redirect URLs</span>.
              </div>
              {oauthConfig?.configured && showConfigure && (
                <div className="text-[10px] leading-relaxed text-muted-fg">
                  Reconfiguration requires entering Client ID and Client Secret again for safety.
                </div>
              )}
              {cfgError && <div className="text-[11px] text-orange">{cfgError}</div>}
              <button
                type="button"
                onClick={() => void handleSaveConfig()}
                disabled={cfgSaving || !cfgClientId.trim() || !cfgClientSecret.trim()}
                className="w-full rounded-md bg-pink py-1.5 text-xs font-semibold text-white transition hover:bg-pink/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cfgSaving ? "Saving…" : "Connect with Slack"}
              </button>
              {oauthConfig?.configured && showConfigure && (
                <button
                  type="button"
                  onClick={() => {
                    setShowConfigure(false);
                    setCfgError(null);
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
                <span className="font-mono text-[10px]">{oauthConfig.redirectUri}</span>
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
                  onClick={() => setShowConfigure(true)}
                  className="rounded-md border border-border px-3 py-1.5 text-[11px] text-ink transition hover:border-pink hover:text-pink"
                >
                  Reconfigure
                </button>
                <button
                  type="button"
                  onClick={() => void handleRemoveConfig()}
                  className="rounded-md border border-border px-3 py-1.5 text-[11px] text-ink transition hover:border-orange hover:text-orange"
                >
                  Remove credentials
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 rounded-lg border border-border bg-surface px-4 py-3 text-[11px] text-ink">
          <div className="font-semibold text-dark">How it works</div>
          <div className="mt-1 leading-relaxed">
            After authorization, the token is written to{" "}
            <code className="text-pink">.claude/settings.json</code> as an MCP server config. When
            Claude Code runs a workflow step, it automatically starts the Slack MCP server — no
            extra setup needed.
          </div>
        </div>
      </div>
    </div>
  );
}
