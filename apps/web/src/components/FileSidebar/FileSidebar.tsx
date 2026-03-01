"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Folder, FolderPlus, Plug, Plus, Trash2 } from "lucide-react";

import { SidebarHeader } from "./SidebarHeader";
import { CreateWorkflowDialog } from "./CreateWorkflowDialog";
import { FolderBrowserDialog } from "./FolderBrowserDialog";
import { WorkflowItem } from "./WorkflowItem";
import { Button } from "@/components/ui/button";
import { hashFolderPath } from "@/utils/folderHash";

interface FileSidebarProps {
  onSelectFile?: (filename: string, content: string) => void;
  onSelectFolder?: (folderPath: string | null) => void;
  selectedFile?: string | null;
  selectedFolder?: string | null;
}

const FOLDERS_STORAGE_KEY = "agent-flow.folders";
let WORKFLOW_FILES_CACHE: string[] | null = null;

function getFolderDisplayName(folderPath: string): string {
  const parts = folderPath.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? folderPath;
}

export function FileSidebar({
  onSelectFile,
  onSelectFolder,
  selectedFile,
  selectedFolder,
}: FileSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const routeFolderId =
    pathname.startsWith("/folder/") && pathname.length > "/folder/".length
      ? pathname.slice("/folder/".length)
      : null;

  const [files, setFiles] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(true);

  const persistFolders = (nextFolders: string[]) => {
    setFolders(nextFolders);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(nextFolders));
    }
  };

  const fetchFiles = useCallback(async (force = false) => {
    if (!force && WORKFLOW_FILES_CACHE) {
      setFiles(WORKFLOW_FILES_CACHE);
      setLoadingFiles(false);
      return;
    }

    try {
      const res = await fetch("/api/workflow/list");
      const data = (await res.json()) as { workflows: string[] };
      const workflows = data.workflows ?? [];
      WORKFLOW_FILES_CACHE = workflows;
      setFiles(workflows);
    } catch {
      // ignore
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(FOLDERS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      setFolders(parsed.filter((item): item is string => typeof item === "string"));
    } catch {
      // ignore malformed storage
    }
  }, []);

  const selectFile = async (filename: string) => {
    try {
      const res = await fetch(`/api/workflow/read?file=${encodeURIComponent(filename)}`);
      const data = (await res.json()) as { content?: string };
      if (onSelectFile) {
        onSelectFile(filename, data.content ?? "");
        return;
      }
    } catch {
      // ignore
    }

    router.push(`/workflow/${encodeURIComponent(filename)}`);
  };

  const addFolder = (folderPath: string) => {
    const trimmed = folderPath.trim();
    if (!trimmed) return;

    const nextFolders = folders.includes(trimmed) ? folders : [...folders, trimmed];
    persistFolders(nextFolders);
    if (onSelectFolder) {
      onSelectFolder(trimmed);
      return;
    }
    router.push(`/folder/${hashFolderPath(trimmed)}`);
  };

  const removeFolder = (folderPath: string) => {
    const nextFolders = folders.filter((folder) => folder !== folderPath);
    persistFolders(nextFolders);

    const isSelected =
      selectedFolder === folderPath ||
      (routeFolderId !== null && hashFolderPath(folderPath) === routeFolderId);
    if (isSelected) {
      if (onSelectFolder) {
        onSelectFolder(null);
      } else {
        router.push("/");
      }
    }
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-white">
      <nav className="px-2 py-1.5 flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12px] text-ink transition hover:bg-surface"
        >
          <Plus size={14} className="text-muted-fg" />
          new workFlow
        </button>
        <Link
          href="/connectors"
          className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12px] transition hover:bg-surface ${
            pathname === "/connectors" ? "bg-surface font-semibold text-pink" : "text-ink"
          }`}
        >
          <Plug size={14} className={pathname === "/connectors" ? "text-pink" : "text-muted-fg"} />
          Connectors
        </Link>
      </nav>

      <SidebarHeader onCreateClick={() => setShowCreate(true)} title="Workflow" />

      <div className="flex-1 overflow-y-auto">
        {!loadingFiles && files.length === 0 ? (
          <div className="px-3 py-4 text-[11px] leading-relaxed text-muted-fg">
            No workflow files yet.
            <br />
            Click + to create one.
          </div>
        ) : (
          files.map((filename) => (
            <WorkflowItem
              key={filename}
              filename={filename}
              isSelected={selectedFile === filename}
              onWorkflowClick={() => void selectFile(filename)}
            />
          ))
        )}

        <div className="mt-2 pt-2">
          <div className="flex items-center gap-1.5 px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-fg">
            Folder
            <Button
              variant="icon-border"
              size="icon-xs"
              onClick={() => setShowFolderBrowser(true)}
              className="ml-auto text-sm leading-none"
              aria-label="Browse folders"
              title="Browse folders"
            >
              <FolderPlus size={12} />
            </Button>
          </div>

          {folders.length === 0 ? (
            <div className="px-3 pb-3 text-[10px] text-muted-fg">
              No folders yet. Click Browse to add one.
            </div>
          ) : (
            folders.map((folderPath) => {
              const folderName = getFolderDisplayName(folderPath);
              const isSelected =
                selectedFolder === folderPath ||
                (routeFolderId !== null && hashFolderPath(folderPath) === routeFolderId);
              return (
                <button
                  key={folderPath}
                  type="button"
                  onClick={() => {
                    if (onSelectFolder) {
                      onSelectFolder(folderPath);
                      return;
                    }
                    router.push(`/folder/${hashFolderPath(folderPath)}`);
                  }}
                  className={`group flex w-full items-center gap-1.5 border-l-2 px-2 py-2 text-left text-xs transition ${
                    isSelected
                      ? "border-pink bg-pink-subtle text-dark"
                      : "border-transparent text-ink hover:bg-surface hover:text-dark"
                  }`}
                  title={folderName}
                >
                  <Folder size={12} className="shrink-0 text-muted-fg" />
                  <span className="min-w-0 flex-1 truncate">{folderName}</span>
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeFolder(folderPath);
                    }}
                    className="rounded p-0.5 text-muted-fg opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                    aria-label={`Remove folder ${folderName}`}
                  >
                    <Trash2 size={11} />
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <FolderBrowserDialog
        open={showFolderBrowser}
        initialPath={selectedFolder}
        onClose={() => setShowFolderBrowser(false)}
        onSelectFolder={addFolder}
      />

      <CreateWorkflowDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(filename) => {
          setShowCreate(false);
          void fetchFiles(true);
          router.push(`/workflow/${encodeURIComponent(filename)}`);
        }}
      />
    </aside>
  );
}
