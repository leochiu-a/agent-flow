import { useEffect, useState } from "react";
import type { OAuthConfigPublic, SlackConnectorRecord, TestResult } from "../_hooks/useConnectors";
import { StatusBadge } from "./StatusBadge";

interface SlackSectionProps {
  loading: boolean;
  connectors: SlackConnectorRecord[];
  oauthConfig: OAuthConfigPublic | null;
  testingId: string | null;
  disconnectingId: string | null;
  testResult: TestResult | null;
  onSaveConfig: (clientId: string, clientSecret: string, redirectUri: string) => Promise<void>;
  onRemoveConfig: () => Promise<void>;
  onTest: (id: string) => void;
  onDisconnect: (id: string) => void;
}

export function SlackSection({
  loading,
  connectors,
  oauthConfig,
  testingId,
  disconnectingId,
  testResult,
  onSaveConfig,
  onRemoveConfig,
  onTest,
  onDisconnect,
}: SlackSectionProps) {
  const [showConfigure, setShowConfigure] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (oauthConfig?.redirectUri) setRedirectUri(oauthConfig.redirectUri);
  }, [oauthConfig?.redirectUri]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRedirectUri((v) => v || `${window.location.origin}/api/connectors/slack/oauth/callback`);
  }, []);

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const fallback =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/connectors/slack/oauth/callback`
          : "";
      await onSaveConfig(clientId.trim(), clientSecret.trim(), redirectUri.trim() || fallback);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const hasConnected = connectors.some((c) => c.status === "connected");
  const showForm = !oauthConfig?.configured || showConfigure;

  return (
    <>
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
                  {c.lastError && <div className="mt-1 text-[11px] text-orange">{c.lastError}</div>}
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
                    onClick={() => onTest(c.id)}
                    disabled={testingId === c.id || c.status === "disconnected"}
                    className="rounded-md border border-border px-2.5 py-1 text-[11px] text-ink transition hover:border-pink hover:text-pink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {testingId === c.id ? "Testing…" : "Test"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDisconnect(c.id)}
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

      {!hasConnected && (
        <div className="rounded-lg border border-border bg-white px-5 py-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path
                d="M6 15a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2zm1 0a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5zm2-9a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9zm0 1a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5zm9 2a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2v-2zm-1 0a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5zm-2 9a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2zm0-1a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-5z"
                fill="#E01E5A"
              />
            </svg>
            <span className="text-sm font-bold text-dark">
              {hasConnected ? "Connect another Slack workspace" : "Connect Slack"}
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
                <strong className="text-dark">Connect with Slack</strong> to authorize via OAuth.
              </span>
            </li>
          </ol>

          {showForm ? (
            <div className="space-y-2">
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Client ID"
                className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 text-[11px] text-dark placeholder-muted-fg outline-none transition focus:border-pink"
              />
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Client Secret"
                className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 text-[11px] text-dark placeholder-muted-fg outline-none transition focus:border-pink"
              />
              <input
                type="text"
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
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
              {error && <div className="text-[11px] text-orange">{error}</div>}
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !clientId.trim() || !clientSecret.trim()}
                className="w-full rounded-md bg-pink py-1.5 text-xs font-semibold text-white transition hover:bg-pink/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving…" : "Connect with Slack"}
              </button>
              {oauthConfig?.configured && showConfigure && (
                <button
                  type="button"
                  onClick={() => {
                    setShowConfigure(false);
                    setError(null);
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
                <span className="font-mono text-[10px]">{oauthConfig?.redirectUri}</span>
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
                  onClick={() => void onRemoveConfig()}
                  className="rounded-md border border-border px-3 py-1.5 text-[11px] text-ink transition hover:border-orange hover:text-orange"
                >
                  Remove credentials
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
