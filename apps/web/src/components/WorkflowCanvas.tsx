"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, Check, Clock, Play } from "lucide-react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { dump as yamlDump } from "js-yaml";
import type { LogEntry, WorkflowDefinition } from "@agent-flow/core";
import { StepNode } from "./StepNode";
import type { StepNodeData } from "./StepNode";
import { StepEditModal } from "./StepModals/StepEditModal";

export interface LogLine {
  text: string;
  level: string;
}

interface WorkflowCanvasProps {
  onLinesChange: (updater: (prev: LogLine[]) => LogLine[]) => void;
  onRunningChange: (running: boolean) => void;
  workflowDefinition?: WorkflowDefinition | null;
  selectedFile?: string | null;
  onSave?: (filename: string, content: string) => void;
}

const nodeTypes = { step: StepNode };

const newId = () => `step-${crypto.randomUUID().slice(0, 8)}`;

function resolveClaudeSessionMode(
  steps: WorkflowDefinition["workflow"],
  existingMode?: WorkflowDefinition["claude_session"],
): WorkflowDefinition["claude_session"] | undefined {
  if (existingMode === "shared") return "shared";
  const claudeStepCount = steps.filter((step) => step.agent === "claude").length;
  return claudeStepCount > 1 ? "shared" : undefined;
}

