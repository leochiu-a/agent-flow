import type { ConnectorStatus } from "../_hooks/useConnectors";

const statusStyles: Record<ConnectorStatus, string> = {
  connected: "bg-pink/10 text-pink border border-pink/30",
  disconnected: "bg-disabled text-ink border border-border",
  error: "bg-orange/10 text-orange border border-orange/30",
  connecting: "bg-disabled text-ink border border-border",
};

export function StatusBadge({ status }: { status: ConnectorStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
