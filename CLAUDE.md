# WhatBreaks - AI-Powered Codebase Intelligence Map

## What This Project Is

A CLI tool + web UI that scans TypeScript/Vue codebases, builds dependency + test mapping graphs, and provides two core modes:
1. **Test Failure Mode** — test fails -> shows which files to investigate (deepest-first)
2. **Refactor Mode** — pick a file -> shows blast radius + affected tests

Target users: "vibe coders" who build fast with AI tools but need a codebase map.

## Tech Stack

- **Language:** TypeScript (ESM)
- **Scanner:** ts-morph (AST-based import parsing)
- **CLI:** Commander.js + chalk + ora
- **Graph UI:** Vue 3 + Cytoscape.js (dagre layout)
- **Build:** tsup (CLI), Vite (UI)
- **Package:** npm (`npx whatbreaks`)

## Architecture

```
src/
├── cli/          # Commander CLI commands (scan, serve, failing, refactor, impact, report)
├── scanner/      # ts-morph-based repo scanning (files, imports, Vue SFC, tests, layers)
├── engine/       # Impact analysis (BFS forward/backward, risk analysis)
├── ui/           # Vue 3 + Cytoscape.js web visualization
└── types/        # Shared TypeScript types (Graph, Node, Edge, ImpactResult)
```

No backend. No database. CLI generates `.whatbreaks/graph.json`, UI reads it.

## Key Commands

```bash
whatbreaks scan <dir>              # Scan codebase, generate graph.json
whatbreaks serve [--port 4567]     # Serve interactive web UI
whatbreaks failing <test-file>     # Test failure root cause analysis
whatbreaks refactor <file>         # Blast radius + affected tests
whatbreaks impact <file>           # Generic impact analysis
whatbreaks report                  # Health report (hotspots, chains, circular deps)
whatbreaks hotspots [--top 10]     # Highest blast-radius files
whatbreaks circular                # Detect circular dependencies
whatbreaks chains [--top 5]        # Deepest dependency chains
```

All commands support `--json` for AI tool integration.

## Development

```bash
npm install
npm run build:cli    # Build CLI with tsup
npm run build:ui     # Build UI with Vite
npm run build        # Build both
npm run dev:ui       # Dev server for UI
npm test             # Run tests
```

## Code Conventions

- ESM modules (`"type": "module"` in package.json)
- Strict TypeScript
- All types in `src/types/graph.ts`
- Scanner outputs `Graph` type -> Engine consumes it
- CLI formats engine output for terminal or JSON
- UI reads `graph.json` and runs engine logic client-side

## Graph Data Format

Generated at `.whatbreaks/graph.json`:
```json
{
  "nodes": [{ "id": "src/file.ts", "label": "file.ts", "layer": "shared", "type": "source", "functions": ["fn1"] }],
  "edges": [{ "source": "src/a.ts", "target": "src/b.ts", "type": "import" }]
}
```

## Layer Classification

Files are classified by path convention:
- `pages/` -> page
- `widgets/` | `components/` -> ui
- `features/` -> feature
- `entities/` -> entity
- `shared/` | `lib/` | `utils/` -> shared
- `*.spec.ts` | `*.test.ts` -> test
- `config` | `.config.` -> config
