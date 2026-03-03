/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ReactFlowProvider } from "@xyflow/react";
import { StepNode } from "./StepNode";
import type { StepNodeData } from "./StepNode";

afterEach(cleanup);

function renderStepNode(overrides: Partial<StepNodeData> = {}) {
  const defaultData: StepNodeData = {
    title: "Test Step",
    type: "claude",
    prompt: "Do something",
    onRequestEdit: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };

  return render(
    <ReactFlowProvider>
      <StepNode
        id="test-1"
        data={defaultData}
        type="step"
        selected={false}
        dragging={false}
        isConnectable={true}
        positionAbsoluteX={0}
        positionAbsoluteY={0}
        zIndex={0}
      />
    </ReactFlowProvider>,
  );
}

test("shows skill badge when skill is set", () => {
  renderStepNode({ skill: "code-review" });
  expect(screen.getByText("code-review")).toBeTruthy();
  expect(screen.getByText("Skill:")).toBeTruthy();
});

test("does not show skill badge when skill is not set", () => {
  renderStepNode();
  expect(screen.queryByText("Skill:")).toBeNull();
});

test("shows Jira badge for jira type node", () => {
  renderStepNode({ type: "jira", job: "get-jira-ticket" });
  expect(screen.getByText("Jira")).toBeTruthy();
  expect(screen.queryByText("Claude")).toBeNull();
});

test("shows Claude badge for claude type node", () => {
  renderStepNode({ type: "claude" });
  expect(screen.getByText("Claude")).toBeTruthy();
  expect(screen.queryByText("Jira")).toBeNull();
});

test("shows ticket info for jira node with jiraTicket", () => {
  renderStepNode({ type: "jira", job: "get-jira-ticket", jiraTicket: "PROJ-123" });
  expect(screen.getByText("PROJ-123")).toBeTruthy();
  expect(screen.getByText("Ticket:")).toBeTruthy();
});

test("does not show ticket info when jiraTicket is not set", () => {
  renderStepNode({ type: "jira", job: "get-jira-ticket" });
  expect(screen.queryByText("Ticket:")).toBeNull();
});

test("shows Slack badge for slack type node", () => {
  renderStepNode({ type: "slack", job: "send-slack-message" });
  expect(screen.getByText("Slack")).toBeTruthy();
  expect(screen.queryByText("Claude")).toBeNull();
  expect(screen.queryByText("Jira")).toBeNull();
});

test("shows channel info for slack node with slackChannel", () => {
  renderStepNode({ type: "slack", job: "send-slack-message", slackChannel: "#general" });
  expect(screen.getByText("#general")).toBeTruthy();
  expect(screen.getByText("Channel:")).toBeTruthy();
});

test("does not show channel info when slackChannel is not set", () => {
  renderStepNode({ type: "slack", job: "send-slack-message" });
  expect(screen.queryByText("Channel:")).toBeNull();
});
