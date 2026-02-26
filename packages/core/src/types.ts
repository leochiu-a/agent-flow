export interface WorkflowStep {
  name: string;
  agent: "claude";
  prompt: string;
  skip_permission?: boolean;
}

export type ClaudeSessionMode = "isolated" | "shared";

export interface WorkflowDefinition {
  name: string;
  claude_session?: ClaudeSessionMode;
  workflow: WorkflowStep[];
}

export type LogLevel = "info" | "error" | "stdout" | "stderr" | "tool_use" | "tool_result";

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
