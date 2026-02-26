import { Button } from "@/components/ui/button";

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

      <Button
        variant="icon-border"
        size="icon-xs"
        onClick={onCreateClick}
        title="New Workflow"
        className="text-sm leading-none"
      >
        +
      </Button>
    </div>
  );
}
