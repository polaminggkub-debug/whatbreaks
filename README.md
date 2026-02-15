# WhatBreaks

**AI-Powered Codebase Intelligence Map**

> When a test fails, see the blast radius in 2 seconds. No reading the entire repo.
> When you refactor a file, know exactly what breaks before you touch it.

## Install

```bash
npm install -g whatbreaks

# Or run without installing:
npx whatbreaks scan ./src
```

## Quick Start

```bash
# 1. Scan your codebase
whatbreaks scan ./src

# 2. Open interactive visualization
whatbreaks serve

# 3. Analyze a failing test
whatbreaks failing tests/e2e/payroll-upload.spec.ts

# 4. Check blast radius before refactoring
whatbreaks refactor src/shared/lib/payroll/excelParser.ts
```

## Two Core Modes

### Test Failure Mode ("What broke?")

```bash
whatbreaks failing <test-file>
whatbreaks failing <test-file> --json    # For AI tools
```

Traces from the failing test through its import chain to find the most likely root cause (deepest dependency).

### Refactor Mode ("What will break?")

```bash
whatbreaks refactor <file>
whatbreaks refactor <file> --json        # For AI tools
whatbreaks refactor <file> --tests-only  # Just show tests to run
```

Shows every file and test affected by changing this file, plus the exact test command to run.

## AI Tool Integration

Works with any AI coding tool that can run shell commands:

```bash
# AI runs this before making changes:
whatbreaks refactor src/shared/lib/payroll/excelParser.ts --json
```

Returns structured JSON for Claude Code, ChatGPT Codex, Cursor, Windsurf, Aider, etc.

## All Commands

```bash
whatbreaks scan <dir>              # Scan codebase, generate graph
whatbreaks serve [--port 4567]     # Interactive web UI
whatbreaks failing <test-file>     # Test failure root cause
whatbreaks refactor <file>         # Blast radius + affected tests
whatbreaks impact <file>           # Forward + backward impact
whatbreaks report                  # Full health report
whatbreaks hotspots [--top 10]     # Highest blast-radius files
whatbreaks circular                # Circular dependency detection
whatbreaks chains [--top 5]        # Deepest dependency chains
```

All commands support `--json` for machine consumption.

## Tech Stack

- **Scanner:** ts-morph (AST-based, handles TypeScript + Vue SFC)
- **Graph UI:** Vue 3 + Cytoscape.js (dagre layout, dark theme)
- **CLI:** Commander.js + chalk + ora

No backend. No database. No server (except static file server for UI).

## License

MIT
