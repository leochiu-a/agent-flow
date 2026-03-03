/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";

// Mock SVG imports to avoid JSDOM InvalidCharacterError with inline SVG data URIs
vi.mock("@/assets/slack.svg", () => ({ default: (props: object) => <svg {...props} /> }));
vi.mock("@/assets/claude.svg", () => ({ default: (props: object) => <svg {...props} /> }));
vi.mock("@/assets/atlassian.svg", () => ({ default: (props: object) => <svg {...props} /> }));

import { AddNodeDrawer } from "./AddNodeDrawer";
import { _resetSkillCache } from "@/hooks/useSkillList";
import { TooltipProvider } from "@/components/ui/tooltip";

function renderDrawer(props: { onAddNode: (jobId: string) => void; disabled?: boolean }) {
  return render(
    <TooltipProvider>
      <AddNodeDrawer {...props} />
    </TooltipProvider>,
  );
}

// Polyfill APIs not available in JSDOM (needed by Vaul and Radix Tooltip).
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.addEventListener("error", (e) => {
    if (
      e.message?.includes("setPointerCapture") ||
      e.message?.includes("match") ||
      e.message?.includes("getTranslate")
    ) {
      e.preventDefault();
    }
  });
  // Default: return empty skills list so existing tests are unaffected
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ json: () => Promise.resolve({ skills: [] }) }),
  );
});

beforeEach(() => {
  _resetSkillCache();
});

afterEach(cleanup);

test("renders floating + button", () => {
  renderDrawer({ onAddNode: vi.fn() });
  expect(screen.getByTitle("Add node")).toBeTruthy();
});

test("disables + button when disabled prop is true", () => {
  renderDrawer({ onAddNode: vi.fn(), disabled: true });
  expect((screen.getByTitle("Add node") as HTMLButtonElement).disabled).toBe(true);
});

test("opens drawer when + button is clicked", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  renderDrawer({ onAddNode: vi.fn() });
  await user.click(screen.getByTitle("Add node"));
  expect(screen.getByText("Add Node")).toBeTruthy();
});

test("shows all job items in flat list", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  renderDrawer({ onAddNode: vi.fn() });
  await user.click(screen.getByTitle("Add node"));
  expect(screen.getByText("Claude Agent")).toBeTruthy();
  expect(screen.getByText("Get Jira Ticket")).toBeTruthy();
  expect(screen.getByText("TDD Implementation")).toBeTruthy();
  expect(screen.getByText("Send PR for Review")).toBeTruthy();
});

test("calls onAddNode with 'claude-agent' when Claude Agent is clicked", async () => {
  const onAddNode = vi.fn();
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  renderDrawer({ onAddNode });
  await user.click(screen.getByTitle("Add node"));
  await user.click(screen.getByText("Claude Agent"));
  expect(onAddNode).toHaveBeenCalledWith("claude-agent");
});

test("calls onAddNode with 'get-jira-ticket' when Get Jira Ticket is clicked", async () => {
  const onAddNode = vi.fn();
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  renderDrawer({ onAddNode });
  await user.click(screen.getByTitle("Add node"));
  await user.click(screen.getByText("Get Jira Ticket"));
  expect(onAddNode).toHaveBeenCalledWith("get-jira-ticket");
});

test("calls onAddNode with 'send-slack-message' when Send PR for Review is clicked", async () => {
  const onAddNode = vi.fn();
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  renderDrawer({ onAddNode });
  await user.click(screen.getByTitle("Add node"));
  await user.click(screen.getByText("Send PR for Review"));
  expect(onAddNode).toHaveBeenCalledWith("send-slack-message");
});

test("filters nodes by search text", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  renderDrawer({ onAddNode: vi.fn() });
  await user.click(screen.getByTitle("Add node"));
  await user.type(screen.getByPlaceholderText("Search nodes..."), "jira");
  expect(screen.getByText("Get Jira Ticket")).toBeTruthy();
  expect(screen.queryByText("Claude Agent")).toBeNull();
  expect(screen.queryByText("TDD Implementation")).toBeNull();
  expect(screen.queryByText("Send PR for Review")).toBeNull();
});

test("shows empty state when no nodes match search", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  renderDrawer({ onAddNode: vi.fn() });
  await user.click(screen.getByTitle("Add node"));
  await user.type(screen.getByPlaceholderText("Search nodes..."), "xyz");
  expect(screen.getByText("No nodes match your search")).toBeTruthy();
});

test("disables TDD node when required skill is not installed", async () => {
  vi.mocked(fetch).mockResolvedValueOnce({
    json: () => Promise.resolve({ skills: [] }),
  } as Response);

  const onAddNode = vi.fn();
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  renderDrawer({ onAddNode });
  await user.click(screen.getByTitle("Add node"));
  // Wait for fetch to resolve
  await screen.findByText("Requires skill: test-driven-development");
  const tddButton = screen.getByText("TDD Implementation").closest("button")!;
  expect(tddButton.disabled).toBe(true);
  await user.click(tddButton);
  expect(onAddNode).not.toHaveBeenCalled();
});

test("enables TDD node when required skill is installed", async () => {
  vi.mocked(fetch).mockResolvedValueOnce({
    json: () =>
      Promise.resolve({
        skills: [{ name: "test-driven-development", description: "TDD", source: "plugin" }],
      }),
  } as Response);

  const onAddNode = vi.fn();
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  renderDrawer({ onAddNode });
  await user.click(screen.getByTitle("Add node"));
  // Wait for skills fetch
  await vi.waitFor(() => {
    const tddButton = screen.getByText("TDD Implementation").closest("button")!;
    expect(tddButton.disabled).toBe(false);
  });
  expect(screen.queryByText("Requires skill: test-driven-development")).toBeNull();
  await user.click(screen.getByText("TDD Implementation"));
  expect(onAddNode).toHaveBeenCalledWith("tdd-implementation");
});
