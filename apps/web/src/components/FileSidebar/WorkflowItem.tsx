import { SessionItem } from "./SessionItem";
import type { SessionSummary } from "./types";

interface WorkflowItemProps {
  filename: string;
  isSelected: boolean;
  isExpanded: boolean;
  isRunning: boolean;
  sessions: SessionSummary[];
  isLoadingSessions: boolean;
  loadingSessionDetail: string | null;
  deletingSession: string | null;
  onWorkflowClick: () => void;
  onSessionClick: (sessionId: string) => void;
  onDeleteSession: (e: React.MouseEvent, sessionId: string) => void;
}

export function WorkflowItem({
  filename,
  isSelected,
  isExpanded,
  isRunning,
  sessions,
  isLoadingSessions,
  loadingSessionDetail,
  deletingSession,
  onWorkflowClick,
  onSessionClick,
  onDeleteSession,
}: WorkflowItemProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onWorkflowClick}
        className={`flex w-full items-center gap-1.5 border-l-2 px-2 py-2 text-left text-xs transition ${
          isSelected
            ? "border-pink bg-pink-subtle text-dark"
            : "border-transparent text-secondary hover:bg-surface hover:text-dark"
        }`}
      >
        {/* Expand arrow */}
        <span
          className={`shrink-0 text-[10px] transition-transform duration-150 text-muted-fg ${isExpanded ? "rotate-90" : ""}`}
        >
          ▶
        </span>

        <span className="min-w-0 flex-1 truncate">{filename}</span>

        {/* Running indicator */}
        {isRunning && <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-pink animate-pulse" />}

        {/* Session count badge */}
        {sessions.length > 0 && (
          <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-muted-fg">
            {sessions.length}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="border-l border-border ml-4">
          {isLoadingSessions ? (
            <div className="px-3 py-2 text-[10px] text-muted-fg">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="px-3 py-2 text-[10px] text-muted-fg">No sessions</div>
          ) : (
            sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                workflowFile={filename}
                isLoading={loadingSessionDetail === session.id}
                isDeleting={deletingSession === session.id}
                onClick={() => onSessionClick(session.id)}
                onDelete={(e) => onDeleteSession(e, session.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
