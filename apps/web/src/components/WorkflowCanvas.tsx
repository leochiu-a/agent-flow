"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
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
import type { LogEntry } from "@agent-flow/core";
import { StepNode } from "./StepNode";
import type { StepNodeData } from "./StepNode";

export interface LogLine {
  text: string;
  level: string;
}

interface WorkflowCanvasProps {
  onLinesChange: (updater: (prev: LogLine[]) => LogLine[]) => void;
  onRunningChange: (running: boolean) => void;
}

const nodeTypes = { step: StepNode };

const newId = () => `step-${crypto.randomUUID().slice(0, 8)}`;

export function WorkflowCanvas({ onLinesChange, onRunningChange }: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [running, setRunning] = useState(false);

  const setNodesRef = useRef(setNodes);
  setNodesRef.current = setNodes;
  const setEdgesRef = useRef(setEdges);
  setEdgesRef.current = setEdges;

  const onUpdate = useCallback(
    (id: string, updates: Partial<Pick<StepNodeData, "title" | "type" | "prompt">>) => {
      setNodesRef.current((nds) =>
        nds.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...updates } } : node,
        ),
      );
    },
    [],
  );

  const onDelete = useCallback((id: string) => {
    setNodesRef.current((nds) => nds.filter((node) => node.id !== id));
    setEdgesRef.current((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  }, []);

  const addNode = useCallback(
    (type: "claude" | "shell") => {
      const id = newId();

      setNodes((nds) => {
        const lastNode = nds[nds.length - 1];
        const x = lastNode ? lastNode.position.x + 340 : 60;
        const y = lastNode ? lastNode.position.y : 120;

        const newNode: Node = {
          id,
          type: "step",
          position: { x, y },
          data: {
            title: type === "claude" ? "Claude Step" : "Shell Step",
            type,
            prompt: "",
            onUpdate,
            onDelete,
          },
        };

        if (lastNode) {
          setEdgesRef.current((eds) => [
            ...eds,
            {
              id: `e-${lastNode.id}-${id}`,
              source: lastNode.id,
              target: id,
              animated: true,
              style: { stroke: "#334155", strokeWidth: 2 },
            },
          ]);
        }

        return [...nds, newNode];
      });
    },
    [onDelete, onUpdate, setNodes],
  );

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...connection, animated: true, style: { stroke: "#334155", strokeWidth: 2 } },
          eds,
        ),
      ),
    [setEdges],
  );

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const runWorkflow = useCallback(async () => {
    const currentNodes = nodesRef.current;
    if (running || currentNodes.length === 0) {
      return;
    }

    setRunning(true);
    onRunningChange(true);
    onLinesChange(() => []);

    const sorted = [...currentNodes].sort((a, b) => a.position.x - b.position.x);
    const definition = {
      name: "Canvas Workflow",
      workflow: sorted.map((node) => {
        const d = node.data as StepNodeData;

        if (d.type === "claude") {
          return {
            name: d.title || "Claude Step",
            agent: "claude",
            prompt: d.prompt || "",
            skip_permission: true,
          };
        }

        return {
          name: d.title || "Shell Step",
          run: d.prompt || "",
        };
      }),
    };

    try {
      const res = await fetch("/api/workflow/run-definition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ definition }),
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
  }, [onLinesChange, onRunningChange, running]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/85 px-3 py-2 shadow-2xl shadow-black/40 backdrop-blur">
        <ToolbarButton
          onClick={() => addNode("claude")}
          disabled={running}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
        >
          + Claude Agent
        </ToolbarButton>

        <ToolbarButton
          onClick={() => addNode("shell")}
          disabled={running}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500"
        >
          + Shell Step
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-slate-700" />

        <ToolbarButton
          onClick={runWorkflow}
          disabled={running || nodes.length === 0}
          className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500"
        >
          {running ? (
            <>
              <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-200" />
              Running...
            </>
          ) : (
            "▶ Run"
          )}
        </ToolbarButton>
      </div>

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-700">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 3" />
          </svg>
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
        style={{ background: "#020617" }}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: "#334155", strokeWidth: 2 },
        }}
      >
        <Background color="#0f172a" variant={BackgroundVariant.Dots} gap={28} size={1.5} />
        <Controls
          showInteractive={false}
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 8,
          }}
        />
      </ReactFlow>
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
      className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold text-white transition disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
