"use client";

import { Eye, Pencil, Power, PowerOff, X } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import SlackIcon from "@/assets/slack.svg";
import ClaudeIcon from "@/assets/claude.svg";
import AtlassianIcon from "@/assets/atlassian.svg";

export interface StepNodeData {
  title: string;
  type: "claude" | "jira" | "slack";
  prompt: string;
  skipPermission?: boolean;
  skill?: string;
  job?: string;
  jiraTicket?: string;
  slackChannel?: string;
  slackMessage?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onRequestEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleDisabled?: (id: string) => void;
  onRequestPreview?: (id: string) => void;
  [key: string]: unknown;
}

const TONE_MAP = {
  jira: {
    card: "bg-white border-jira/40",
    focus: "border-jira shadow-[0_0_0_1px_rgba(38,132,255,0.6),0_0_24px_rgba(38,132,255,0.15)]",
  },
  slack: {
    card: "bg-white border-slack/40",
    focus: "border-slack shadow-[0_0_0_1px_rgba(74,21,75,0.6),0_0_24px_rgba(74,21,75,0.15)]",
  },
  claude: {
    card: "bg-white border-pink/40",
    focus: "border-pink shadow-[0_0_0_1px_rgba(234,75,113,0.6),0_0_24px_rgba(234,75,113,0.15)]",
  },
} as const;

export function StepNode({ id, data, selected }: NodeProps) {
  const d = data as StepNodeData;
  const tone = TONE_MAP[d.type] ?? TONE_MAP.claude;

  const rawPreview = d.prompt.replace(/\n/g, " ").trim();
  const preview = rawPreview.length > 80 ? `${rawPreview.slice(0, 80)}…` : rawPreview;

  return (
    <div
      className={`w-[280px] rounded-xl border-2 p-3.5 shadow-md shadow-black/8 transition ${tone.card} ${selected ? tone.focus : ""} ${d.disabled ? "opacity-40" : ""}`}
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
        {d.type === "jira" ? (
          <Badge variant="jira">
            <AtlassianIcon className="size-3" />
            Jira
          </Badge>
        ) : d.type === "slack" ? (
          <Badge variant="slack">
            <SlackIcon className="size-3" />
            Slack
          </Badge>
        ) : (
          <Badge variant="connected">
            <ClaudeIcon className="size-3" />
            Claude
          </Badge>
        )}

        {d.readOnly && (d.onRequestPreview || d.onToggleDisabled) && (
          <div className="ml-auto flex items-center gap-1">
            {d.onRequestPreview && (
              <IconButton
                icon={<Eye size={14} />}
                className="nodrag text-muted-fg"
                onClick={() => d.onRequestPreview!(id)}
                tooltip="View step"
              />
            )}
            {d.onToggleDisabled && (
              <IconButton
                icon={d.disabled ? <PowerOff size={14} /> : <Power size={14} />}
                className="nodrag text-muted-fg"
                onClick={() => d.onToggleDisabled!(id)}
                tooltip={d.disabled ? "Enable step" : "Disable step"}
              />
            )}
          </div>
        )}

        {!d.readOnly && (
          <div className="ml-auto flex items-center gap-1">
            <IconButton
              icon={<Pencil />}
              className="nodrag"
              onClick={() => d.onRequestEdit(id)}
              title="Edit step"
            />
            <IconButton
              icon={<X />}
              className="nodrag"
              onClick={() => d.onDelete(id)}
              title="Delete step"
            />
          </div>
        )}
      </div>

      {/* Title */}
      <div className="mb-1.5 truncate text-sm font-semibold text-dark">
        {d.title || <span className="text-placeholder">Untitled step</span>}
      </div>

      {/* Ticket info */}
      {d.type === "jira" && d.jiraTicket && (
        <div className="mb-1 text-[11px] text-muted-fg">
          Ticket: <span className="font-medium">{d.jiraTicket}</span>
        </div>
      )}

      {/* Channel info */}
      {d.type === "slack" && d.slackChannel && (
        <div className="mb-1 text-[11px] text-muted-fg">
          Channel: <span className="font-medium">{d.slackChannel}</span>
        </div>
      )}

      {/* Skill badge */}
      {d.skill && (
        <div className="mb-1 text-[11px] text-muted-fg">
          Skill: <span className="font-medium">{d.skill}</span>
        </div>
      )}

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
