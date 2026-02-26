import { NextRequest, NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { getSafeParentDirectory, resolveBrowseDirectory } from "@/lib/directoryAccess";

export const runtime = "nodejs";

interface DirectoryNode {
  name: string;
  path: string;
}

interface BrowseResponse {
  path: string;
  parent: string | null;
  directories: DirectoryNode[];
}

export async function GET(req: NextRequest) {
  const requestedPath = req.nextUrl.searchParams.get("path");
  const resolved = await resolveBrowseDirectory(requestedPath);
  if (!resolved.ok || !resolved.resolvedPath) {
    return NextResponse.json(
      { error: resolved.error ?? "Directory access denied." },
      { status: resolved.status },
    );
  }

  const currentPath = resolved.resolvedPath;

  try {
    const entries = await readdir(currentPath, { withFileTypes: true });
    const directories: DirectoryNode[] = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        path: path.join(currentPath, entry.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const parent = await getSafeParentDirectory(currentPath);
    const payload: BrowseResponse = {
      path: currentPath,
      parent,
      directories,
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Unable to browse this directory." }, { status: 400 });
  }
}
