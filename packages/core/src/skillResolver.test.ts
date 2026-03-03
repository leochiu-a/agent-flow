import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, test } from "vitest";
import { isValidSkillName, getClaudeDir, resolveSkillContent, listSkills } from "./skillResolver";

// ---------------------------------------------------------------------------
// isValidSkillName
// ---------------------------------------------------------------------------
describe("isValidSkillName", () => {
  test("accepts alphanumeric names with hyphens and underscores", () => {
    assert.equal(isValidSkillName("code-review"), true);
    assert.equal(isValidSkillName("lint_v2"), true);
    assert.equal(isValidSkillName("MySkill"), true);
  });

  test("rejects path traversal attempts", () => {
    assert.equal(isValidSkillName("../etc/passwd"), false);
    assert.equal(isValidSkillName("foo/bar"), false);
    assert.equal(isValidSkillName("foo\\bar"), false);
  });

  test("rejects empty string", () => {
    assert.equal(isValidSkillName(""), false);
  });

  test("rejects names with spaces or special chars", () => {
    assert.equal(isValidSkillName("my skill"), false);
    assert.equal(isValidSkillName("skill!"), false);
    assert.equal(isValidSkillName("skill.v2"), false);
  });
});

// ---------------------------------------------------------------------------
// getClaudeDir
// ---------------------------------------------------------------------------
describe("getClaudeDir", () => {
  test("returns ~/.claude when no homeDir provided", () => {
    const result = getClaudeDir();
    assert.equal(result, path.join(os.homedir(), ".claude"));
  });

  test("uses provided homeDir", () => {
    assert.equal(getClaudeDir("/fake/home"), "/fake/home/.claude");
  });
});

// ---------------------------------------------------------------------------
// resolveSkillContent
// ---------------------------------------------------------------------------
describe("resolveSkillContent", () => {
  let tmpDir: string;

  async function setup() {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "skill-resolver-"));
    return tmpDir;
  }

  async function teardown() {
    await rm(tmpDir, { recursive: true, force: true });
  }

  test("returns user skill content when found", async () => {
    const home = await setup();
    try {
      const skillDir = path.join(home, ".claude", "skills", "code-review");
      await mkdir(skillDir, { recursive: true });
      await writeFile(path.join(skillDir, "SKILL.md"), "Review all code.", "utf-8");

      const content = await resolveSkillContent("code-review", home);
      assert.equal(content, "Review all code.");
    } finally {
      await teardown();
    }
  });

  test("falls back to plugin skill when user skill not found", async () => {
    const home = await setup();
    try {
      const pluginSkillDir = path.join(
        home,
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
      await writeFile(path.join(pluginSkillDir, "SKILL.md"), "Lint everything.", "utf-8");

      const content = await resolveSkillContent("lint", home);
      assert.equal(content, "Lint everything.");
    } finally {
      await teardown();
    }
  });

  test("returns null when skill not found anywhere", async () => {
    const home = await setup();
    try {
      await mkdir(path.join(home, ".claude"), { recursive: true });
      const content = await resolveSkillContent("nonexistent", home);
      assert.equal(content, null);
    } finally {
      await teardown();
    }
  });

  test("returns null for invalid skill names (path traversal)", async () => {
    const home = await setup();
    try {
      const content = await resolveSkillContent("../etc/passwd", home);
      assert.equal(content, null);
    } finally {
      await teardown();
    }
  });

  test("prefers user skill over plugin skill with same name", async () => {
    const home = await setup();
    try {
      // User skill
      const userDir = path.join(home, ".claude", "skills", "lint");
      await mkdir(userDir, { recursive: true });
      await writeFile(path.join(userDir, "SKILL.md"), "User lint.", "utf-8");

      // Plugin skill
      const pluginDir = path.join(
        home,
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
      await writeFile(path.join(pluginDir, "SKILL.md"), "Plugin lint.", "utf-8");

      const content = await resolveSkillContent("lint", home);
      assert.equal(content, "User lint.");
    } finally {
      await teardown();
    }
  });
});

