# WhatBreaks

Codebase intelligence map -- see blast radius before you break anything.

WhatBreaks scans your codebase, builds a dependency and test mapping graph, and answers two critical questions: which files to investigate when a test fails, and what the blast radius is before you refactor a file. No backend, no database -- just a CLI and an interactive web UI.

<!-- screenshot -->

## Quick Start

```bash
# Install globally
npm install -g whatbreaks

# Scan your project
whatbreaks scan .

# Open the interactive graph UI
whatbreaks serve
```

## CLI Commands

All commands support `--json` for machine-readable output and AI tool integration.

| Command | Description |
|---------|-------------|
| `whatbreaks scan <dir>` | Scan codebase and generate dependency graph |
| `whatbreaks serve [--port 4567]` | Launch interactive web UI |
| `whatbreaks failing <test-file>` | Test failure root cause analysis (deepest-first) |
| `whatbreaks refactor <file>` | Blast radius and affected tests |
| `whatbreaks impact <file>` | Generic impact analysis |
| `whatbreaks report` | Health report (hotspots, chains, circular deps) |
| `whatbreaks hotspots [--top N]` | Highest blast-radius files |
| `whatbreaks circular` | Detect circular dependencies |
| `whatbreaks chains [--top N]` | Deepest dependency chains |

### Examples

```bash
# Which files caused this test to fail?
whatbreaks failing src/auth/auth.test.ts

# What breaks if I refactor this file?
whatbreaks refactor src/core/database.ts

# Get the top 10 riskiest files
whatbreaks hotspots --top 10

# JSON output for CI or AI tools
whatbreaks refactor src/core/database.ts --json
```

## Supported Languages

| Language | Parser | Extensions |
|----------|--------|------------|
| TypeScript / JavaScript | ts-morph AST | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` |
| Vue | SFC script extraction + ts-morph | `.vue` |
| Python | Regex (`import`, `from X import`) | `.py` |
| Go | Regex + `go.mod` resolution | `.go` |
| Rust | Regex (`use crate::`, `mod`) | `.rs` |
| PHP | Regex + PSR-4 via `composer.json` | `.php` |
| Ruby | Regex (`require`, `require_relative`) | `.rb` |

## How It Works

1. **Scan** -- parses imports and test files across your codebase using AST analysis (TypeScript/Vue) or regex-based parsers (Python, Go, Rust, PHP, Ruby).
2. **Build graph** -- generates `.whatbreaks/graph.json` with nodes (files), edges (imports), and test coverage mappings.
3. **Analyze** -- BFS traversal in both directions: backward from a failing test to find root causes, forward from a file to find blast radius.
4. **Visualize** -- Vue 3 + Cytoscape.js interactive graph with search, filtering, and impact highlighting.

## Development

```bash
npm install
npm run build        # Build CLI + UI
npm run build:cli    # Build CLI only
npm run build:ui     # Build UI only
npm run dev:ui       # UI dev server
npm test             # Run tests
```

## Requirements

- Node.js >= 18

## License

MIT
