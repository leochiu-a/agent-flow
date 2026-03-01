interface WorkflowItemProps {
  filename: string;
  isSelected: boolean;
  onWorkflowClick: () => void;
}

export function WorkflowItem({ filename, isSelected, onWorkflowClick }: WorkflowItemProps) {
  return (
    <button
      type="button"
      onClick={onWorkflowClick}
      className={`flex w-full items-center gap-1.5 border-l-2 px-2 py-2 text-left text-xs transition ${
        isSelected
          ? "border-pink bg-pink-subtle text-dark"
          : "border-transparent text-ink hover:bg-surface hover:text-dark"
      }`}
      title={filename}
    >
      <span className="min-w-0 flex-1 truncate">{filename}</span>
    </button>
  );
}
