import fs from "fs/promises";
import path from "path";

const ALLOWED_DIRS_ENV = "AGENT_FLOW_ALLOWED_DIRS";

export interface DirectoryCheckResult {
  ok: boolean;
  status: number;
  error?: string;
  resolvedPath?: string;
}

function parseAllowedRootsFromEnv(): string[] {
  const configured = process.env[ALLOWED_DIRS_ENV];
  if (!configured) return [];
  return configured
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function normalizeExistingDirectory(inputPath: string): Promise<string | null> {
  try {
    const stat = await fs.stat(inputPath);
    if (!stat.isDirectory()) return null;
    return await fs.realpath(inputPath);
  } catch {
    return null;
  }
}

function isWithinRoot(targetPath: string, rootPath: string): boolean {
  const relative = path.relative(rootPath, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function getAllowedDirectoryRoots(): Promise<string[]> {
  const configuredRoots = parseAllowedRootsFromEnv();
  const fallbackRoots = [process.env.HOME, process.cwd()].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  const rootsToUse = configuredRoots.length > 0 ? configuredRoots : fallbackRoots;
  const candidates = rootsToUse.map((candidate) => path.resolve(candidate));

  const normalizedRoots = await Promise.all(candidates.map(normalizeExistingDirectory));
  return [...new Set(normalizedRoots.filter((root): root is string => !!root))];
}

export async function getDefaultBrowseDirectory(): Promise<string> {
  const roots = await getAllowedDirectoryRoots();
  return roots[0] ?? process.cwd();
}

export async function validateAllowedDirectory(rawPath: string): Promise<DirectoryCheckResult> {
  if (!rawPath.trim()) {
    return { ok: false, status: 400, error: "Directory path is required." };
  }

  const roots = await getAllowedDirectoryRoots();
  const absoluteInput = path.isAbsolute(rawPath) ? path.normalize(rawPath) : path.resolve(rawPath);
  const normalizedTarget = await normalizeExistingDirectory(absoluteInput);

  if (!normalizedTarget) {
    return { ok: false, status: 400, error: "Directory is invalid or not accessible." };
  }

  const allowed = roots.some((root) => isWithinRoot(normalizedTarget, root));
  if (!allowed) {
    return { ok: false, status: 403, error: "Directory is outside allowed roots." };
  }

  return { ok: true, status: 200, resolvedPath: normalizedTarget };
}

export async function resolveBrowseDirectory(
  rawPath: string | null,
): Promise<DirectoryCheckResult> {
  if (!rawPath || !rawPath.trim()) {
    const defaultPath = await getDefaultBrowseDirectory();
    return { ok: true, status: 200, resolvedPath: defaultPath };
  }
  return validateAllowedDirectory(rawPath);
}

export async function getSafeParentDirectory(currentPath: string): Promise<string | null> {
  const parentPath = path.dirname(currentPath);
  if (parentPath === currentPath) {
    return null;
  }

  const validated = await validateAllowedDirectory(parentPath);
  return validated.ok ? (validated.resolvedPath ?? null) : null;
}
