"use client";

import { useState } from "react";
import { load as yamlLoad } from "js-yaml";
import { FileSidebar } from "@/components/FileSidebar";
import { TerminalPanel } from "@/components/TerminalPanel";
import { WorkflowCanvas } from "@/components/WorkflowCanvas";
import type { LogLine } from "@/components/WorkflowCanvas";
import type { WorkflowDefinition } from "@agent-flow/core";

export default function Home() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [workflowDefinition, setWorkflowDefinition] = useState<WorkflowDefinition | null>(null);

  const handleSelectFile = (_filename: string, content: string) => {
    try {
      const parsed = yamlLoad(content) as WorkflowDefinition;
      setWorkflowDefinition(parsed);
    } catch {
      // ignore invalid YAML
    }
  };

  const handleRunningChange = (nextRunning: boolean) => {
    setRunning(nextRunning);
    if (nextRunning) {
      setShowTerminal(true);
    }
  };

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-950/70 text-slate-100">
      <header className="flex h-12 shrink-0 items-center border-b border-slate-800/80 bg-slate-950/90 px-4 backdrop-blur-sm">
        <span className="text-sm font-bold tracking-wide text-cyan-400">AGENT FLOW</span>
        <span className="ml-3 text-[11px] uppercase tracking-[0.14em] text-slate-500">
          Visual Workflow Builder
        </span>

        <div className="ml-auto flex items-center gap-2">
          {lines.length > 0 && !showTerminal && (
            <button
              type="button"
              onClick={() => setShowTerminal(true)}
              className="rounded-md border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
            >
              Show Output
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <FileSidebar onSelectFile={handleSelectFile} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className={`min-h-0 transition-all duration-300 ${showTerminal ? "basis-[62%]" : "flex-1"}`}
          >
            <WorkflowCanvas
              onLinesChange={setLines}
              onRunningChange={handleRunningChange}
              workflowDefinition={workflowDefinition}
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
