import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WorkflowItemProps {
  filename: string;
  isSelected: boolean;
  onWorkflowClick: () => void;
  isDeleting?: boolean;
  onDelete: () => void;
  onRename: () => void;
}

export function WorkflowItem({
  filename,
  isSelected,
  onWorkflowClick,
  isDeleting,
  onDelete,
  onRename,
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Workflow options for ${filename}`}
            disabled={isDeleting}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 rounded p-0.5 text-muted-fg opacity-0 transition group-hover:opacity-100 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MoreHorizontal size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
