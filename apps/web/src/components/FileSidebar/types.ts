export interface SessionSummary {
  id: string;
  workingDirectory?: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  success: boolean;
}

export interface LogEntry {
  level: string;
  message: string;
  step?: string;
  timestamp: number;
}

export interface SessionDetail {
  id: string;
  workflowFile: string;
  workflowName: string;
  workingDirectory?: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  success: boolean;
  logs: LogEntry[];
  result: {
    success: boolean;
    steps: Array<{ name: string; success: boolean; exitCode: number | null }>;
  };
}

export interface SessionSummaryWithWorkflow extends SessionSummary {
  workflowFile: string;
  workflowName: string;
}
