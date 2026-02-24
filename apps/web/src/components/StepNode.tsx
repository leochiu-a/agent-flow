"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface StepNodeData {
  title: string;
  type: "claude" | "shell";
  prompt: string;
  onUpdate: (id: string, updates: Partial<Pick<StepNodeData, "title" | "type" | "prompt">>) => void;
  onDelete: (id: string) => void;
  [key: string]: unknown;
}

export function StepNode({ id, data, selected }: NodeProps) {
  const d = data as StepNodeData;
  const isAgent = d.type === "claude";

  const tone = isAgent
    ? {
        card: "bg-blue-950/50 border-blue-500/60",
        focus:
          "border-cyan-300 shadow-[0_0_0_1px_rgba(103,232,249,0.9),0_0_24px_rgba(56,189,248,0.25)]",
        select: "border-cyan-400/70 text-cyan-200",
        textarea: "focus:border-cyan-400 text-slate-300",
      }
    : {
        card: "bg-emerald-950/30 border-emerald-500/60",
        focus:
          "border-emerald-300 shadow-[0_0_0_1px_rgba(110,231,183,0.9),0_0_24px_rgba(16,185,129,0.2)]",
        select: "border-emerald-400/70 text-emerald-200",
        textarea: "focus:border-emerald-400 text-slate-300",
      };

  return (
    <div
      className={`w-[280px] rounded-xl border-2 p-3.5 transition ${tone.card} ${selected ? tone.focus : "shadow-lg shadow-black/40"}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: "#1e293b",
          border: "2px solid #475569",
          width: 12,
          height: 12,
        }}
      />

      <div className="mb-2.5 flex items-center gap-2">
        <select
          value={d.type}
          onChange={(event) => d.onUpdate(id, { type: event.target.value as "claude" | "shell" })}
          className={`nodrag flex-1 rounded border bg-slate-950/70 px-2 py-1 text-[11px] outline-none transition ${tone.select}`}
        >
          <option value="claude">⚙ Claude Agent</option>
          <option value="shell">$ Shell Command</option>
        </select>

        <button
          type="button"
          onClick={() => d.onDelete(id)}
          className="nodrag rounded px-1 text-base leading-none text-slate-500 transition hover:text-rose-400"
          title="Delete step"
        >
          ✕
        </button>
      </div>

      <input
        value={d.title}
        onChange={(event) => d.onUpdate(id, { title: event.target.value })}
        placeholder="Step title..."
        className="nodrag mb-2.5 w-full border-0 border-b border-slate-700 bg-transparent px-0 py-1 text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
      />

      <textarea
        value={d.prompt}
        onChange={(event) => d.onUpdate(id, { prompt: event.target.value })}
        placeholder={isAgent ? "Enter prompt for Claude..." : "Enter shell command..."}
        className={`nodrag nopan w-full resize-y rounded-md border bg-slate-950/80 p-2 font-mono text-[11px] leading-relaxed outline-none transition ${tone.textarea}`}
        rows={4}
      />

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: "#1e293b",
          border: "2px solid #475569",
          width: 12,
          height: 12,
        }}
      />
    </div>
  );
}
