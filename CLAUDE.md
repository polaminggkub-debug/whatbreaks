# WhatBreaks - Codebase Intelligence Map

## What This Project Is

A CLI tool + web UI that scans codebases (any language), builds dependency + test mapping graphs, and provides two core modes:
1. **Test Failure Mode** — test fails -> shows which files to investigate (deepest-first)
2. **Refactor Mode** — pick a file -> shows blast radius + affected tests

Target users: "vibe coders" who build fast with AI tools but need a codebase map.

## Tech Stack

- **Language:** TypeScript (ESM)
- **Scanner:** ts-morph (TS/JS/Vue) + regex-based parsers (Python, Go, Rust, PHP, Ruby)
- **CLI:** Commander.js + chalk + ora
- **Graph UI:** Vue 3 + Cytoscape.js (cose layout)
- **Build:** tsup (CLI), Vite (UI)
- **Package:** npm (`npx whatbreaks`)

## Architecture

```
src/
├── cli/          # Commander CLI commands (scan, serve, failing, refactor, impact, report)
├── scanner/      # Multi-language import parsing (files, imports, tests, layers)
│   └── parsers/  # Language-specific parsers (typescript, python, go, rust, php, ruby)
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

## Code Limits

- **Soft limit:** ~300 LOC per file
- **Hard limit:** 500 LOC max per file
- If a file exceeds 300 LOC, consider splitting it

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

## Demo Project (BattleVerse Engine)

Located at `demo/` — a battle simulator with 67 source files and 205 tests.
Use this for testing WhatBreaks features: `whatbreaks scan demo/` then `whatbreaks serve`.
The hub file `demo/src/core/damage/damageCalculator.ts` cascades to 170+ tests when modified.

## Specs

- **`SPEC_MVP.md`** — Current focus. Work from this. All MVP scope defined here.
- `SPEC_VISION.md` — Full product vision. Reference only, don't implement beyond MVP.
- `SPEC_DEV_RUNTIME.md` — Future phases (watcher, git diff, AI, MCP). Don't touch until MVP ships.

## Supported Languages

- **TypeScript/JavaScript** — ts-morph AST parser (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`)
- **Vue** — SFC script block extraction + ts-morph (`.vue`)
- **Python** — regex parser: `import`, `from X import`, relative imports (`.py`)
- **Go** — regex parser: reads `go.mod`, resolves internal packages (`.go`)
- **Rust** — regex parser: `use crate::`, `mod`, `super::` (`.rs`)
- **PHP** — regex parser: PSR-4 via `composer.json`, Laravel convention (`.php`)
- **Ruby** — regex parser: `require`, `require_relative` (`.rb`)

## UI Architecture

### File Map
- `src/ui/components/GraphView.vue` — Main graph component, initializes Cytoscape, handles layout + highlight watchers
- `src/ui/utils/buildCytoscapeElements.ts` — Converts Graph → Cytoscape elements (nodes, edges, groups)
- `src/ui/utils/graphStyles.ts` — Full Cytoscape stylesheet (selectors for nodes, edges, hover, impact, bundling)
- `src/ui/composables/useGraphInteractions.ts` — All event handlers: click, hover, group focus, context menu
- `src/ui/utils/highlightUtils.ts` — Impact highlighting: classify nodes/edges, animate viewport
- `src/ui/utils/edgeBundling.ts` — Hierarchical edge bundling: convergence nodes, branches, trunk

### Data Flow
`graph.json` → `buildElements()` → Cytoscape init → `layoutstop` → `applyEdgeBundling()` → interactions/highlighting

### Edge Bundling System
- Hierarchical bundling with TWO convergence nodes per bundle (src centroid + tgt centroid)
- Structure: sourceNodes → srcConvergence ══→ tgtConvergence → targetNodes
- Runs post-layout to avoid interfering with force-directed positioning
- Groups cross-group edges by (effectiveSource, effectiveTarget) where effective = parent group or self
- Buckets with 2+ edges → convergence nodes + branch edges + trunk edge; originals hidden (`bundle-hidden`)
- Trunk width: `1.5 + 1.8 * Math.sqrt(count)`, opacity: `0.4 + 0.15 * Math.min(1, sqrt(count)/5)`
- Convergence nodes are non-interactive (`virtual: true`, `selectable: false`, `grabbable: false`)
- **3-Level abstraction:** L1 Overview (bundled), L2 Group Focus (`unbundleGroup`), L3 Investigation (`unbundleChain`/`unbundleImpact`)
- Internal edges (same group) and single cross-group edges are NOT bundled

### Impact Highlighting Lifecycle
1. `applyHighlight()` clears previous state, classifies nodes (root/direct/indirect/unaffected)
2. `classifyEdges()` marks edges as impact-path/impact-path-indirect/impact-unaffected
3. `unbundleImpact()` shows original impact-chain edges, hides their bundle visuals
4. Edge animation starts (dashed line offset)
5. Viewport animates to affected nodes

## Layer Classification

Files are classified by path convention:
- `pages/` -> page
- `widgets/` | `components/` -> ui
- `features/` -> feature
- `entities/` -> entity
- `shared/` | `lib/` | `utils/` -> shared
- `*.spec.ts` | `*.test.ts` -> test
- `config` | `.config.` -> config
