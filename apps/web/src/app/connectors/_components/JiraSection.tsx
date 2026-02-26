import { useState } from "react";
import type { JiraConnectorRecord, TestResult } from "../_hooks/useConnectors";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";

interface JiraSectionProps {
  loading: boolean;
  connectors: JiraConnectorRecord[];
  testingId: string | null;
  disconnectingId: string | null;
  testResult: TestResult | null;
  onConnect: (siteUrl: string, email: string, apiToken: string) => Promise<void>;
  onTest: (id: string) => void;
  onDisconnect: (id: string) => void;
}

export function JiraSection({
  loading,
  connectors,
  testingId,
  disconnectingId,
  testResult,
  onConnect,
  onTest,
  onDisconnect,
}: JiraSectionProps) {
  const [siteUrl, setSiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReconnectPanel, setShowReconnectPanel] = useState(false);

  const handleConnect = async () => {
    if (!siteUrl.trim() || !email.trim() || !apiToken.trim()) return;
    setConnecting(true);
    setError(null);
    try {
      await onConnect(siteUrl.trim(), email.trim(), apiToken.trim());
      setSiteUrl("");
      setEmail("");
      setApiToken("");
      setShowReconnectPanel(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <>
      {!loading && connectors.length > 0 && (
        <div className="mb-4 mt-8 flex flex-col gap-3">
          {connectors.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-border bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-dark">{c.name}</span>
                    {c.status !== "disconnected" && <StatusBadge status={c.status} />}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-fg">
                    {c.workspace.email}
                    {c.workspace.displayName && ` · ${c.workspace.displayName}`}
                  </div>
                  <div className="font-mono text-[11px] text-muted-fg">
                    {c.workspace.siteUrl.replace(/^https?:\/\//, "")}
                  </div>
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
                  {c.status === "disconnected" ? (
                    <Button variant="pink" size="xs" onClick={() => setShowReconnectPanel(true)}>
                      Connect
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => onTest(c.id)}
                        disabled={testingId === c.id}
                      >
                        {testingId === c.id ? "Testing…" : "Test"}
                      </Button>
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => onDisconnect(c.id)}
                        disabled={disconnectingId === c.id}
                      >
                        {disconnectingId === c.id ? "…" : "Disconnect"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (connectors.length === 0 || showReconnectPanel) && (
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
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://your-domain.atlassian.net"
              className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 font-mono text-[10px] text-dark placeholder-muted-fg outline-none transition focus:border-pink"
            />
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 text-[11px] text-dark placeholder-muted-fg outline-none transition focus:border-pink"
            />
            <input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="API Token"
              className="w-full rounded-md border border-border bg-canvas px-3 py-1.5 text-[11px] text-dark placeholder-muted-fg outline-none transition focus:border-pink"
            />
            {error && <div className="text-[11px] text-orange">{error}</div>}
            <Button
              variant="pink"
              size="sm"
              className="w-full"
              onClick={() => void handleConnect()}
              disabled={connecting || !siteUrl.trim() || !email.trim() || !apiToken.trim()}
            >
              {connecting ? "Connecting…" : "Connect Jira"}
            </Button>
            {showReconnectPanel && (
              <Button
                variant="outline"
                size="sm"
                className="w-full font-semibold"
                onClick={() => {
                  setShowReconnectPanel(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
