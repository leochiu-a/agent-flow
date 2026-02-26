"use client";

import { Bot, Pencil, X } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface StepNodeData {
  title: string;
  type: "claude";
  prompt: string;
  skipPermission?: boolean;
  onRequestEdit: (id: string) => void;
  onDelete: (id: string) => void;
  [key: string]: unknown;
}

export function StepNode({ id, data, selected }: NodeProps) {
  const d = data as StepNodeData;
  const tone = {
    card: "bg-white border-pink/40",
    focus: "border-pink shadow-[0_0_0_1px_rgba(234,75,113,0.6),0_0_24px_rgba(234,75,113,0.15)]",
    badge: "bg-pink/10 text-pink border border-pink/30",
    editHover: "hover:text-pink",
  };

  const rawPreview = d.prompt.replace(/\n/g, " ").trim();
  const preview = rawPreview.length > 80 ? `${rawPreview.slice(0, 80)}…` : rawPreview;

  return (
    <div
      className={`w-[280px] rounded-xl border-2 p-3.5 shadow-md shadow-black/8 transition ${tone.card} ${selected ? tone.focus : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: "#FFFFFF",
          border: "2px solid var(--color-placeholder)",
          width: 12,
          height: 12,
        }}
      />

      {/* Header: type badge + action buttons */}
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.badge}`}
        >
          <Bot size={10} />
          Claude
        </span>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => d.onRequestEdit(id)}
            className={`nodrag cursor-pointer rounded-md p-1 text-muted-fg transition hover:bg-black/5 ${tone.editHover}`}
            title="Edit step"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => d.onDelete(id)}
            className="nodrag cursor-pointer rounded-md p-1 text-muted-fg transition hover:bg-black/5 hover:text-pink"
            title="Delete step"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-1.5 truncate text-sm font-semibold text-dark">
        {d.title || <span className="text-placeholder">Untitled step</span>}
      </div>

      {/* Prompt preview */}
      {preview ? (
        <div className="break-all font-mono text-[11px] leading-relaxed text-muted-fg">
          {preview}
        </div>
      ) : (
        <div className="font-mono text-[11px] italic text-placeholder">
          No prompt yet — click the edit button
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: "#FFFFFF",
          border: "2px solid var(--color-placeholder)",
          width: 12,
          height: 12,
        }}
      />
    </div>
  );
}
