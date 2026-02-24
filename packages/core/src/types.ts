export interface WorkflowStep {
  name: string;
  run?: string;
  agent?: "claude";
  prompt?: string;
  skip_permission?: boolean;
}

export interface WorkflowDefinition {
  name: string;
  workflow: WorkflowStep[];
}

export type LogLevel = "info" | "error" | "stdout" | "stderr";

export interface LogEntry {
  level: LogLevel;
  message: string;
  step?: string;
  timestamp: number;
}

export interface StepResult {
  name: string;
  success: boolean;
  exitCode: number | null;
}

export interface WorkflowResult {
  success: boolean;
  steps: StepResult[];
}
