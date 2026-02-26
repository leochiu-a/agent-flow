import assert from "node:assert/strict";
import { mkdtemp, mkdir, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "vitest";
import {
  getSafeParentDirectory,
  resolveBrowseDirectory,
  validateAllowedDirectory,
} from "./directoryAccess";

const ENV_KEY = "AGENT_FLOW_ALLOWED_DIRS";

async function withAllowedRoot<T>(
  fn: (ctx: { root: string; outside: string }) => Promise<T>,
): Promise<T> {
  const original = process.env[ENV_KEY];
  const temp = await mkdtemp(path.join(os.tmpdir(), "agent-flow-dir-access-"));
  const root = path.join(temp, "root");
  const outside = path.join(temp, "outside");
  await mkdir(path.join(root, "child"), { recursive: true });
  await mkdir(outside, { recursive: true });
  process.env[ENV_KEY] = root;

  try {
    return await fn({ root, outside });
  } finally {
    if (original === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = original;
    }
    await rm(temp, { recursive: true, force: true });
  }
}

test("validateAllowedDirectory allows directories inside configured roots", async () => {
  await withAllowedRoot(async ({ root }) => {
    const childPath = path.join(root, "child");
    const result = await validateAllowedDirectory(childPath);
    assert.equal(result.ok, true);
    assert.equal(result.resolvedPath, await realpath(childPath));
  });
});

test("validateAllowedDirectory rejects directories outside configured roots", async () => {
  await withAllowedRoot(async ({ outside }) => {
    const result = await validateAllowedDirectory(outside);
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  });
});

test("resolveBrowseDirectory defaults to first allowed root and keeps parent in bounds", async () => {
  await withAllowedRoot(async ({ root }) => {
    const resolved = await resolveBrowseDirectory(null);
    assert.equal(resolved.ok, true);
    assert.equal(resolved.resolvedPath, await realpath(root));

    const childPath = path.join(root, "child");
    const childResult = await validateAllowedDirectory(childPath);
    assert.equal(childResult.ok, true);
    const parentPath = await getSafeParentDirectory(childResult.resolvedPath!);
    assert.equal(parentPath, await realpath(root));

    const rootParent = await getSafeParentDirectory(await realpath(root));
    assert.equal(rootParent, null);
  });
});
