import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "vitest";
import type { WorkflowResult } from "@agent-flow/core";
import {
  deleteSession,
  getSession,
  listSessions,
  writeSession,
  type SessionRecord,
} from "./sessionStorage";

async function withTempCwd(fn: (cwd: string) => Promise<void>): Promise<void> {
  const originalCwd = process.cwd();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-session-"));
  process.chdir(tempDir);

  try {
    await fn(tempDir);
  } finally {
    process.chdir(originalCwd);
    await rm(tempDir, { recursive: true, force: true });
  }
}

function buildSession(overrides: Partial<SessionRecord>): SessionRecord {
  const result: WorkflowResult = {
    success: true,
    steps: [{ name: "step", success: true, exitCode: 0 }],
  };

  return {
    id: "session-default",
    workflowFile: "demo.yaml",
    workflowName: "demo",
    startedAt: 1_000,
    endedAt: 2_000,
    durationMs: 1_000,
    success: true,
    trigger: "manual",
    logs: [],
    result,
    ...overrides,
  };
}

test("write/list/get/delete session flow", async () => {
  await withTempCwd(async () => {
    const older = buildSession({
      id: "s-older",
      startedAt: 1_000,
      endedAt: 2_000,
      durationMs: 1_000,
    });
    const newer = buildSession({
      id: "s-newer",
      startedAt: 5_000,
      endedAt: 5_300,
      durationMs: 300,
      success: false,
      result: { success: false, steps: [{ name: "step", success: false, exitCode: 1 }] },
    });

    await writeSession(older);
    await writeSession(newer);

    const summaries = await listSessions("demo.yaml");
    assert.deepEqual(
      summaries.map((session) => session.id),
      ["s-newer", "s-older"],
    );

    const detail = await getSession("demo.yaml", "s-older");
    assert.ok(detail);
    assert.equal(detail.workflowName, "demo");
    assert.equal(detail.durationMs, 1_000);

    assert.equal(await deleteSession("demo.yaml", "s-older"), true);
    assert.equal(await deleteSession("demo.yaml", "s-older"), false);
  });
});

test("workflow and session names are sanitized to stay in project storage", async () => {
  await withTempCwd(async (cwd) => {
    const record = buildSession({
      id: "session-1",
      workflowFile: "../../escape.yaml",
      workflowName: "escape",
    });

    await writeSession(record);

    const expectedPath = path.join(
      cwd,
      ".ai-workflows",
      ".sessions",
      "escape.yaml",
      "session-1.json",
    );
    await access(expectedPath);

    const session = await getSession("../../escape.yaml", "session-1");
    assert.ok(session);
    assert.equal(session.workflowFile, "../../escape.yaml");
  });
});
