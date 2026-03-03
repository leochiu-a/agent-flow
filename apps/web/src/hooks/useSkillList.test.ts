/* @vitest-environment jsdom */
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { renderHook, cleanup, waitFor } from "@testing-library/react";
import { useSkillList, _resetSkillCache } from "./useSkillList";

beforeEach(() => {
  _resetSkillCache();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          skills: [
            { name: "alpha", description: "A skill", source: "user" },
            { name: "beta", description: "B skill", source: "plugin" },
          ],
        }),
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("returns empty array initially then populates after fetch", async () => {
  const { result } = renderHook(() => useSkillList());

  // Before fetch resolves
  expect(result.current).toEqual([]);

  // After fetch resolves
  await waitFor(() => {
    expect(result.current).toHaveLength(2);
  });
  expect(result.current[0]!.name).toBe("alpha");
  expect(result.current[1]!.name).toBe("beta");
});

test("caches skills across hook instances (no duplicate fetch)", async () => {
  const { result: first } = renderHook(() => useSkillList());

  await waitFor(() => {
    expect(first.current).toHaveLength(2);
  });

  expect(fetch).toHaveBeenCalledTimes(1);

  // Second instance should use cache, no additional fetch
  const { result: second } = renderHook(() => useSkillList());
  expect(second.current).toHaveLength(2);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("returns empty array when fetch fails", async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"));

  const { result } = renderHook(() => useSkillList());

  // Should not throw, just stay empty
  await waitFor(() => {
    expect(result.current).toEqual([]);
  });
});
