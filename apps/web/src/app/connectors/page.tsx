"use client";

import Link from "next/link";
import { FileSidebar } from "@/components/FileSidebar/FileSidebar";
import { useConnectors } from "./_hooks/useConnectors";
import { SlackSection } from "./_components/SlackSection";
import { JiraSection } from "./_components/JiraSection";

export default function ConnectorsPage() {
  const {
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
  } = useConnectors();

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
          <SlackSection
            loading={loading}
            connectors={slackConnectors}
            oauthConfig={slackOauthConfig}
            testingId={testingId}
            disconnectingId={disconnectingId}
            testResult={testResult}
            onSaveConfig={saveSlackConfig}
            onRemoveConfig={removeSlackConfig}
            onTest={(id) => void testConnector(id, "slack")}
            onDisconnect={(id) => void disconnectConnector(id, "slack")}
          />

          <JiraSection
            loading={loading}
            connectors={jiraConnectors}
            testingId={testingId}
            disconnectingId={disconnectingId}
            testResult={testResult}
            onConnect={connectJira}
            onTest={(id) => void testConnector(id, "jira")}
            onDisconnect={(id) => void disconnectConnector(id, "jira")}
          />

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
