import { Plus } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";

interface SidebarHeaderProps {
  onCreateClick: () => void;
  title?: string;
}

export function SidebarHeader({ onCreateClick, title = "AI Workflows" }: SidebarHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-fg">
        {title}
      </span>

      <IconButton
        icon={<Plus size={12} />}
        variant="border"
        onClick={onCreateClick}
        title="New Workflow"
        className="text-sm leading-none"
        aria-label="New Workflow"
      />
    </div>
  );
}
