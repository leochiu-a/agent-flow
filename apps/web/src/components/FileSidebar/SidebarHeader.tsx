interface SidebarHeaderProps {
  onCreateClick: () => void;
}

export function SidebarHeader({ onCreateClick }: SidebarHeaderProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
      <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-fg">
        AI Workflows
      </span>

      <button
        type="button"
        onClick={onCreateClick}
        title="New Workflow"
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-border text-sm leading-none text-pink transition hover:border-pink hover:bg-pink hover:text-white"
      >
        +
      </button>
    </div>
  );
}
