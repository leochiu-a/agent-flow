import assert from "node:assert/strict";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { test } from "vitest";
import { DELETE } from "./route";

async function withTempWebCwd(fn: (ctx: { webDir: string; workflowDir: string }) => Promise<void>) {
  const originalCwd = process.cwd();
  const tempRoot = await fsMkdtemp(path.join(os.tmpdir(), "agent-flow-workflow-delete-"));
  const webDir = path.join(tempRoot, "apps", "web");
  const workflowDir = path.join(tempRoot, ".ai-workflows");
  await mkdir(webDir, { recursive: true });
  await mkdir(workflowDir, { recursive: true });
  process.chdir(webDir);

  try {
    await fn({ webDir, workflowDir });
  } finally {
    process.chdir(originalCwd);
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function fsMkdtemp(prefix: string): Promise<string> {
  const { mkdtemp } = await import("node:fs/promises");
  return mkdtemp(prefix);
}

test("deletes existing yaml workflow file", async () => {
  await withTempWebCwd(async ({ workflowDir }) => {
    const filename = "demo.yaml";
    const filePath = path.join(workflowDir, filename);
    await writeFile(filePath, "name: demo\nworkflow: []\n", "utf-8");

    const req = new NextRequest(`http://localhost/api/workflow/delete?file=${filename}`, {
      method: "DELETE",
    });
    const res = await DELETE(req);
    const json = (await res.json()) as { ok?: boolean; filename?: string };

    assert.equal(res.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.filename, filename);
    await assert.rejects(access(filePath));
  });
});

test("returns 400 when file param is missing", async () => {
  await withTempWebCwd(async () => {
    const req = new NextRequest("http://localhost/api/workflow/delete", { method: "DELETE" });
    const res = await DELETE(req);

    assert.equal(res.status, 400);
  });
});

test("returns 400 for invalid filename traversal", async () => {
  await withTempWebCwd(async () => {
    const req = new NextRequest("http://localhost/api/workflow/delete?file=../oops.yaml", {
      method: "DELETE",
    });
    const res = await DELETE(req);

    assert.equal(res.status, 400);
  });
});

test("returns 400 for filename with path separator", async () => {
  await withTempWebCwd(async () => {
    const req = new NextRequest("http://localhost/api/workflow/delete?file=sub/demo.yaml", {
      method: "DELETE",
    });
    const res = await DELETE(req);

    assert.equal(res.status, 400);
  });
});

test("returns 400 for non-yaml filename", async () => {
  await withTempWebCwd(async () => {
    const req = new NextRequest("http://localhost/api/workflow/delete?file=demo.txt", {
      method: "DELETE",
    });
    const res = await DELETE(req);

    assert.equal(res.status, 400);
  });
});

test("returns 404 for non-existent file", async () => {
  await withTempWebCwd(async () => {
    const req = new NextRequest("http://localhost/api/workflow/delete?file=missing.yaml", {
      method: "DELETE",
    });
    const res = await DELETE(req);

    assert.equal(res.status, 404);
  });
});
