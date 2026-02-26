"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Folder, FolderUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface DirectoryNode {
  name: string;
  path: string;
}

interface BrowseResponse {
  path: string;
  parent: string | null;
  directories: DirectoryNode[];
}

interface FolderBrowserDialogProps {
  open: boolean;
  initialPath?: string | null;
  onClose: () => void;
  onSelectFolder: (folderPath: string) => void;
}

export function FolderBrowserDialog({
  open,
  initialPath,
  onClose,
  onSelectFolder,
}: FolderBrowserDialogProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [directories, setDirectories] = useState<DirectoryNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHiddenFolders, setShowHiddenFolders] = useState(false);

  const fetchDirectory = async (targetPath?: string) => {
    setLoading(true);
    setError(null);
    try {
      const query = targetPath ? `?path=${encodeURIComponent(targetPath)}` : "";
      const res = await fetch(`/api/folder/browse${query}`);
      const data = (await res.json()) as BrowseResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Unable to browse folder.");
      }

      setCurrentPath(data.path);
      setParentPath(data.parent);
      setDirectories(data.directories ?? []);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Unable to browse folder.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void fetchDirectory(initialPath ?? undefined);
  }, [open, initialPath]);

  const visibleDirectories = useMemo(() => {
    if (showHiddenFolders) return directories;
    return directories.filter((directory) => !directory.name.startsWith("."));
  }, [directories, showHiddenFolders]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-w-2xl gap-0 p-0" showCloseButton={false}>
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Folder size={14} className="text-muted-fg" />
          <DialogTitle className="text-sm font-semibold text-dark">Browse Folder</DialogTitle>
          <DialogDescription className="sr-only">
            Browse directories and select a folder for workflow execution context.
          </DialogDescription>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => void fetchDirectory(currentPath || undefined)}
              disabled={loading}
            >
              <RefreshCw size={11} />
              Refresh
            </Button>
            <Button variant="outline" size="xs" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 truncate text-[11px] text-ink" title={currentPath}>
              {currentPath}
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-ink">
              <Checkbox
                checked={showHiddenFolders}
                onCheckedChange={(checked) => setShowHiddenFolders(checked === true)}
              />
              Show hidden
            </label>
          </div>
        </div>

        <div className="relative h-[420px] overflow-y-auto px-2 py-2">
          <button
            type="button"
            onClick={() => {
              if (parentPath) {
                void fetchDirectory(parentPath);
              }
            }}
            disabled={!parentPath || loading}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-ink transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FolderUp size={13} className="text-muted-fg" />
            ..
          </button>

          {error ? (
            <div className="px-2 py-3 text-[11px] text-pink">{error}</div>
          ) : visibleDirectories.length === 0 ? (
            <div className="px-2 py-3 text-[11px] text-muted-fg">No subfolders.</div>
          ) : (
            visibleDirectories.map((directory) => (
              <button
                key={directory.path}
                type="button"
                onClick={() => void fetchDirectory(directory.path)}
                disabled={loading}
                className="group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-ink transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-80"
                title={directory.path}
              >
                <Folder size={13} className="text-muted-fg" />
                <span className="min-w-0 flex-1 truncate">{directory.name}</span>
                <ChevronRight
                  size={12}
                  className="text-muted-fg opacity-0 transition group-hover:opacity-100"
                />
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button
            variant="pink"
            size="sm"
            onClick={() => {
              if (!currentPath) return;
              onSelectFolder(currentPath);
              onClose();
            }}
            disabled={!currentPath || loading || !!error}
          >
            Use This Folder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
