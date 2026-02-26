import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "vitest";
import {
  createOAuthState,
  consumeOAuthState,
  isAllowedReturnTo,
  pruneExpiredStates,
} from "./oauthStateStore";

async function withTempCwd(fn: (cwd: string) => Promise<void>): Promise<void> {
  const originalCwd = process.cwd();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-oauth-"));
  process.chdir(tempDir);

  try {
    await fn(tempDir);
  } finally {
    process.chdir(originalCwd);
    await rm(tempDir, { recursive: true, force: true });
  }
}

test("isAllowedReturnTo only accepts same-origin relative paths", () => {
  assert.equal(isAllowedReturnTo("/connectors"), true);
  assert.equal(isAllowedReturnTo("/connectors?tab=slack"), true);
  assert.equal(isAllowedReturnTo("https://evil.example"), false);
  assert.equal(isAllowedReturnTo("javascript:alert(1)"), false);
});

test("state is one-time use and preserves allowed returnTo", async () => {
  await withTempCwd(async () => {
    const state = await createOAuthState("/connectors");

    const first = await consumeOAuthState(state);
    assert.ok(first);
    assert.equal(first.returnTo, "/connectors");

    const second = await consumeOAuthState(state);
    assert.equal(second, null);
  });
});

test("invalid returnTo is dropped during state creation", async () => {
  await withTempCwd(async () => {
    const state = await createOAuthState("https://evil.example");
    const record = await consumeOAuthState(state);

    assert.ok(record);
    assert.equal(record.returnTo, undefined);
  });
});

test("consumeOAuthState rejects expired states", async () => {
  await withTempCwd(async (cwd) => {
    const state = await createOAuthState("/connectors");
    const filePath = path.join(cwd, ".ai-workflows", ".oauth-states", `${state}.json`);
    const record = JSON.parse(await readFile(filePath, "utf-8")) as { expiresAt: number };
    record.expiresAt = Date.now() - 1;
    await writeFile(filePath, JSON.stringify(record), "utf-8");

    const consumed = await consumeOAuthState(state);
    assert.equal(consumed, null);
  });
});

test("pruneExpiredStates removes expired entries only", async () => {
  await withTempCwd(async (cwd) => {
    const expiredState = await createOAuthState("/connectors");
    const aliveState = await createOAuthState("/connectors");
    const statesDir = path.join(cwd, ".ai-workflows", ".oauth-states");
    const expiredPath = path.join(statesDir, `${expiredState}.json`);
    const alivePath = path.join(statesDir, `${aliveState}.json`);

    const expiredRecord = JSON.parse(await readFile(expiredPath, "utf-8")) as { expiresAt: number };
    expiredRecord.expiresAt = Date.now() - 1;
    await writeFile(expiredPath, JSON.stringify(expiredRecord), "utf-8");

    await pruneExpiredStates();

    await assert.rejects(() => access(expiredPath));
    await access(alivePath);
  });
});
