# Agent Flow

A local AI workflow engine — run YAML-defined workflows that mix shell commands and Claude AI agents.

## Monorepo Structure

```
agent-flow/
├── packages/
│   ├── core/          # @agent-flow/core — WorkflowRunner engine
│   └── cli/           # @agent-flow/cli  — `agent-flow run <file>` CLI
├── apps/
│   └── web/           # @agent-flow/web  — Next.js web console
└── .ai-workflows/     # Sample workflow YAML files
```

## Quick Start

```bash
pnpm install

# Build all packages
pnpm build

# Start the web console
pnpm dev

# Run a workflow from the CLI
pnpm --filter @agent-flow/cli build
node packages/cli/dist/index.js run .ai-workflows/test-workflow.yaml
```

## Workflow YAML Format

```yaml
name: "My Workflow"
workflow:
  - name: "Shell step"
    run: "echo 'Hello World'"

  - name: "Claude AI step"
    agent: claude
    prompt: "Summarise the last git commit in one sentence"
    skip_permission: true   # passes --yes to claude CLI
```

## Packages

### `@agent-flow/core`

Pure Node.js engine. Reads YAML, spawns processes, emits `log` and `done` events via `EventEmitter`.

```ts
import { WorkflowRunner } from "@agent-flow/core";

const runner = new WorkflowRunner();
runner.on("log", (entry) => console.log(entry.message));
const result = await runner.runFile("./workflow.yaml");
```

### `@agent-flow/cli`

```bash
agent-flow run <file>   # exits 0 on success, 1 on failure
```

### `@agent-flow/web`

Next.js 15 App Router console.
- **Sidebar**: lists workflows from `.ai-workflows/`
- **Terminal**: streams real-time logs via `ReadableStream` API route

## Development

```bash
# Watch mode for core + cli
pnpm --filter @agent-flow/core dev
pnpm --filter @agent-flow/cli dev

# Web dev server
pnpm dev
```

## Requirements

- Node.js >= 20
- pnpm >= 10
- `claude` CLI installed and authenticated (for AI steps)
