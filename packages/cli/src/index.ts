#!/usr/bin/env node
import { Command } from "commander";
import { WorkflowRunner } from "@agent-flow/core";
import type { LogEntry } from "@agent-flow/core";

const program = new Command();

program.name("agent-flow").description("Local AI workflow engine").version("0.0.0");

program
  .command("run <file>")
  .description("Run a workflow YAML file")
  .action(async (file: string) => {
    const runner = new WorkflowRunner();

    runner.on("log", (entry: LogEntry) => {
      const prefix = entry.step ? `[${entry.step}] ` : "";
      const line = `${prefix}${entry.message}`;
      const out = line.endsWith("\n") ? line : line + "\n";
      if (entry.level === "error" || entry.level === "stderr") {
        process.stderr.write(out);
      } else {
        process.stdout.write(out);
      }
    });

    try {
      const result = await runner.runFile(file);
      process.exit(result.success ? 0 : 1);
    } catch (err) {
      process.stderr.write(`Fatal error: ${(err as Error).message}\n`);
      process.exit(1);
    }
  });

program.parse();
