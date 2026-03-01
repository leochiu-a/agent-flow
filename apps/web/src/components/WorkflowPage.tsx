"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { load as yamlLoad } from "js-yaml";
import { FileSidebar } from "@/components/FileSidebar/FileSidebar";
import { TerminalPanel } from "@/components/TerminalPanel";
import { WorkflowCanvas } from "@/components/WorkflowCanvas";
import type { LogLine } from "@/components/WorkflowCanvas";
import type { WorkflowDefinition } from "@agent-flow/core";
import { hashFolderPath } from "@/utils/folderHash";

const FOLDERS_STORAGE_KEY = "agent-flow.folders";

interface WorkflowPageProps {
  initialFile?: string;
  initialFolderId?: string;
}

export function WorkflowPage({ initialFile, initialFolderId }: WorkflowPageProps) {
  const router = useRouter();

  const [lines, setLines] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [workflowDefinition, setWorkflowDefinition] = useState<WorkflowDefinition | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(initialFile ?? null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Sync state whenever route params change (handles same-route navigation)
  useEffect(() => {
    setSelectedFile(initialFile ?? null);
    setSelectedFolder(null);
    setWorkflowDefinition(null);

    if (initialFile) {
      fetch(`/api/workflow/read?file=${encodeURIComponent(initialFile)}`)
        .then((res) => res.json())
        .then((data: { content?: string }) => {
          try {
            setWorkflowDefinition(yamlLoad(data.content ?? "") as WorkflowDefinition);
          } catch {
            setWorkflowDefinition(null);
          }
        })
        .catch(() => {});
    } else if (initialFolderId) {
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
    }
  }, [initialFile, initialFolderId]);

  const handleSelectFile = (filename: string, _content: string) => {
    router.push(`/workflow/${encodeURIComponent(filename)}`);
  };

  const handleSelectFolder = (folderPath: string | null) => {
    if (!folderPath) {
      router.push("/");
    } else {
      router.push(`/folder/${hashFolderPath(folderPath)}`);
    }
  };

  const handleRunningChange = (nextRunning: boolean) => {
    setRunning(nextRunning);
    if (nextRunning) {
      setShowTerminal(true);
    }
  };

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-canvas text-dark">
      <header className="flex h-12 shrink-0 items-center border-b border-border bg-white px-4 shadow-sm">
        <span className="text-sm font-bold tracking-wide text-pink">AGENT FLOW</span>
        <div className="ml-auto flex items-center gap-2">
          {lines.length > 0 && !showTerminal && (
            <button
              type="button"
              onClick={() => setShowTerminal(true)}
              className="rounded-md border border-border px-2.5 py-1 text-[11px] text-ink transition hover:border-pink hover:text-pink"
            >
              Show Output
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <FileSidebar
          onSelectFile={handleSelectFile}
          selectedFile={selectedFile}
          selectedFolder={selectedFolder}
          onSelectFolder={handleSelectFolder}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className={`min-h-0 transition-all duration-300 ${showTerminal ? "basis-[62%]" : "flex-1"}`}
          >
            <WorkflowCanvas
              onLinesChange={setLines}
              onRunningChange={handleRunningChange}
              workflowDefinition={workflowDefinition}
              selectedFile={selectedFile}
              selectedFolder={selectedFolder}
            />
          </div>

          {showTerminal && (
            <div className="min-h-0 basis-[38%]">
              <TerminalPanel
                lines={lines}
                running={running}
                onClose={() => setShowTerminal(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
