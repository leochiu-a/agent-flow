import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test, vi, beforeEach, afterEach } from "vitest";

// We mock os.homedir() so the route reads from our temp directory
vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return { ...actual, default: { ...actual, homedir: vi.fn() } };
});

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-skills-api-"));
  const osDefault = await import("node:os");
  vi.mocked(osDefault.default.homedir).mockReturnValue(tmpDir);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(tmpDir, { recursive: true, force: true });
});

async function callGET() {
  // Import fresh each time so the mock takes effect
  const { GET } = await import("./route");
  const res = await GET();
  return res.json() as Promise<{
    skills: Array<{ name: string; description: string; source: "user" | "plugin" }>;
  }>;
}

test("returns empty list when no skills directories exist", async () => {
  const data = await callGET();
  assert.deepEqual(data.skills, []);
});

test("returns user skills from ~/.claude/skills/", async () => {
  const skillDir = path.join(tmpDir, ".claude", "skills", "code-review");
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    `---
name: code-review
description: Reviews code for quality
---
You are a code reviewer.`,
    "utf-8",
  );

  const data = await callGET();
  assert.equal(data.skills.length, 1);
  assert.equal(data.skills[0]!.name, "code-review");
  assert.equal(data.skills[0]!.description, "Reviews code for quality");
  assert.equal(data.skills[0]!.source, "user");
});

test("returns plugin skills from marketplace directories", async () => {
  const pluginSkillDir = path.join(
    tmpDir,
    ".claude",
    "plugins",
    "marketplaces",
    "default",
    "plugins",
    "my-plugin",
    "skills",
    "lint",
  );
  await mkdir(pluginSkillDir, { recursive: true });
  await writeFile(
    path.join(pluginSkillDir, "SKILL.md"),
    `---
name: lint
description: Lints code
---
You are a linter.`,
    "utf-8",
  );

  const data = await callGET();
  assert.equal(data.skills.length, 1);
  assert.equal(data.skills[0]!.name, "lint");
  assert.equal(data.skills[0]!.source, "plugin");
});

test("user skills take precedence over plugin skills with the same name", async () => {
  // Create user skill
  const userDir = path.join(tmpDir, ".claude", "skills", "lint");
  await mkdir(userDir, { recursive: true });
  await writeFile(
    path.join(userDir, "SKILL.md"),
    `---
name: lint
description: User lint skill
---`,
    "utf-8",
  );

  // Create plugin skill with same name
  const pluginDir = path.join(
    tmpDir,
    ".claude",
    "plugins",
    "marketplaces",
    "default",
    "plugins",
    "p",
    "skills",
    "lint",
  );
  await mkdir(pluginDir, { recursive: true });
  await writeFile(
    path.join(pluginDir, "SKILL.md"),
    `---
name: lint
description: Plugin lint skill
---`,
    "utf-8",
  );

  const data = await callGET();
  const lintSkills = data.skills.filter((s) => s.name === "lint");
  assert.equal(lintSkills.length, 1);
  assert.equal(lintSkills[0]!.source, "user");
  assert.equal(lintSkills[0]!.description, "User lint skill");
});

test("results are sorted alphabetically by name", async () => {
  const skillsDir = path.join(tmpDir, ".claude", "skills");
  for (const name of ["zebra", "alpha", "mid"]) {
    const dir = path.join(skillsDir, name);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "SKILL.md"), `---\nname: ${name}\n---`, "utf-8");
  }

  const data = await callGET();
  const names = data.skills.map((s) => s.name);
  assert.deepEqual(names, ["alpha", "mid", "zebra"]);
});

test("uses directory name when frontmatter has no name field", async () => {
  const skillDir = path.join(tmpDir, ".claude", "skills", "my-skill");
  await mkdir(skillDir, { recursive: true });
  await writeFile(path.join(skillDir, "SKILL.md"), "No frontmatter here.", "utf-8");

  const data = await callGET();
  assert.equal(data.skills.length, 1);
  assert.equal(data.skills[0]!.name, "my-skill");
  assert.equal(data.skills[0]!.description, "");
});
