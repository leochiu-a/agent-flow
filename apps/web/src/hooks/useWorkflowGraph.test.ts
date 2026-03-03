/* @vitest-environment jsdom */
import assert from "node:assert/strict";
import { test } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWorkflowGraph } from "./useWorkflowGraph";
import type { WorkflowDefinition } from "@agent-flow/core";

test("getDefinition includes skill when set on a node", () => {
  const { result } = renderHook(() => useWorkflowGraph({ activeFile: "test.yaml" }));

  act(() => {
    result.current.addNode();
  });

  const nodeId = result.current.nodes[0]!.id;

  act(() => {
    result.current.updateNode(nodeId, {
      title: "Review",
      prompt: "review code",
      skill: "code-review",
    });
  });

  const def = result.current.getDefinition();
  assert.equal(def.workflow[0]!.skill, "code-review");
});

test("getDefinition omits skill key when not set", () => {
  const { result } = renderHook(() => useWorkflowGraph({ activeFile: "test.yaml" }));

  act(() => {
    result.current.addNode();
  });

  const nodeId = result.current.nodes[0]!.id;

  act(() => {
    result.current.updateNode(nodeId, {
      title: "Step",
      prompt: "do something",
    });
  });

  const def = result.current.getDefinition();
  assert.equal("skill" in def.workflow[0]!, false, "skill key should not be present");
});

test("loadDefinition maps skill from workflow step to node data", () => {
  const { result } = renderHook(() => useWorkflowGraph({ activeFile: "test.yaml" }));

  const definition: WorkflowDefinition = {
    name: "test",
    workflow: [
      { name: "Step 1", agent: "claude", prompt: "hello", skill: "lint" },
      { name: "Step 2", agent: "claude", prompt: "world" },
    ],
  };

  act(() => {
    result.current.loadDefinition(definition);
  });

  const nodes = result.current.nodes;
  assert.equal(nodes.length, 2);
  assert.equal((nodes[0]!.data as { skill?: string }).skill, "lint");
  assert.equal((nodes[1]!.data as { skill?: string }).skill, undefined);
});

// --- Jira node tests ---

test("addNode with get-jira-ticket creates node with type jira and job", () => {
  const { result } = renderHook(() => useWorkflowGraph({ activeFile: "test.yaml" }));

  act(() => {
    result.current.addNode("get-jira-ticket");
  });

  const node = result.current.nodes[0]!;
  const data = node.data as { type: string; job: string; title: string };
  assert.equal(data.type, "jira");
  assert.equal(data.job, "get-jira-ticket");
  assert.equal(data.title, "Jira Step");
});

test("getDefinition outputs agent claude with metadata for jira nodes", () => {
  const { result } = renderHook(() => useWorkflowGraph({ activeFile: "test.yaml" }));

  act(() => {
    result.current.addNode("get-jira-ticket");
  });

  const nodeId = result.current.nodes[0]!.id;

  act(() => {
    result.current.updateNode(nodeId, {
      title: "Fetch ticket",
      jiraTicket: "PROJ-123",
      prompt: "Summarize",
    });
  });

  const def = result.current.getDefinition();
  const step = def.workflow[0]!;
  assert.equal(step.agent, "claude");
  assert.deepEqual(step.metadata, { job: "get-jira-ticket", jira_ticket: "PROJ-123" });
  assert.ok(step.prompt.includes("PROJ-123"));
  assert.ok(step.prompt.includes("Summarize"));
});

test("getDefinition composes prompt from jiraTicket and user prompt", () => {
  const { result } = renderHook(() => useWorkflowGraph({ activeFile: "test.yaml" }));

  act(() => {
    result.current.addNode("get-jira-ticket");
  });

  const nodeId = result.current.nodes[0]!.id;

  act(() => {
    result.current.updateNode(nodeId, {
      title: "Fetch",
      jiraTicket: "ABC-99",
      prompt: "",
    });
  });

  const def = result.current.getDefinition();
  const step = def.workflow[0]!;
  assert.ok(step.prompt.includes("ABC-99"));
  // No user prompt appended
  assert.equal(step.prompt.includes("Additional"), false);
});

test("loadDefinition restores jira node from metadata.job", () => {
  const { result } = renderHook(() => useWorkflowGraph({ activeFile: "test.yaml" }));

  const definition: WorkflowDefinition = {
    name: "test",
    workflow: [
      {
        name: "Fetch ticket",
        agent: "claude",
        prompt: "composed prompt here",
        metadata: { job: "get-jira-ticket", jira_ticket: "PROJ-456" },
      },
    ],
  };

  act(() => {
    result.current.loadDefinition(definition);
  });

  const node = result.current.nodes[0]!;
  const data = node.data as { type: string; job: string; jiraTicket: string };
  assert.equal(data.type, "jira");
  assert.equal(data.job, "get-jira-ticket");
  assert.equal(data.jiraTicket, "PROJ-456");
});

test("loadDefinition without metadata loads as claude node", () => {
  const { result } = renderHook(() => useWorkflowGraph({ activeFile: "test.yaml" }));

  const definition: WorkflowDefinition = {
    name: "test",
    workflow: [{ name: "Step 1", agent: "claude", prompt: "hello" }],
  };

  act(() => {
    result.current.loadDefinition(definition);
  });

  const node = result.current.nodes[0]!;
  const data = node.data as { type: string; job?: string };
  assert.equal(data.type, "claude");
  assert.equal(data.job, undefined);
});

test("updateNode supports jiraTicket field", () => {
  const { result } = renderHook(() => useWorkflowGraph({ activeFile: "test.yaml" }));

  act(() => {
    result.current.addNode("get-jira-ticket");
  });

  const nodeId = result.current.nodes[0]!.id;

  act(() => {
    result.current.updateNode(nodeId, { jiraTicket: "TEST-789" });
  });

  const data = result.current.nodes[0]!.data as { jiraTicket: string };
  assert.equal(data.jiraTicket, "TEST-789");
});
