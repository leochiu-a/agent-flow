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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-3 w-3"
        >
          <path
            fillRule="evenodd"
            d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.712Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
