import type { ConnectorStatus } from "../_hooks/useConnectors";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: ConnectorStatus }) {
  return <Badge variant={status}>{status}</Badge>;
}