// ---------------------------------------------------------------------------
// listSkills
// ---------------------------------------------------------------------------
describe("listSkills", () => {
  let tmpDir: string;

  async function setup() {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "skill-resolver-list-"));
    return tmpDir;
  }

  async function teardown() {
    await rm(tmpDir, { recursive: true, force: true });
  }

  test("returns empty array when no skills directories exist", async () => {
    const home = await setup();
    try {
      const skills = await listSkills(home);
      assert.deepEqual(skills, []);
    } finally {
      await teardown();
    }
  });

  test("returns user skills with parsed frontmatter", async () => {
    const home = await setup();
    try {
      const skillDir = path.join(home, ".claude", "skills", "code-review");
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        path.join(skillDir, "SKILL.md"),
        "---\nname: code-review\ndescription: Reviews code\n---\nContent here.",
        "utf-8",
      );

      const skills = await listSkills(home);
      assert.equal(skills.length, 1);
      assert.equal(skills[0]!.name, "code-review");
      assert.equal(skills[0]!.description, "Reviews code");
      assert.equal(skills[0]!.source, "user");
    } finally {
      await teardown();
    }
  });

  test("returns plugin skills", async () => {
    const home = await setup();
    try {
      const pluginDir = path.join(
        home,
        ".claude",
        "plugins",
        "marketplaces",
        "default",
        "plugins",
        "my-plugin",
        "skills",
        "lint",
      );
      await mkdir(pluginDir, { recursive: true });
      await writeFile(
        path.join(pluginDir, "SKILL.md"),
        "---\nname: lint\ndescription: Lints code\n---",
        "utf-8",
      );

      const skills = await listSkills(home);
      assert.equal(skills.length, 1);
      assert.equal(skills[0]!.name, "lint");
      assert.equal(skills[0]!.source, "plugin");
    } finally {
      await teardown();
    }
  });

  test("user skills take precedence over plugin skills with same name", async () => {
    const home = await setup();
    try {
      const userDir = path.join(home, ".claude", "skills", "lint");
      await mkdir(userDir, { recursive: true });
      await writeFile(
        path.join(userDir, "SKILL.md"),
        "---\nname: lint\ndescription: User lint\n---",
        "utf-8",
      );

      const pluginDir = path.join(
        home,
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
        "---\nname: lint\ndescription: Plugin lint\n---",
        "utf-8",
      );

      const skills = await listSkills(home);
      const lintSkills = skills.filter((s) => s.name === "lint");
      assert.equal(lintSkills.length, 1);
      assert.equal(lintSkills[0]!.source, "user");
      assert.equal(lintSkills[0]!.description, "User lint");
    } finally {
      await teardown();
    }
  });

  test("results are sorted alphabetically", async () => {
    const home = await setup();
    try {
      const skillsDir = path.join(home, ".claude", "skills");
      for (const name of ["zebra", "alpha", "mid"]) {
        const dir = path.join(skillsDir, name);
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, "SKILL.md"), `---\nname: ${name}\n---`, "utf-8");
      }

      const skills = await listSkills(home);
      const names = skills.map((s) => s.name);
      assert.deepEqual(names, ["alpha", "mid", "zebra"]);
    } finally {
      await teardown();
    }
  });

  test("uses directory name when frontmatter has no name field", async () => {
    const home = await setup();
    try {
      const skillDir = path.join(home, ".claude", "skills", "my-skill");
      await mkdir(skillDir, { recursive: true });
      await writeFile(path.join(skillDir, "SKILL.md"), "No frontmatter here.", "utf-8");

      const skills = await listSkills(home);
      assert.equal(skills.length, 1);
      assert.equal(skills[0]!.name, "my-skill");
      assert.equal(skills[0]!.description, "");
    } finally {
      await teardown();
    }
  });

  test("handles YAML frontmatter with quoted values and colons", async () => {
    const home = await setup();
    try {
      const skillDir = path.join(home, ".claude", "skills", "complex");
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        path.join(skillDir, "SKILL.md"),
        '---\nname: "complex"\ndescription: "Review: all code carefully"\n---',
        "utf-8",
      );

      const skills = await listSkills(home);
      assert.equal(skills.length, 1);
      assert.equal(skills[0]!.name, "complex");
      assert.equal(skills[0]!.description, "Review: all code carefully");
    } finally {
      await teardown();
    }
  });
});
