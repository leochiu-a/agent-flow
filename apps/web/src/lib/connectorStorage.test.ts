import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "vitest";
import {
  getConnector,
  listConnectors,
  updateConnectorStatus,
  upsertConnector,
  type JiraConnectorRecord,
  type SlackConnectorRecord,
} from "./connectorStorage";

async function withTempCwd(fn: () => Promise<void>): Promise<void> {
  const originalCwd = process.cwd();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-connector-"));
  process.chdir(tempDir);
  try {
    await fn();
  } finally {
    process.chdir(originalCwd);
    await rm(tempDir, { recursive: true, force: true });
  }
}

test("connector record CRUD and status updates", async () => {
  await withTempCwd(async () => {
    const now = Date.now();
    const record: SlackConnectorRecord = {
      id: "conn_slack_1",
      type: "slack",
      name: "Slack - Team A",
      status: "connected",
      workspace: { teamId: "T123", teamName: "Team A", botUserId: "U999" },
      createdAt: now,
      updatedAt: now,
    };

    await upsertConnector(record);
    const loaded = await getConnector(record.id);

    assert.ok(loaded);
    assert.equal(loaded.id, "conn_slack_1");
    assert.equal((await listConnectors()).length, 1);

    const checkAt = Date.now();
    await updateConnectorStatus(record.id, "error", {
      lastCheckedAt: checkAt,
      lastError: "auth.test failed",
    });

    const updated = await getConnector(record.id);
    assert.ok(updated);
    assert.equal(updated.status, "error");
    assert.equal(updated.lastCheckedAt, checkAt);
    assert.equal(updated.lastError, "auth.test failed");
  });
});

test("Jira connector record CRUD", async () => {
  await withTempCwd(async () => {
    const now = Date.now();
    const record: JiraConnectorRecord = {
      id: "conn_jira_abc123",
      type: "jira",
      authMode: "manual",
      name: "Jira — mysite.atlassian.net",
      status: "connected",
      workspace: {
        siteUrl: "https://mysite.atlassian.net",
        email: "test@example.com",
        accountId: "user-001",
        displayName: "Test User",
      },
      createdAt: now,
      updatedAt: now,
    };

    await upsertConnector(record);
    const loaded = await getConnector(record.id);

    assert.ok(loaded);
    assert.equal(loaded.type, "jira");
    assert.equal(loaded.id, "conn_jira_abc123");
    if (loaded.type === "jira") {
      assert.equal(loaded.authMode, "manual");
      assert.equal(loaded.workspace.email, "test@example.com");
      assert.equal(loaded.workspace.siteUrl, "https://mysite.atlassian.net");
    }
  });
});

test("Jira and Slack records coexist in the same store", async () => {
  await withTempCwd(async () => {
    const now = Date.now();
    const slackRecord: SlackConnectorRecord = {
      id: "conn_slack_T123",
      type: "slack",
      name: "Slack — Workspace",
      status: "connected",
      workspace: { teamId: "T123" },
      createdAt: now,
      updatedAt: now,
    };
    const jiraRecord: JiraConnectorRecord = {
      id: "conn_jira_abc",
      type: "jira",
      authMode: "manual",
      name: "Jira — abc.atlassian.net",
      status: "connected",
      workspace: { siteUrl: "https://abc.atlassian.net", email: "user@example.com" },
      createdAt: now,
      updatedAt: now,
    };

    await upsertConnector(slackRecord);
    await upsertConnector(jiraRecord);

    const all = await listConnectors();
    assert.equal(all.length, 2);
    assert.ok(all.find((r) => r.type === "slack"));
    assert.ok(all.find((r) => r.type === "jira"));
  });
});
