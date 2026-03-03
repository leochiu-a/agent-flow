import assert from "node:assert/strict";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { test } from "vitest";
import { POST } from "./route";

async function fsMkdtemp(prefix: string): Promise<string> {
  const { mkdtemp } = await import("node:fs/promises");
  return mkdtemp(prefix);
}

async function withTempWebCwd(fn: (ctx: { webDir: string; workflowDir: string }) => Promise<void>) {
  const originalCwd = process.cwd();
  const tempRoot = await fsMkdtemp(path.join(os.tmpdir(), "agent-flow-workflow-rename-"));
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

test("renames existing yaml workflow file", async () => {
  await withTempWebCwd(async ({ workflowDir }) => {
    const fromFilename = "old.yaml";
    const toFilename = "new.yaml";
    const fromPath = path.join(workflowDir, fromFilename);
    const content = "name: old\nworkflow: []\n";
    await writeFile(fromPath, content, "utf-8");

    const req = new NextRequest("http://localhost/api/workflow/rename", {
      method: "POST",
      body: JSON.stringify({ from: fromFilename, to: toFilename }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const json = (await res.json()) as { ok?: boolean; filename?: string };

    assert.equal(res.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.filename, toFilename);
    await assert.rejects(access(fromPath));
    const toPath = path.join(workflowDir, toFilename);
    await assert.doesNotReject(access(toPath));
  });
});

test("returns 400 when 'from' param is missing", async () => {
  await withTempWebCwd(async () => {
    const req = new NextRequest("http://localhost/api/workflow/rename", {
      method: "POST",
      body: JSON.stringify({ to: "new.yaml" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    assert.equal(res.status, 400);
  });
});

test("returns 400 when 'to' param is missing", async () => {
  await withTempWebCwd(async () => {
    const req = new NextRequest("http://localhost/api/workflow/rename", {
      method: "POST",
      body: JSON.stringify({ from: "old.yaml" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    assert.equal(res.status, 400);
  });
});

test("returns 400 for path traversal in 'from'", async () => {
  await withTempWebCwd(async () => {
    const req = new NextRequest("http://localhost/api/workflow/rename", {
      method: "POST",
      body: JSON.stringify({ from: "../oops.yaml", to: "new.yaml" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    assert.equal(res.status, 400);
  });
});

test("returns 400 for path traversal in 'to'", async () => {
  await withTempWebCwd(async () => {
    const req = new NextRequest("http://localhost/api/workflow/rename", {
      method: "POST",
      body: JSON.stringify({ from: "old.yaml", to: "../oops.yaml" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    assert.equal(res.status, 400);
  });
});

test("returns 400 for non-yaml 'to' filename", async () => {
  await withTempWebCwd(async () => {
    const req = new NextRequest("http://localhost/api/workflow/rename", {
      method: "POST",
      body: JSON.stringify({ from: "old.yaml", to: "new.txt" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    assert.equal(res.status, 400);
  });
});

test("returns 404 when source file does not exist", async () => {
  await withTempWebCwd(async () => {
    const req = new NextRequest("http://localhost/api/workflow/rename", {
      method: "POST",
      body: JSON.stringify({ from: "missing.yaml", to: "new.yaml" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    assert.equal(res.status, 404);
  });
});

test("returns 409 when target filename already exists", async () => {
  await withTempWebCwd(async ({ workflowDir }) => {
    await writeFile(path.join(workflowDir, "old.yaml"), "name: old\n", "utf-8");
    await writeFile(path.join(workflowDir, "taken.yaml"), "name: taken\n", "utf-8");

    const req = new NextRequest("http://localhost/api/workflow/rename", {
      method: "POST",
      body: JSON.stringify({ from: "old.yaml", to: "taken.yaml" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    assert.equal(res.status, 409);
  });
});
