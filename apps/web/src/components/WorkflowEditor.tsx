"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, Save } from "lucide-react";
import { dump as yamlDump } from "js-yaml";
import { FileSidebar } from "@/components/FileSidebar/FileSidebar";
import { TerminalPanel } from "@/components/TerminalPanel";
import { WorkflowCanvas } from "@/components/WorkflowCanvas";
import { WorkflowLayout } from "@/components/WorkflowLayout";
import { useWorkflowDefinitionCache } from "@/hooks/useWorkflowDefinitionCache";
import { useTerminalPanel } from "@/hooks/useTerminalPanel";
import { useNavigation } from "@/hooks/useNavigation";
import { useWorkflowRunner } from "@/hooks/useWorkflowRunner";
import { useWorkflowGraph } from "@/hooks/useWorkflowGraph";
import { Button } from "@/components/ui/button";

interface WorkflowEditorProps {
  initialFile?: string;
}

export function WorkflowEditor({ initialFile }: WorkflowEditorProps) {
  const cache = useWorkflowDefinitionCache(initialFile);
  const terminal = useTerminalPanel();
  const nav = useNavigation({ setFromContent: cache.setFromContent });

  const runner = useWorkflowRunner({
    onLinesChange: terminal.setLines,
    onRunningChange: terminal.handleRunningChange,
  });

  const graph = useWorkflowGraph({
    activeFile: initialFile,
    claudeSession: cache.workflowDefinition?.claude_session,
  });

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Load workflow when initialFile changes
  useEffect(() => {
    if (initialFile) {
      void cache.loadFromFile(initialFile);
    } else {
      cache.clearDefinition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  // Sync graph when definition loads
  useEffect(() => {
    graph.loadDefinition(cache.workflowDefinition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache.workflowDefinition]);

  const handleSaveWorkflow = useCallback(async () => {
    if (!initialFile) return;

    const content = yamlDump(graph.getDefinition());
    setSaveStatus("saving");

    try {
      const res = await fetch("/api/workflow/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: initialFile, content }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      cache.setFromContent(initialFile, content);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [initialFile, graph, cache]);

  return (
    <WorkflowLayout
      sidebar={
        <FileSidebar
          onSelectFile={nav.handleSelectFile}
          selectedFile={initialFile ?? null}
          selectedFolder={null}
          onSelectFolder={nav.handleSelectFolder}
        />
      }
      canvas={
        <div className="relative h-full w-full">
          <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 shadow-md shadow-black/8 backdrop-blur">
            <Button variant="pink" size="sm" onClick={graph.addNode} disabled={runner.running}>
              + Claude Agent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSaveWorkflow()}
              disabled={!initialFile || graph.nodeCount === 0 || saveStatus === "saving"}
            >
              <Save size={11} className="mr-1" />
              Save
            </Button>
            {saveStatus !== "idle" && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                  saveStatus === "saving"
                    ? "bg-disabled text-ink"
                    : saveStatus === "saved"
                      ? "border border-orange/30 bg-orange/10 text-orange"
                      : "border border-pink/30 bg-pink/10 text-pink"
                }`}
              >
                {saveStatus === "saving" ? (
                  "Saving…"
                ) : saveStatus === "saved" ? (
                  <>
                    <Check size={11} className="mr-0.5 inline" />
                    Saved
                  </>
                ) : (
                  <>
                    <AlertCircle size={11} className="mr-0.5 inline" />
                    Error
                  </>
                )}
              </span>
            )}
          </div>
          <WorkflowCanvas
            graph={graph}
            activeFile={initialFile ?? null}
            onSave={cache.setFromContent}
          />
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
