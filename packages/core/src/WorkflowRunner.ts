import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import yaml from "js-yaml";
import type {
  WorkflowDefinition,
  WorkflowStep,
  LogEntry,
  WorkflowResult,
  StepResult,
} from "./types.js";

export class WorkflowRunner extends EventEmitter {
  private aborted = false;

  override emit(event: "log", entry: LogEntry): boolean;
  override emit(event: "done", result: WorkflowResult): boolean;
  override emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  override on(event: "log", listener: (entry: LogEntry) => void): this;
  override on(event: "done", listener: (result: WorkflowResult) => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  private log(level: LogEntry["level"], message: string, step?: string): void {
    this.emit("log", { level, message, step, timestamp: Date.now() });
  }

  async runFile(filePath: string): Promise<WorkflowResult> {
    const raw = await readFile(filePath, "utf8");
    const definition = yaml.load(raw) as WorkflowDefinition;
    return this.run(definition);
  }

  async run(definition: WorkflowDefinition): Promise<WorkflowResult> {
    this.log("info", `Starting workflow: ${definition.name}`);
    const stepResults: StepResult[] = [];

    for (const step of definition.workflow) {
      if (this.aborted) break;
      const result = await this.runStep(step);
      stepResults.push(result);
      if (!result.success) {
        this.log("error", `Step failed: ${step.name}`, step.name);
        break;
      }
    }

    const success = stepResults.every((r) => r.success) && !this.aborted;
    const workflowResult: WorkflowResult = { success, steps: stepResults };
    this.log("info", `Workflow ${success ? "completed" : "failed"}: ${definition.name}`);
    this.emit("done", workflowResult);
    return workflowResult;
  }

  private runStep(step: WorkflowStep): Promise<StepResult> {
    if (step.agent === "claude") return this.runClaudeStep(step);
    if (step.run) return this.runShellStep(step);
    return Promise.resolve({ name: step.name, success: false, exitCode: null });
  }

  private runShellStep(step: WorkflowStep): Promise<StepResult> {
    return new Promise((resolve) => {
      this.log("info", `Running: ${step.run}`, step.name);
      const child = spawn("sh", ["-c", step.run!], { stdio: "pipe" });

      child.stdout.on("data", (chunk: Buffer) => {
        this.log("stdout", chunk.toString(), step.name);
      });
      child.stderr.on("data", (chunk: Buffer) => {
        this.log("stderr", chunk.toString(), step.name);
      });
      child.on("close", (code) => {
        resolve({ name: step.name, success: code === 0, exitCode: code });
      });
      child.on("error", (err) => {
        this.log("error", `Spawn error: ${err.message}`, step.name);
        resolve({ name: step.name, success: false, exitCode: null });
      });
    });
  }

  private runClaudeStep(step: WorkflowStep): Promise<StepResult> {
    return new Promise((resolve) => {
      this.log("info", `Running Claude agent: ${step.name}`, step.name);
      const args: string[] = [];
      if (step.skip_permission) args.push("--dangerously-skip-permissions");
      if (step.prompt) args.push("--print", step.prompt);

      const child = spawn("claude", args, { stdio: "pipe" });

      child.stdout.on("data", (chunk: Buffer) => {
        this.log("stdout", chunk.toString(), step.name);
      });
      child.stderr.on("data", (chunk: Buffer) => {
        this.log("stderr", chunk.toString(), step.name);
      });
      child.on("close", (code) => {
        resolve({ name: step.name, success: code === 0, exitCode: code });
      });
      child.on("error", (err) => {
        this.log("error", `Claude agent error: ${err.message}`, step.name);
        resolve({ name: step.name, success: false, exitCode: null });
      });
    });
  }

  abort(): void {
    this.aborted = true;
  }
}
