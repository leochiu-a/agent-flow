/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { IconButton } from "./icon-button";
import { TooltipProvider } from "./tooltip";

afterEach(() => {
  cleanup();
});

test("renders a button containing the provided icon", () => {
  render(<IconButton icon={<svg data-testid="icon" />} />);
  expect(screen.getByRole("button").querySelector("[data-testid='icon']")).toBeTruthy();
});

test("calls onClick when clicked", async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();
  render(<IconButton icon={<svg />} onClick={handleClick} />);
  await user.click(screen.getByRole("button"));
  expect(handleClick).toHaveBeenCalledOnce();
});

test("forwards title attribute", () => {
  render(<IconButton icon={<svg />} title="Edit step" />);
  expect(screen.getByTitle("Edit step")).toBeTruthy();
});

test("does not fire onClick when disabled", async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();
  render(<IconButton icon={<svg />} disabled onClick={handleClick} />);
  await user.click(screen.getByRole("button"));
  expect(handleClick).not.toHaveBeenCalled();
});

test("sets disabled attribute on button", () => {
  render(<IconButton icon={<svg />} disabled />);
  expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
});

test("merges additional className", () => {
  render(<IconButton icon={<svg />} className="nodrag" />);
  expect(screen.getByRole("button").className).toContain("nodrag");
});

test("defaults to xs size", () => {
  render(<IconButton icon={<svg />} />);
  expect(screen.getByRole("button").dataset.size).toBe("icon-xs");
});

test("size prop maps correctly", () => {
  const { unmount } = render(<IconButton icon={<svg />} size="sm" />);
  expect(screen.getByRole("button").dataset.size).toBe("icon-sm");
  unmount();

  render(<IconButton icon={<svg />} size="default" />);
  expect(screen.getByRole("button").dataset.size).toBe("icon");
});

test("uses ghost variant", () => {
  render(<IconButton icon={<svg />} />);
  expect(screen.getByRole("button").dataset.variant).toBe("ghost");
});

test("renders with tooltip prop without crashing", () => {
  render(
    <TooltipProvider>
      <IconButton icon={<svg />} tooltip="View step" />
    </TooltipProvider>,
  );
  expect(screen.getByRole("button")).toBeTruthy();
});
