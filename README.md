# Agent Flow

A local AI workflow engine — run YAML-defined workflows with Claude AI agents.

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

# Start the web console (no build needed)
pnpm dev

# Build CLI, then run a workflow
pnpm --filter @agent-flow/cli build
pnpm exec agent-flow run .ai-workflows/test-workflow.yaml
```

## Workflow YAML Format

```yaml
name: "My Workflow"
claude_session: "shared"  # optional: share one Claude Code session across Claude steps
workflow:
  - name: "Claude AI step"
    agent: claude
    prompt: "Run `echo Hello World`, then summarize the latest git commit."
    skip_permission: true   # passes --dangerously-skip-permissions to claude CLI
```

`claude_session` modes:
- `isolated` (default): each Claude step starts a fresh session
- `shared`: later Claude steps reuse the previous Claude step session via `claude --resume <session_id>`

## Packages

### `@agent-flow/core`

Pure Node.js engine. Reads YAML, runs Claude CLI, emits `log` and `done` events via `EventEmitter`.

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

Optional environment variable:
- `AGENT_FLOW_ALLOWED_DIRS` (comma-separated absolute paths): restricts which directories can be browsed/used as workflow working directories in the web UI. Defaults to `$HOME` and `process.cwd()`.

## Acknowledgements

This project uses [React Flow](https://reactflow.dev/) — a highly customizable React component for building node-based editors and interactive diagrams, developed by [xyflow](https://xyflow.com/).
