import type { MouseEvent } from "react";
import { Trash2 } from "lucide-react";

interface WorkflowItemProps {
  filename: string;
  isSelected: boolean;
  onWorkflowClick: () => void;
  isDeleting?: boolean;
  onDelete: (e: MouseEvent) => void;
}

export function WorkflowItem({
  filename,
  isSelected,
  onWorkflowClick,
  isDeleting,
  onDelete,
}: WorkflowItemProps) {
  return (
    <div
      className={`group flex w-full items-center gap-1.5 border-l-2 px-2 py-2 text-left text-xs transition ${
        isSelected
          ? "border-pink bg-pink-subtle text-dark"
          : "border-transparent text-ink hover:bg-surface hover:text-dark"
      }`}
    >
      <button type="button" onClick={onWorkflowClick} className="min-w-0 flex-1" title={filename}>
        <span className="block truncate text-left">{filename}</span>
      </button>

      <button
        type="button"
        title={`Delete workflow ${filename}`}
        aria-label={`Delete workflow ${filename}`}
        disabled={isDeleting}
        onClick={onDelete}
        className="shrink-0 rounded p-0.5 text-muted-fg opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
