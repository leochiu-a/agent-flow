/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { JiraStepModal } from "./JiraStepModal";

afterEach(cleanup);

test("renders step name, ticket ID and prompt fields", () => {
  render(
    <JiraStepModal
      initialTitle="Fetch ticket"
      initialJiraTicket="PROJ-123"
      initialPrompt="Summarize"
      saving={false}
      error={null}
      onSave={vi.fn()}
      onCancel={vi.fn()}
    />,
  );

  expect(screen.getByPlaceholderText("Step title...")).toBeTruthy();
  expect(screen.getByPlaceholderText("e.g. PROJ-123 or https://...")).toBeTruthy();
  expect(screen.getByPlaceholderText("Additional instructions for Claude...")).toBeTruthy();
});

test("calls onSave with form data including jiraTicket", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();

  render(
    <JiraStepModal
      initialTitle="Fetch"
      initialJiraTicket="ABC-1"
      initialPrompt="Do analysis"
      saving={false}
      error={null}
      onSave={onSave}
      onCancel={vi.fn()}
    />,
  );

  await user.click(screen.getByText("Save Step"));

  expect(onSave).toHaveBeenCalledWith({
    title: "Fetch",
    jiraTicket: "ABC-1",
    prompt: "Do analysis",
    skipPermission: false,
  });
});

test("shows validation error when ticket ID is empty", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();

  render(
    <JiraStepModal
      initialTitle="Fetch"
      initialJiraTicket=""
      initialPrompt=""
      saving={false}
      error={null}
      onSave={onSave}
      onCancel={vi.fn()}
    />,
  );

  await user.click(screen.getByText("Save Step"));

  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByText("Jira ticket ID or URL is required.")).toBeTruthy();
});

test("title is required for save", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();

  render(
    <JiraStepModal
      initialTitle=""
      initialJiraTicket="PROJ-1"
      initialPrompt=""
      saving={false}
      error={null}
      onSave={onSave}
      onCancel={vi.fn()}
    />,
  );

  await user.click(screen.getByText("Save Step"));

  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByText("Step name is required.")).toBeTruthy();
});

test("prompt is optional — can save with empty prompt", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();

  render(
    <JiraStepModal
      initialTitle="Fetch"
      initialJiraTicket="PROJ-1"
      initialPrompt=""
      saving={false}
      error={null}
      onSave={onSave}
      onCancel={vi.fn()}
    />,
  );

  await user.click(screen.getByText("Save Step"));

  expect(onSave).toHaveBeenCalledWith({
    title: "Fetch",
    jiraTicket: "PROJ-1",
    prompt: "",
    skipPermission: false,
  });
});
