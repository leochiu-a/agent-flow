import assert from "node:assert/strict";
import { test, beforeEach } from "vitest";
import type { WorkflowRunner } from "@agent-flow/core";
import { registerRunner, getRunner, unregisterRunner } from "./runnerRegistry";

const fakeRunner = {} as WorkflowRunner;

const globalForRegistry = globalThis as unknown as {
  __agentFlowRunnerRegistry?: Map<string, WorkflowRunner>;
};

beforeEach(() => {
  globalForRegistry.__agentFlowRunnerRegistry?.clear();
});

test("register and get a runner", () => {
  registerRunner("sess-1", fakeRunner);
  assert.equal(getRunner("sess-1"), fakeRunner);
});

test("get returns undefined for unknown session", () => {
  assert.equal(getRunner("unknown"), undefined);
});

test("unregister removes the runner", () => {
  registerRunner("sess-2", fakeRunner);
  unregisterRunner("sess-2");
  assert.equal(getRunner("sess-2"), undefined);
});

test("registry is stored on globalThis to survive HMR", () => {
  registerRunner("sess-hmr", fakeRunner);
  assert.ok(
    globalForRegistry.__agentFlowRunnerRegistry,
    "globalThis should have __agentFlowRunnerRegistry",
  );
  assert.equal(globalForRegistry.__agentFlowRunnerRegistry.get("sess-hmr"), fakeRunner);
});
