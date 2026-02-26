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
  saveSecret,
  updateConnectorStatus,
  upsertConnector,
  type SlackConnectorRecord,
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
