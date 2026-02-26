// Connector event logger — emits structured events to console (and future sinks).
// Events: connector_oauth_start | connector_oauth_callback | connector_context |
//         connector_test_start | connector_test_done | connector_error

export type ConnectorEventType =
  | "connector_oauth_start"
  | "connector_oauth_callback"
  | "connector_context"
  | "connector_test_start"
  | "connector_test_done"
  | "connector_error";

export interface ConnectorEvent {
  event: ConnectorEventType;
  provider: "slack" | "jira";
  timestamp: number;
  connectionId?: string;
  step?: string;
  result?: "success" | "failed";
  errorType?: "OAUTH_ERROR" | "AUTH_ERROR" | "CONFIG_ERROR" | "RUNTIME_ERROR";
  message?: string;
}

export function logConnectorEvent(
  event: Omit<ConnectorEvent, "timestamp" | "provider"> & { provider?: "slack" | "jira" },
): void {
  const entry: ConnectorEvent = {
    provider: "slack",
    timestamp: Date.now(),
    ...event,
  };
  // Omit any sensitive fields before logging — this object should never carry tokens
  console.log(`[connector] ${JSON.stringify(entry)}`);
}