export function WorkflowCanvas({
  onLinesChange,
  onRunningChange,
  workflowDefinition,
  selectedFile,
  onSave,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [running, setRunning] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [isModalSaving, setIsModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const setNodesRef = useRef(setNodes);
  setNodesRef.current = setNodes;
  const setEdgesRef = useRef(setEdges);
  setEdgesRef.current = setEdges;

  const onRequestEdit = useCallback((id: string) => {
    setEditingStepId(id);
    setModalError(null);
  }, []);

  const onDelete = useCallback((id: string) => {
    setNodesRef.current((nds) => nds.filter((node) => node.id !== id));
    setEdgesRef.current((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
    setEditingStepId((current) => (current === id ? null : current));
  }, []);

  useEffect(() => {
    if (!workflowDefinition?.workflow?.length) return;

    const newNodes: Node[] = workflowDefinition.workflow.map((step, i) => {
      const id = newId();
      return {
        id,
        type: "step",
        position: { x: 60 + i * 340, y: 120 },
        data: {
          title: step.name,
          type: "claude",
          prompt: step.prompt ?? "",
          skipPermission: step.skip_permission ?? false,
          onRequestEdit,
          onDelete,
        },
      };
    });

    const newEdges: Edge[] = newNodes.slice(0, -1).map((node, i) => ({
      id: `e-${node.id}-${newNodes[i + 1].id}`,
      source: node.id,
      target: newNodes[i + 1].id,
      animated: true,
      style: { stroke: "var(--color-pink)", strokeWidth: 2 },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [workflowDefinition, onRequestEdit, onDelete, setNodes, setEdges]);

  const addNode = useCallback(() => {
    const id = newId();
    const lastNode = nodesRef.current[nodesRef.current.length - 1];
    const x = lastNode ? lastNode.position.x + 340 : 60;
    const y = lastNode ? lastNode.position.y : 120;

    const newNode: Node = {
      id,
      type: "step",
      position: { x, y },
      data: {
        title: "Claude Step",
        type: "claude",
        prompt: "",
        skipPermission: false,
        onRequestEdit,
        onDelete,
      },
    };

    setNodes((nds) => [...nds, newNode]);

    if (lastNode) {
      setEdgesRef.current((eds) => [
        ...eds,
        {
          id: `e-${lastNode.id}-${id}`,
          source: lastNode.id,
          target: id,
          animated: true,
          style: { stroke: "var(--color-pink)", strokeWidth: 2 },
        },
      ]);
    }
  }, [onDelete, onRequestEdit, setNodes]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...connection, animated: true, style: { stroke: "var(--color-pink)", strokeWidth: 2 } },
          eds,
        ),
      ),
    [setEdges],
  );

  const runWorkflow = useCallback(async () => {
    const currentNodes = nodesRef.current;
    if (running || currentNodes.length === 0) {
      return;
    }

    setRunning(true);
    onRunningChange(true);
    onLinesChange(() => []);

    const sorted = [...currentNodes].sort((a, b) => a.position.x - b.position.x);
    const workflow: WorkflowDefinition["workflow"] = sorted.map((node) => {
      const d = node.data as StepNodeData;
      return {
        name: d.title || "Claude Step",
        agent: "claude",
        prompt: d.prompt || "",
        skip_permission: d.skipPermission ?? false,
      };
    });

    const definition: WorkflowDefinition = {
      name: "Canvas Workflow",
      workflow,
    };
    const claudeSessionMode = resolveClaudeSessionMode(
      workflow,
      workflowDefinition?.claude_session,
    );
    if (claudeSessionMode) definition.claude_session = claudeSessionMode;

    try {
      const res = await fetch("/api/workflow/run-definition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ definition, workflowFile: selectedFile ?? undefined }),
      });

      if (!res.body) {
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) {
            continue;
          }

          try {
            const parsed = JSON.parse(part) as Record<string, unknown>;
            let line: LogLine;

            if (parsed.type === "done") {
              line = {
                text: `\n── Workflow ${parsed.success ? "✓ SUCCESS" : "✗ FAILED"} ──`,
                level: parsed.success ? "info" : "error",
              };
            } else if (parsed.type === "error") {
              line = { text: `[ERROR] ${parsed.message as string}`, level: "error" };
            } else {
              const entry = parsed as unknown as LogEntry;
              const prefix = entry.step ? `[${entry.step}] ` : "";
              const toolPrefix = entry.level === "tool_use" ? "⚙ " : "";
              line = { text: `${prefix}${toolPrefix}${entry.message}`, level: entry.level };
            }

            onLinesChange((prev) => [...prev, line]);
          } catch {
            // ignore malformed lines
          }
        }
      }
    } catch (error) {
      onLinesChange((prev) => [
        ...prev,
        { text: `[ERROR] ${(error as Error).message}`, level: "error" },
      ]);
    } finally {
      setRunning(false);
      onRunningChange(false);
    }
  }, [onLinesChange, onRunningChange, running, workflowDefinition?.claude_session]);

  const handleModalSave = useCallback(
    async (id: string, title: string, prompt: string, skipPermission: boolean) => {
      if (isModalSaving) return;

      setIsModalSaving(true);
      setModalError(null);

      // Build definition with updated data applied inline
      const currentNodes = nodesRef.current.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, title, prompt, skipPermission } } : node,
      );

      const sorted = [...currentNodes].sort((a, b) => a.position.x - b.position.x);

      if (!selectedFile) {
        // No file selected — update node state only, close modal
        setNodesRef.current((nds) =>
          nds.map((node) =>
            node.id === id
              ? { ...node, data: { ...node.data, title, prompt, skipPermission } }
              : node,
          ),
        );
        setEditingStepId(null);
        setIsModalSaving(false);
        return;
      }

      const definition: WorkflowDefinition = {
        name: selectedFile.replace(/\.ya?ml$/, ""),
        workflow: sorted.map((node) => {
          const d = node.data as StepNodeData;
          return {
            name: d.title || "Claude Step",
            agent: "claude",
            prompt: d.prompt || "",
            skip_permission: d.skipPermission ?? false,
          };
        }),
      };
      const claudeSessionMode = resolveClaudeSessionMode(
        definition.workflow,
        workflowDefinition?.claude_session,
      );
      if (claudeSessionMode) definition.claude_session = claudeSessionMode;

      try {
        const res = await fetch("/api/workflow/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: selectedFile, content: yamlDump(definition) }),
        });

        if (res.ok) {
          // Persist node state update only after successful save
          setNodesRef.current((nds) =>
            nds.map((node) =>
              node.id === id
                ? { ...node, data: { ...node.data, title, prompt, skipPermission } }
                : node,
            ),
          );
          setEditingStepId(null);
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
          onSave?.(selectedFile, yamlDump(definition));
        } else {
          setModalError("Failed to save workflow. Please try again.");
        }
      } catch {
        setModalError("Network error. Please try again.");
      } finally {
        setIsModalSaving(false);
      }
    },
    [isModalSaving, selectedFile, onSave, workflowDefinition?.claude_session],
  );

  const editingNode = editingStepId ? nodes.find((n) => n.id === editingStepId) : null;

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 shadow-md shadow-black/8 backdrop-blur">
        <ToolbarButton
          onClick={addNode}
          disabled={running}
          className="bg-pink hover:bg-pink/90 disabled:bg-disabled disabled:text-muted-fg"
        >
          + Claude Agent
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border" />

        <ToolbarButton
          onClick={runWorkflow}
          disabled={running || nodes.length === 0}
          className="bg-pink hover:bg-pink/90 disabled:bg-disabled disabled:text-muted-fg"
        >
          {running ? (
            <>
              <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-white/80" />
              Running...
            </>
          ) : (
            <>
              <Play size={11} className="mr-1" />
              Run
            </>
          )}
        </ToolbarButton>

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
                <Check size={11} className="mr-0.5" />
                Saved
              </>
            ) : (
              <>
                <AlertCircle size={11} className="mr-0.5" />
                Error
              </>
            )}
          </span>
        )}
      </div>

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-placeholder">
          <Clock size={64} strokeWidth={1} />
          <div className="text-sm tracking-wide">
            Add a step above to start building your workflow
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4, maxZoom: 1 }}
        minZoom={0.3}
        style={{ background: "var(--color-canvas)" }}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: "var(--color-pink)", strokeWidth: 2 },
        }}
      >
        <Background
          color="var(--color-border)"
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1.5}
        />
        <Controls
          showInteractive={false}
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
          }}
        />
      </ReactFlow>

      {editingNode && (
        <StepEditModal
          stepId={editingStepId!}
          initialTitle={(editingNode.data as StepNodeData).title}
          initialPrompt={(editingNode.data as StepNodeData).prompt}
          initialSkipPermission={(editingNode.data as StepNodeData).skipPermission}
          saving={isModalSaving}
          error={modalError}
          onSave={(id, title, prompt, skipPermission) =>
            void handleModalSave(id, title, prompt, skipPermission)
          }
          onClose={() => {
            setEditingStepId(null);
            setModalError(null);
          }}
        />
      )}
    </div>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  className,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex cursor-pointer items-center rounded-md px-3 py-1.5 text-xs font-semibold text-white transition disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
