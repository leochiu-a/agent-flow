import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "vitest";
import {
  deleteSecret,
  getConnector,
  listConnectors,
  loadSecret,
  loadJiraTokenBundle,
  saveSecret,
  saveJiraTokenBundle,
  updateConnectorStatus,
  upsertConnector,
  type SlackConnectorRecord,
  type JiraConnectorRecord,
  type JiraTokenBundle,
} from "./connectorStorage";

const VALID_MASTER_KEY = Buffer.alloc(32, 7).toString("base64");

async function withTempCwd(fn: () => Promise<void>): Promise<void> {
  const originalCwd = process.cwd();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-connector-"));
  process.chdir(tempDir);

  const originalKey = process.env.CONNECTOR_MASTER_KEY;
  process.env.CONNECTOR_MASTER_KEY = VALID_MASTER_KEY;

  try {
    await fn();
  } finally {
    if (originalKey === undefined) {
      delete process.env.CONNECTOR_MASTER_KEY;
    } else {
      process.env.CONNECTOR_MASTER_KEY = originalKey;
    }
    process.chdir(originalCwd);
    await rm(tempDir, { recursive: true, force: true });
  }
}

test("saveSecret/loadSecret roundtrip and encrypted payload", async () => {
  await withTempCwd(async () => {
    const secretRef = await saveSecret("conn_slack_1", "xoxb-token");
    const loaded = await loadSecret("conn_slack_1");
    const persisted = await readFile(secretRef, "utf-8");

    assert.equal(loaded, "xoxb-token");
    assert.ok(!persisted.includes("xoxb-token"));
    assert.match(secretRef, /conn_slack_1\.enc$/);
  });
});

test("saveSecret rejects invalid connection id", async () => {
  await withTempCwd(async () => {
    await assert.rejects(() => saveSecret("../bad-id", "token"), /Invalid connectionId/);
  });
});

test("invalid CONNECTOR_MASTER_KEY length fails encryption", async () => {
  await withTempCwd(async () => {
    process.env.CONNECTOR_MASTER_KEY = Buffer.alloc(16).toString("base64");
    await assert.rejects(() => saveSecret("conn_slack_1", "token"), /must be 32 bytes/);
  });
});

test("connector record CRUD and status updates", async () => {
  await withTempCwd(async () => {
    const now = Date.now();
    const record: SlackConnectorRecord = {
      id: "conn_slack_1",
      type: "slack",
      name: "Slack - Team A",
      status: "connected",
      workspace: { teamId: "T123", teamName: "Team A", botUserId: "U999" },
      mcpProfile: { serverName: "slack", transport: "stdio" },
      secretRef: "/tmp/secret.enc",
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

test("deleteSecret is idempotent", async () => {
  await withTempCwd(async () => {
    await saveSecret("conn_slack_1", "xoxb-token");
    await deleteSecret("conn_slack_1");
    await deleteSecret("conn_slack_1");
  });
});

// ---------------------------------------------------------------------------
// Jira tests
// ---------------------------------------------------------------------------

test("saveJiraTokenBundle/loadJiraTokenBundle roundtrip", async () => {
  await withTempCwd(async () => {
    const bundle: JiraTokenBundle = {
      version: 2,
      provider: "jira",
      authMode: "manual",
      apiToken: "my-secret-api-token",
    };

    const secretRef = await saveJiraTokenBundle("conn_jira_abc123", bundle);
    const loaded = await loadJiraTokenBundle("conn_jira_abc123");

    // Verify roundtrip fidelity
    assert.equal(loaded.apiToken, bundle.apiToken);
    assert.equal(loaded.version, 2);
    assert.equal(loaded.provider, "jira");
    assert.equal(loaded.authMode, "manual");

    // Verify raw file does not contain the plaintext token
    const persisted = await readFile(secretRef, "utf-8");
    assert.ok(!persisted.includes("my-secret-api-token"));
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
      secretRef: "/tmp/secret.enc",
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

    const all = await listConnectors();
    assert.equal(all.length, 1);

    const checkAt = Date.now();
    await updateConnectorStatus(record.id, "error", {
      lastCheckedAt: checkAt,
      lastError: "HTTP 401",
    });

    const updated = await getConnector(record.id);
    assert.ok(updated);
    assert.equal(updated.status, "error");
    assert.equal(updated.lastCheckedAt, checkAt);
    assert.equal(updated.lastError, "HTTP 401");
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
      mcpProfile: { serverName: "slack", transport: "stdio" },
      secretRef: "/tmp/s.enc",
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
      secretRef: "/tmp/j.enc",
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
