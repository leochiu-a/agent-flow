# Agent Flow

A local AI workflow engine — run multi-step AI workflows with Claude.

## What is this?

Agent Flow lets you chain Claude AI tasks together in a workflow. Each step can run a Claude prompt, and steps can share context with each other. Run and monitor workflows through the web console.

## Prerequisites

Before you start, make sure you have:

1. **Node.js >= 22**
2. **pnpm >= 10**
3. **Claude CLI** — installed and authenticated (`claude` command must work in your terminal)

## Quick Started

### Step 1 — Install dependencies

```bash
pnpm install
```

### Step 2 — Start the web console

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The sidebar lists all workflows in `.ai-workflows/`. Click one to run it and watch the logs stream in real time.

### Step 3 — Run a workflow

1. Select a **folder** from the sidebar — this sets the working directory for the workflow
2. Choose a **workflow** under that folder to run
3. Click **Run** and watch the logs stream in real time

You can also create your own workflow: click **New Workflow** in the sidebar, add Claude steps with your own prompts.

## Acknowledgements

This project uses [React Flow](https://reactflow.dev/) — a highly customizable React component for building node-based editors and interactive diagrams, developed by [xyflow](https://xyflow.com/).
