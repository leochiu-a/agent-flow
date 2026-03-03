/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { SlackStepModal } from "./SlackStepModal";

afterEach(cleanup);

test("renders step name, channel and message fields", () => {
  render(
    <SlackStepModal
      initialTitle="Notify team"
      initialSlackChannel="#general"
      initialSlackMessage="Hello"
      saving={false}
      error={null}
      onSave={vi.fn()}
      onCancel={vi.fn()}
    />,
  );

  expect(screen.getByPlaceholderText("Step title...")).toBeTruthy();
  expect(screen.getByPlaceholderText("e.g. #general or C01234567")).toBeTruthy();
  expect(screen.getByPlaceholderText("Enter prompt for Claude...")).toBeTruthy();
});

test("calls onSave with form data including slackChannel and slackMessage", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();

  render(
    <SlackStepModal
      initialTitle="Notify"
      initialSlackChannel="#ops"
      initialSlackMessage="Deploy done"
      saving={false}
      error={null}
      onSave={onSave}
      onCancel={vi.fn()}
    />,
  );

  await user.click(screen.getByText("Save Step"));

  expect(onSave).toHaveBeenCalledWith({
    title: "Notify",
    slackChannel: "#ops",
    slackMessage: "Deploy done",
    skipPermission: false,
  });
});

test("shows validation error when channel is empty", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();

  render(
    <SlackStepModal
      initialTitle="Notify"
      initialSlackChannel=""
      initialSlackMessage="Hello"
      saving={false}
      error={null}
      onSave={onSave}
      onCancel={vi.fn()}
    />,
  );

  await user.click(screen.getByText("Save Step"));

  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByText("Channel is required.")).toBeTruthy();
});

test("shows validation error when message is empty", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();

  render(
    <SlackStepModal
      initialTitle="Notify"
      initialSlackChannel="#general"
      initialSlackMessage=""
      saving={false}
      error={null}
      onSave={onSave}
      onCancel={vi.fn()}
    />,
  );

  await user.click(screen.getByText("Save Step"));

  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByText("Message is required.")).toBeTruthy();
});

test("title is required for save", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();

  render(
    <SlackStepModal
      initialTitle=""
      initialSlackChannel="#general"
      initialSlackMessage="Hello"
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
