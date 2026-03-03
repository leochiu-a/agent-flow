import { useState, type MouseEvent } from "react";
import { Trash2 } from "lucide-react";
import { formatTime, formatDuration } from "../../utils/time";
import type { SessionSummary } from "./types";
import { IconButton } from "@/components/ui/icon-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SessionItemProps {
  session: SessionSummary;
  workflowFile: string;
  workflowLabel?: string;
  isLoading: boolean;
  isActive: boolean;
  isDeleting: boolean;
  readOnly?: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export function SessionItem({
  session,
  workflowLabel,
  isLoading,
  isActive,
  isDeleting,
  readOnly,
  onClick,
  onDelete,
}: SessionItemProps) {
  const [open, setOpen] = useState(false);

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
        {workflowLabel && (
          <div className="truncate text-[9px] font-medium uppercase tracking-wide text-pink">
            [{workflowLabel}]
          </div>
        )}
        <div className="truncate text-[10px] text-ink">{formatTime(session.startedAt)}</div>
        <div className="text-[9px] text-muted-fg">{formatDuration(session.durationMs)}</div>
      </div>

      {/* Delete button with AlertDialog */}
      {!readOnly && (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <IconButton
              icon={<Trash2 size={12} />}
              title="Delete session"
              disabled={isDeleting}
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
              }}
              className="shrink-0 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
            />
          </AlertDialogTrigger>
          <AlertDialogContent size="sm" onClick={(e: MouseEvent) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this session?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Are you sure you want to delete this session record?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  onDelete();
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
