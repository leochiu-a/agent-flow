"use client";

import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { StepNode } from "./StepNode";
import type { StepNodeData } from "./StepNode";
import type { LogEntry } from "@agent-flow/core";

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

  // Stable ref so onUpdate/onDelete never change reference
  const setNodesRef = useRef(setNodes);
  setNodesRef.current = setNodes;
  const setEdgesRef = useRef(setEdges);
  setEdgesRef.current = setEdges;

  const onUpdate = useCallback(
    (id: string, updates: Partial<Pick<StepNodeData, "title" | "type" | "prompt">>) => {
      setNodesRef.current((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [],
  );

  const onDelete = useCallback((id: string) => {
    setNodesRef.current((nds) => nds.filter((n) => n.id !== id));
    setEdgesRef.current((eds) => eds.filter((e) => e.source !== id && e.target !== id));
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
    [setNodes, onUpdate, onDelete],
  );

  const onConnect = useCallback(
    (conn: Connection) =>
      setEdges((eds) =>
        addEdge({ ...conn, animated: true, style: { stroke: "#334155", strokeWidth: 2 } }, eds),
      ),
    [setEdges],
  );

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const runWorkflow = useCallback(async () => {
    const currentNodes = nodesRef.current;
    if (running || currentNodes.length === 0) return;

    setRunning(true);
    onRunningChange(true);
    onLinesChange(() => []);

    const sorted = [...currentNodes].sort((a, b) => a.position.x - b.position.x);
    const definition = {
      name: "Canvas Workflow",
      workflow: sorted.map((n) => {
        const d = n.data as StepNodeData;
        if (d.type === "claude") {
          return {
            name: d.title || "Claude Step",
            agent: "claude",
            prompt: d.prompt || "",
            skip_permission: true,
          };
        }
        return { name: d.title || "Shell Step", run: d.prompt || "" };
      }),
    };

    try {
      const res = await fetch("/api/workflow/run-definition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ definition }),
      });

      if (!res.body) return;

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;
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
              const tp = entry.level === "tool_use" ? "⚙ " : "";
              line = { text: `${prefix}${tp}${entry.message}`, level: entry.level };
            }

            onLinesChange((prev) => [...prev, line]);
          } catch {
            // ignore malformed lines
          }
        }
      }
    } catch (err) {
      onLinesChange((prev) => [
        ...prev,
        { text: `[ERROR] ${(err as Error).message}`, level: "error" },
      ]);
    } finally {
      setRunning(false);
      onRunningChange(false);
    }
  }, [running, onLinesChange, onRunningChange]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Toolbar */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          display: "flex",
          gap: 8,
          background: "rgba(9, 9, 11, 0.9)",
          backdropFilter: "blur(12px)",
          border: "1px solid #1e293b",
          borderRadius: 10,
          padding: "8px 12px",
          boxShadow: "0 4px 24px #00000088",
        }}
      >
        <ToolbarButton
          onClick={() => addNode("claude")}
          bg="#1d4ed8"
          hoverBg="#2563eb"
          disabled={running}
        >
          + Claude Agent
        </ToolbarButton>
        <ToolbarButton
          onClick={() => addNode("shell")}
          bg="#15803d"
          hoverBg="#16a34a"
          disabled={running}
        >
          + Shell Step
        </ToolbarButton>
        <div style={{ width: 1, background: "#1e293b", margin: "0 4px" }} />
        <ToolbarButton
          onClick={runWorkflow}
          bg="#b45309"
          hoverBg="#d97706"
          disabled={running || nodes.length === 0}
        >
          {running ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#fbbf24",
                  marginRight: 6,
                  animation: "pulse 1s infinite",
                }}
              />
              Running...
            </>
          ) : (
            "▶ Run"
          )}
        </ToolbarButton>
      </div>

      {/* Empty state hint */}
      {nodes.length === 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 12,
            color: "#1e293b",
            pointerEvents: "none",
          }}
        >
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
          <div style={{ fontSize: 15, letterSpacing: 0.3 }}>
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
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 8,
          }}
          showInteractive={false}
        />
      </ReactFlow>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .react-flow__controls-button {
          background: #0f172a !important;
          border-color: #1e293b !important;
          color: #94a3b8 !important;
          fill: #94a3b8 !important;
        }
        .react-flow__controls-button:hover {
          background: #1e293b !important;
        }
      `}</style>
    </div>
  );
}

function ToolbarButton({
  onClick,
  bg,
  hoverBg,
  disabled = false,
  children,
}: {
  onClick: () => void;
  bg: string;
  hoverBg: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: disabled ? "#111827" : hovered ? hoverBg : bg,
        color: disabled ? "#4b5563" : "#fff",
        border: "none",
        padding: "6px 14px",
        borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 12,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        transition: "background 0.15s",
      }}
    >
      {children}
    </button>
  );
}
