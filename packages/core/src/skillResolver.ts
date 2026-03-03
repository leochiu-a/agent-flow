import os from "node:os";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import yaml from "js-yaml";

const SAFE_SKILL_NAME = /^[a-zA-Z0-9_-]+$/;

/** Treat both real directories and symlinks-to-directories as traversable entries. */
const isTraversable = (e: import("node:fs").Dirent) => e.isDirectory() || e.isSymbolicLink();

export function isValidSkillName(name: string): boolean {
  return SAFE_SKILL_NAME.test(name);
}

export function getClaudeDir(homeDir?: string): string {
  return path.join(homeDir ?? os.homedir(), ".claude");
}

export interface SkillInfo {
  name: string;
  description: string;
  source: "user" | "plugin";
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const parsed = yaml.load(match[1]) as Record<string, unknown> | null;
  if (!parsed || typeof parsed !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(parsed)) {
    if (typeof val === "string") result[key] = val;
  }
  return result;
}

async function readSkillMd(
  skillDir: string,
  skillName: string,
): Promise<{ name: string; description: string } | null> {
  try {
    const content = await readFile(path.join(skillDir, "SKILL.md"), "utf8");
    const fm = parseFrontmatter(content);
    return { name: fm.name || skillName, description: fm.description || "" };
  } catch {
    return null;
  }
}

/**
 * Resolve the content of a skill's SKILL.md by name.
 * Searches user skills first, then plugin skills.
 */
export async function resolveSkillContent(
  skillName: string,
  homeDir?: string,
): Promise<string | null> {
  if (!isValidSkillName(skillName)) return null;

  const claudeDir = getClaudeDir(homeDir);

  // Try user skills first
  try {
    return await readFile(path.join(claudeDir, "skills", skillName, "SKILL.md"), "utf8");
  } catch {
    // Not found, try plugin skills
  }

  // Fall back to plugin skills
  const marketplacesDir = path.join(claudeDir, "plugins", "marketplaces");
  try {
    const marketplaces = await readdir(marketplacesDir);
    for (const marketplace of marketplaces) {
      const pluginsDir = path.join(marketplacesDir, marketplace, "plugins");
      let plugins: string[];
      try {
        plugins = await readdir(pluginsDir);
      } catch {
        continue;
      }
      for (const plugin of plugins) {
        try {
          return await readFile(
            path.join(pluginsDir, plugin, "skills", skillName, "SKILL.md"),
            "utf8",
          );
        } catch {
          continue;
        }
      }
    }
  } catch {
    // No marketplaces directory
  }

  return null;
}

/**
 * List all installed skills (user + plugin), with user skills taking precedence.
 */
export async function listSkills(homeDir?: string): Promise<SkillInfo[]> {
  const claudeDir = getClaudeDir(homeDir);
  const skills = new Map<string, SkillInfo>();

  // User skills
  const userSkillsDir = path.join(claudeDir, "skills");
  try {
    const entries = await readdir(userSkillsDir, { withFileTypes: true });
    const results = await Promise.all(
      entries
        .filter((e) => isTraversable(e))
        .map(async (entry) => {
          const info = await readSkillMd(path.join(userSkillsDir, entry.name), entry.name);
          return info ? ([entry.name, { ...info, source: "user" as const }] as const) : null;
        }),
    );
    for (const r of results) {
      if (r) skills.set(r[0], r[1]);
    }
  } catch {
    // No user skills directory
  }

  // Plugin skills
  const marketplacesDir = path.join(claudeDir, "plugins", "marketplaces");
  try {
    const marketplaces = await readdir(marketplacesDir, { withFileTypes: true });
    for (const marketplace of marketplaces) {
      if (!isTraversable(marketplace)) continue;
      const pluginsDir = path.join(marketplacesDir, marketplace.name, "plugins");
      let plugins: import("node:fs").Dirent[];
      try {
        plugins = await readdir(pluginsDir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const plugin of plugins) {
        if (!isTraversable(plugin)) continue;
        const skillsDir = path.join(pluginsDir, plugin.name, "skills");
        let skillEntries: import("node:fs").Dirent[];
        try {
          skillEntries = await readdir(skillsDir, { withFileTypes: true });
        } catch {
          continue;
        }
        const reads = skillEntries
          .filter((e) => isTraversable(e) && !skills.has(e.name))
          .map(async (entry) => {
            const info = await readSkillMd(path.join(skillsDir, entry.name), entry.name);
            return info ? ([entry.name, { ...info, source: "plugin" as const }] as const) : null;
          });
        const results = await Promise.all(reads);
        for (const r of results) {
          if (r && !skills.has(r[0])) skills.set(r[0], r[1]);
        }
      }
    }
  } catch {
    // No plugin marketplaces directory
  }

  return [...skills.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, info]) => info);
}
