"use client";

import { useEffect, useState } from "react";
import { Play, Square } from "lucide-react";
import { FileSidebar } from "@/components/FileSidebar/FileSidebar";
import { TerminalPanel } from "@/components/TerminalPanel";
import { WorkflowCanvas } from "@/components/WorkflowCanvas";
import { WorkflowLayout } from "@/components/WorkflowLayout";
import { useWorkflowDefinitionCache } from "@/hooks/useWorkflowDefinitionCache";
import { useTerminalPanel } from "@/hooks/useTerminalPanel";
import { useNavigation } from "@/hooks/useNavigation";
import { useWorkflowRunner } from "@/hooks/useWorkflowRunner";
import { useWorkflowGraph } from "@/hooks/useWorkflowGraph";
import { hashFolderPath } from "@/utils/folderHash";
import { Button } from "@/components/ui/button";

const FOLDERS_STORAGE_KEY = "agent-flow.folders";

interface FolderRunnerProps {
  initialFolderId: string;
}

export function FolderRunner({ initialFolderId }: FolderRunnerProps) {
  const cache = useWorkflowDefinitionCache();
  const terminal = useTerminalPanel();
  const nav = useNavigation({ setFromContent: cache.setFromContent });

  const runner = useWorkflowRunner({
    onLinesChange: terminal.setLines,
    onRunningChange: terminal.handleRunningChange,
  });

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [workflowFiles, setWorkflowFiles] = useState<string[]>([]);
  const [folderWorkflowFile, setFolderWorkflowFile] = useState("");

  const activeFile = folderWorkflowFile || null;

  const graph = useWorkflowGraph({
    activeFile,
    claudeSession: cache.workflowDefinition?.claude_session,
  });

  // Resolve folder path from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FOLDERS_STORAGE_KEY);
      const folders = (JSON.parse(raw ?? "[]") as unknown[]).filter(
        (item): item is string => typeof item === "string",
      );
      const match = folders.find((path) => hashFolderPath(path) === initialFolderId);
      if (match) {
        setSelectedFolder(match);
      }
    } catch {
      // ignore
    }
  }, [initialFolderId]);

  // Fetch workflow file list
  useEffect(() => {
    fetch("/api/workflow/list")
      .then((r) => r.json())
      .then((d: { workflows: string[] }) => setWorkflowFiles(d.workflows ?? []))
      .catch(() => {});
  }, []);

  // Load workflow definition when dropdown selection changes
  useEffect(() => {
    if (!folderWorkflowFile) {
      cache.clearDefinition();
      return;
    }
    void cache.loadFromFile(folderWorkflowFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderWorkflowFile]);

  // Sync graph when definition loads
  useEffect(() => {
    graph.loadDefinition(cache.workflowDefinition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache.workflowDefinition]);

  return (
    <WorkflowLayout
      sidebar={
        <FileSidebar
          onSelectFile={nav.handleSelectFile}
          selectedFile={null}
          selectedFolder={selectedFolder}
          onSelectFolder={nav.handleSelectFolder}
        />
      }
      canvas={
        <div className="relative h-full w-full">
          <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 shadow-md shadow-black/8 backdrop-blur">
            <select
              value={folderWorkflowFile}
              onChange={(e) => setFolderWorkflowFile(e.target.value)}
              disabled={runner.running}
              className="rounded-md border border-border bg-surface px-2 py-1 text-[10px] text-ink disabled:opacity-50"
            >
              <option value="">Select workflow…</option>
              {workflowFiles.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            {runner.running ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void runner.stopWorkflow()}
                disabled={!runner.sessionId || runner.stopping}
                className="border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
              >
                <Square size={11} className="mr-1" />
                {runner.stopping ? "Stopping…" : "Stop"}
              </Button>
            ) : (
              <Button
                variant="pink"
                size="sm"
                onClick={() =>
                  void runner.runWorkflow({
                    definition: graph.getDefinition(),
                    workflowFile: activeFile ?? undefined,
                    workingDirectory: selectedFolder ?? undefined,
                  })
                }
                disabled={graph.nodeCount === 0 || !activeFile}
              >
                <Play size={11} className="mr-1" />
                Run
              </Button>
            )}
          </div>
          <WorkflowCanvas graph={graph} activeFile={activeFile} />
        </div>
      }
      terminal={
        terminal.showTerminal ? (
          <TerminalPanel
            lines={terminal.lines}
            running={runner.running}
            onClose={terminal.closeTerminal}
          />
        ) : null
      }
      headerActions={
        terminal.lines.length > 0 && !terminal.showTerminal ? (
          <button
            type="button"
            onClick={terminal.openTerminal}
            className="rounded-md border border-border px-2.5 py-1 text-[11px] text-ink transition hover:border-pink hover:text-pink"
          >
            Show Output
          </button>
        ) : null
      }
    />
  );
}
