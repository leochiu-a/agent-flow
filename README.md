# Vite TypeScript Boilerplate

A production-ready Vite + TypeScript boilerplate with code quality automation and release workflow built in.

## What's Included

- **Vite + TypeScript**: Frontend development and build foundation.
- **Husky + lint-staged**: Runs checks on staged files at `pre-commit`.
- **oxlint**: Fast linting with optional auto-fix.
- **oxfmt**: Unified formatter (used instead of Prettier).
- **Changesets**: Versioning and release note workflow.
- **GitHub Actions**:
  - `lint.yml`: Runs lint, format check, and type-check on PRs and pushes to `main`.
  - `changeset-check.yml`: Ensures PRs include a changeset file.
  - `release.yml`: Manual release trigger (`workflow_dispatch`).

## Quick Start

```bash
pnpm install
pnpm dev
```

## Common Commands

```bash
# Development
pnpm dev

# Build
pnpm build

# Type checking
pnpm type-check

# Lint
pnpm lint
pnpm lint:fix

# Formatting
pnpm format
pnpm format:check

# Changeset
pnpm changeset
pnpm version
pnpm release
```

## Commit / PR Workflow

1. Make your changes and stage files with `git add`.
2. On `git commit`, `lint-staged` runs automatically (`oxlint --fix` + `oxfmt --write`).
3. Before opening a PR with user-facing changes, run `pnpm changeset`.
4. CI validates lint, formatting, type-checking, and changeset requirements on `main`.

## Recommended Runtime

- Node.js `>=20`
- pnpm `>=10`
