import { Trash2 } from "lucide-react";
import { formatTime, formatDuration } from "../../utils/time";
import type { SessionSummary } from "./types";

interface SessionItemProps {
  session: SessionSummary;
  workflowFile: string;
  isLoading: boolean;
  isActive: boolean;
  isDeleting: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export function SessionItem({
  session,
  isLoading,
  isActive,
  isDeleting,
  onClick,
  onDelete,
}: SessionItemProps) {
  return (
    <div
      role="button"
      tabIndex={isLoading ? -1 : 0}
      onClick={isLoading ? undefined : onClick}
      onKeyDown={(e) => {
        if (!isLoading && (e.key === "Enter" || e.key === " ")) onClick();
      }}
      className={`group flex w-full items-start gap-1.5 px-3 py-1.5 text-left transition hover:bg-surface ${isActive ? "bg-pink-subtle" : ""} ${isLoading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
    >
      {/* Status dot */}
      <span
        className={`mt-0.5 shrink-0 h-1.5 w-1.5 rounded-full ${session.success ? "bg-emerald-500" : "bg-red-500"}`}
      />

      <div className="min-w-0 flex-1">
        <div className="truncate text-[10px] text-secondary">{formatTime(session.startedAt)}</div>
        <div className="text-[9px] text-muted-fg">{formatDuration(session.durationMs)}</div>
      </div>

      {/* Delete button */}
      <button
        type="button"
        title="Delete session"
        disabled={isDeleting}
        onClick={onDelete}
        className="shrink-0 opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-fg transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
