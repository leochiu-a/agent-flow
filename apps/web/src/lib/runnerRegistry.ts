import type { WorkflowRunner } from "@agent-flow/core";

const globalForRegistry = globalThis as unknown as {
  __agentFlowRunnerRegistry?: Map<string, WorkflowRunner>;
};

const registry = (globalForRegistry.__agentFlowRunnerRegistry ??= new Map<
  string,
  WorkflowRunner
>());

export function registerRunner(sessionId: string, runner: WorkflowRunner): void {
  registry.set(sessionId, runner);
}

export function unregisterRunner(sessionId: string): void {
  registry.delete(sessionId);
}

export function getRunner(sessionId: string): WorkflowRunner | undefined {
  return registry.get(sessionId);
}
