# WhatBreaks MVP

> Scan a TS/Vue codebase. Show what breaks before you break it.

## Goal

CLI tool + web UI that builds a dependency graph and answers two questions:
1. **Test failed** — what files should I investigate? (deepest-first)
2. **Refactoring a file** — what's the blast radius? Which tests must pass?

## Must Have

### Repo Scanner
- ts-morph AST parsing (TS + Vue SFC `<script>` blocks)
- Import edges (including `.js` → `.ts` resolution, `type` imports)
- Test detection (`*.spec.ts`, `*.test.ts`) + `test-covers` edges
- Layer classification by path convention (pages/widgets/features/entities/shared/test/config)
- Output: `.whatbreaks/graph.json`

### Impact Engine
- **Backward** (failing): test → import chain → deepest dependency = likely root cause
- **Forward** (refactor): file → all dependents → affected tests → suggested test command
- BFS traversal, both directions

### CLI Commands
```bash
whatbreaks scan <dir>          # Build graph.json
whatbreaks serve [--port]      # Serve web UI
whatbreaks failing <test>      # Root cause analysis (deepest-first)
whatbreaks refactor <file>     # Blast radius + affected tests
whatbreaks impact <file>       # Generic impact analysis
whatbreaks report              # Health report (hotspots, chains, circular deps)
whatbreaks hotspots [--top N]  # Highest blast-radius files
whatbreaks circular            # Detect circular dependencies
whatbreaks chains [--top N]    # Deepest dependency chains
```
All commands support `--json` for AI tool integration.

### Web UI
- Vue 3 + Cytoscape.js (cose force-directed layout)
- Two modes: Test Failure / Refactor with highlighting
- Click node → side panel (file path, layer, functions, impact status)
- Search, filter by layer, zoom/pan
- Dark theme, file type icons
- Handles 500+ nodes

## Non-Goals (not in MVP)
- No file watcher / live re-scan
- No git diff integration
- No test runner integration
- No AI/LLM features (pure AST analysis)
- No MCP server (CLI `--json` only)
- No multi-language (TypeScript + Vue only)
- No cloud/SaaS (local tool only)
- No CI integration

## Done When
1. `scan` produces correct graph with all files, imports, test mappings
2. `failing` outputs correct root cause chain (deepest-first)
3. `refactor` outputs correct blast radius + affected tests + test command
4. `--json` works on all commands
5. Web UI shows both modes with proper highlighting
6. `report` outputs hotspots, fragile chains, circular deps
7. `npm install -g whatbreaks` → works
