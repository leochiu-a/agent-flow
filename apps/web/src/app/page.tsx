"use client";

import { useState } from "react";
import { load as yamlLoad } from "js-yaml";
import { FileSidebar } from "@/components/FileSidebar/FileSidebar";
import { TerminalPanel } from "@/components/TerminalPanel";
import { WorkflowCanvas } from "@/components/WorkflowCanvas";
import type { LogLine } from "@/components/WorkflowCanvas";
import type { WorkflowDefinition } from "@agent-flow/core";

export default function Home() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [workflowDefinition, setWorkflowDefinition] = useState<WorkflowDefinition | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState<{ filename: string; content: string } | null>(
    null,
  );
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);

  const handleSelectFile = (filename: string, content: string) => {
    setSelectedFile(filename);
    try {
      const parsed = yamlLoad(content) as WorkflowDefinition;
      setWorkflowDefinition(parsed);
    } catch {
      // ignore invalid YAML
      setWorkflowDefinition(null);
    }
  };

  const handleSelectSession = (logLines: LogLine[], _success: boolean) => {
    setLines(logLines);
    setShowTerminal(true);
  };

  const handleRunningChange = (nextRunning: boolean) => {
    setRunning(nextRunning);
    if (nextRunning) {
      setShowTerminal(true);
    } else {
      // Run completed — refresh sidebar sessions
      setSessionRefreshKey((k) => k + 1);
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
          onSelectSession={handleSelectSession}
          savedContent={savedContent}
          refreshKey={sessionRefreshKey}
          runningFile={running ? selectedFile : null}
          selectedFile={selectedFile}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
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
              onSave={(filename, content) => setSavedContent({ filename, content })}
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
