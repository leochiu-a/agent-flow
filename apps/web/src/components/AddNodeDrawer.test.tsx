/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { AddNodeDrawer } from "./AddNodeDrawer";
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
  expect(screen.getByText("Send Slack Message")).toBeTruthy();
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

test("filters nodes by search text", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  renderDrawer({ onAddNode: vi.fn() });
  await user.click(screen.getByTitle("Add node"));
  await user.type(screen.getByPlaceholderText("Search nodes..."), "jira");
  expect(screen.getByText("Get Jira Ticket")).toBeTruthy();
  expect(screen.queryByText("Claude Agent")).toBeNull();
  expect(screen.queryByText("TDD Implementation")).toBeNull();
  expect(screen.queryByText("Send Slack Message")).toBeNull();
});

test("shows empty state when no nodes match search", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  renderDrawer({ onAddNode: vi.fn() });
  await user.click(screen.getByTitle("Add node"));
  await user.type(screen.getByPlaceholderText("Search nodes..."), "xyz");
  expect(screen.getByText("No nodes match your search")).toBeTruthy();
});
