# WhatBreaks

**AI-Powered Codebase Intelligence Map**

> When a test fails, see the blast radius in 2 seconds. No reading the entire repo.
> When you refactor a file, know exactly what breaks before you touch it.

---

## Target Audience

**Vibe coders** — developers who build fast with AI tools but don't have deep knowledge of their codebase. They need a map, not documentation.

Works with ANY AI coding tool: Claude Code, ChatGPT Codex, Cursor, Windsurf, Aider — anything with a CLI.

---

## Problem

No free tool exists that:
- Parses a real codebase's dependency graph
- Maps tests to the code they cover
- Shows blast radius when something breaks
- Shows refactor impact before you change anything
- Renders an interactive, beautiful graph
- Works as a CLI that any AI tool can call

CodeViz and CodeSee do some of this but they're paid. Obsidian Graph View is pretty but has no code intelligence. dependency-cruiser shows file imports but is ugly and has no impact analysis.

---

## Solution

A CLI tool that scans a TypeScript/Vue codebase, builds a dependency + test mapping graph, and serves an interactive visualization with two core modes:

1. **Test Failure Mode** — A test fails → graph highlights every file that contributed to the failure
2. **Refactor Mode** — Pick a file you want to change → graph shows every file and test that will be affected

---

## Installation

Dead simple. One command in any project:

```bash
npm install -g whatbreaks

# Or run without installing:
npx whatbreaks scan ./src
```

Then any AI tool (Claude Code, Codex, Cursor) can call:

```bash
whatbreaks impact src/shared/lib/payroll/excelParser.ts
```

And get structured JSON output it can reason about.

---

## User Scenarios

### Scenario 1: Test Failure Mode

```
# Playwright test fails
$ npx playwright test payroll-upload.spec.ts
FAILED: payroll-upload.spec.ts > should upload Excel file

# Ask WhatBreaks: what's connected to this test?
$ whatbreaks failing payroll-upload.spec.ts
```

**Terminal output:**
```
TEST: payroll-upload.spec.ts (FAILED)

Directly tests:
  → AttendanceUploader.vue (UI)
  → PayrollUploadModal.vue (UI)

Which depend on:
  → useAttendanceUpload.ts (feature)
    → excelParser.ts (shared) ← LIKELY ROOT CAUSE (deepest dependency)
    → employeeMatcher.ts (shared)
  → useAttendancePersistence.ts (feature)
    → attendancePersistence.ts (feature)
    → clockExtraction.ts (feature)

Files to investigate (deepest-first):
  1. src/shared/lib/payroll/excelParser.ts
  2. src/shared/lib/payroll/employeeMatcher.ts
  3. src/features/upload-attendance/model/useAttendanceUpload.ts
  4. src/features/upload-attendance/model/attendancePersistence.ts

Other tests that would also fail:
  ✗ payroll-upload-overlap.spec.ts
  ✗ payroll-upload-breakdown.spec.ts
  ✗ processing-log.spec.ts
```

**Web UI:** User switches to `http://localhost:4567` → the failing test is highlighted red → all connected files glow orange/yellow → side panel shows "investigate these files, deepest-first."

### Scenario 2: Refactor Mode

```
# Before touching a file, check the blast radius:
$ whatbreaks refactor src/shared/lib/payroll/excelParser.ts
```

**Terminal output:**
```
REFACTOR IMPACT: excelParser.ts

If you change this file:

  Files affected (23):
    Direct importers (2):
      → useAttendanceUpload.ts
      → employeeMatcher.ts (receives parser output)
    Indirect (21):
      → useAttendancePersistence.ts → attendancePersistence.ts → ...
      → PayrollUploadModal.vue → AttendanceUploader.vue → ...
      (full list: whatbreaks serve --highlight excelParser.ts)

  Tests to run (4):
    → payroll-upload.spec.ts
    → payroll-upload-overlap.spec.ts
    → payroll-upload-breakdown.spec.ts
    → processing-log.spec.ts

  Safe files (not affected):
    → payCalculator.ts, hoursCalculator.ts, dayTypeDetector.ts ...

  Suggested test command:
    npx playwright test payroll-upload payroll-upload-overlap payroll-upload-breakdown processing-log
```

**Web UI:** User opens graph → searches `excelParser.ts` → clicks "Refactor Mode" → blast radius lights up → side panel shows "23 files affected, 4 tests to run" with the exact test command.

### Scenario 3: AI Tool Integration

Any AI coding assistant can use WhatBreaks as a CLI tool:

```bash
# AI runs this before making changes:
$ whatbreaks refactor src/shared/lib/payroll/excelParser.ts --json
```

Returns structured JSON that the AI can reason about:

```json
{
  "file": "src/shared/lib/payroll/excelParser.ts",
  "mode": "refactor",
  "affected_files": 23,
  "affected_tests": 4,
  "direct_importers": [
    "src/features/upload-attendance/model/useAttendanceUpload.ts",
    "src/shared/lib/payroll/employeeMatcher.ts"
  ],
  "tests_to_run": [
    "payroll-upload.spec.ts",
    "payroll-upload-overlap.spec.ts",
    "payroll-upload-breakdown.spec.ts",
    "processing-log.spec.ts"
  ],
  "suggested_test_command": "npx playwright test payroll-upload payroll-upload-overlap payroll-upload-breakdown processing-log"
}
```

The AI now knows:
- What scope it's touching
- What tests to run after changes
- What other files it might need to update

This works with Claude Code, ChatGPT Codex, Cursor, Windsurf, Aider — any tool that can run shell commands.

---

## Two Core Modes

### Mode 1: Test Failure ("What broke?")

**Direction:** Backward — from test → through imports → to root cause

```
Test (FAILED)
  ↓ imports
Component (UI)
  ↓ imports
Composable (feature)
  ↓ imports
Library (shared) ← LIKELY ROOT CAUSE (deepest node)
```

**Algorithm:** Start from the failing test. Walk its import chain. The deepest files in the chain are the most likely root causes. Highlight everything in the path.

**Key insight:** Suggest "investigate deepest-first" — the root cause is almost always at the bottom of the import chain, not the top.

### Mode 2: Refactor ("What will break?")

**Direction:** Forward — from changed file → through dependents → to affected tests

```
Library (CHANGED)
  ↑ imported by
Composable (feature) ← AFFECTED
  ↑ imported by
Component (UI) ← AFFECTED
  ↑ tested by
Test ← MUST RUN
```

**Algorithm:** Start from the file being changed. Walk backward through all files that import it (directly or transitively). Collect all test files that cover any affected file. These are the tests you must run.

**Key insight:** Output the exact test command so the user (or AI) can just paste and run it.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Graph UI (Web)                    │
│  Vue 3 + Cytoscape.js                               │
│  Two modes: Test Failure / Refactor                  │
│  Dark theme, zoom/pan, click, hover, filter          │
│  Served as static files by CLI dev server            │
└──────────────────────┬──────────────────────────────┘
                       │ reads graph.json
┌──────────────────────▼──────────────────────────────┐
│                  Impact Engine                       │
│  BFS traversal in two directions:                    │
│  - backward (test failure → find root cause)         │
│  - forward (refactor → find blast radius)            │
│  ~100 lines of code                                  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                  Repo Scanner                        │
│  ts-morph (TS/Vue) — AST-based, accurate             │
│  Parse imports/exports, detect test files             │
│  Map test → code (import chain analysis)             │
│  Classify files by layer (FSD/custom conventions)    │
└─────────────────────────────────────────────────────┘
```

No backend server. No database. CLI generates JSON, UI reads JSON.

---

## MVP Scope (Phase 1)

### Module 1: Repo Scanner

**Input:** Directory path (e.g., `./apps/erp/src`)

**Output:** `.whatbreaks/graph.json`

```json
{
  "nodes": [
    {
      "id": "src/shared/lib/payroll/excelParser.ts",
      "label": "excelParser.ts",
      "layer": "shared",
      "type": "source",
      "functions": ["parseAttendanceExcel", "validateRow", "normalizeEmpId"]
    }
  ],
  "edges": [
    {
      "source": "src/features/upload-attendance/model/useAttendanceUpload.ts",
      "target": "src/shared/lib/payroll/excelParser.ts",
      "type": "import"
    }
  ]
}
```

**Implementation:**
- Use `ts-morph` to parse TypeScript files
- Extract: file path, imports, exports, function names
- Detect Vue SFC `<script>` blocks (parse as TS)
- Detect test files by pattern: `*.spec.ts`, `*.test.ts`
- Build nodes + edges from import relationships
- Classify layers by path convention (pages/, features/, entities/, shared/)
- Configurable via `.whatbreaks/config.json` for custom conventions

**Node properties:**
- `id`: relative file path (unique)
- `label`: filename only
- `layer`: ui | feature | shared | entity | page | test | config
- `type`: source | test | type-only
- `functions`: exported function/class names

**Edge properties:**
- `source`: importer file id
- `target`: imported file id
- `type`: import | test-covers

### Module 2: Test Mapper

**Input:** Same scan pass as Module 1

**Output:** Additional edges with `type: "test-covers"`

**Logic:**
1. For each `*.spec.ts` / `*.test.ts` file, parse its imports
2. Every import from a test file to a source file = `test-covers` edge
3. Transitive: if test imports A, and A imports B, test indirectly covers B

**Why this matters:** When `excelParser.ts` breaks, we can trace BACK from it to find which tests would fail. When a test fails, we can trace its import chain to find the likely root cause.

### Module 3: Impact Engine

**Input:** A node ID (file path) + the graph + mode (failing | refactor)

**Output:** Set of all affected node IDs + their distance + suggested actions

**Test Failure Mode (backward):**
```
function findRootCause(graph, failingTestId):
    // Walk the test's import chain to find deepest dependencies
    chain = []
    queue = [failingTestId]
    visited = Set()

    while queue not empty:
        nodeId = queue.dequeue()
        if nodeId in visited: continue
        visited.add(nodeId)
        chain.push({ nodeId, depth: getDepth(nodeId) })

        // Follow what this file IMPORTS
        imports = graph.edges
            .filter(e => e.source === nodeId)
            .map(e => e.target)

        for imp in imports:
            queue.enqueue(imp)

    // Sort deepest-first = most likely root cause
    return chain.sortBy(depth, descending)
```

**Refactor Mode (forward):**
```
function computeBlastRadius(graph, changedFileId):
    affected = Set()
    queue = [(changedFileId, 0)]

    while queue not empty:
        (nodeId, distance) = queue.dequeue()
        if nodeId in affected: continue
        affected.add({ nodeId, distance })

        // Find all files that IMPORT this file
        dependents = graph.edges
            .filter(e => e.target === nodeId)
            .map(e => e.source)

        for dep in dependents:
            queue.enqueue((dep, distance + 1))

    // Collect all tests that cover any affected file
    affectedTests = graph.edges
        .filter(e => e.type === "test-covers" && affected.has(e.target))
        .map(e => e.source)

    return { affected, affectedTests, testCommand }
```

### Module 4: Graph UI

**Tech:** Vue 3 + Cytoscape.js (served by CLI)

**Two modes accessible via toggle button in UI:**

#### Test Failure Mode UI
- Dropdown/search: select a test file
- Click "Analyze Failure"
- Graph highlights the entire import chain from test to deepest dependency
- Deepest nodes = brightest red (most likely root cause)
- Side panel: "Investigate these files (deepest-first)" with file paths
- Other tests that share the same dependencies highlighted as "also at risk"

#### Refactor Mode UI
- Dropdown/search: select any source file
- Click "Analyze Refactor Impact"
- Graph highlights all files that depend on it (direct + transitive)
- Test nodes highlighted = "these tests must pass after your change"
- Side panel: summary + exact test command to copy-paste
- Counter: "23 files affected, 4 tests to run"

**Layout:**
- Hierarchical top-to-bottom (pages at top, shared at bottom, tests on side)
- Grouped by layer
- Cytoscape.js `dagre` layout

**Node colors:**
| Status | Color | Hex |
|--------|-------|-----|
| Broken / Root cause | Red | #ef4444 |
| Affected (direct) | Orange | #f59e0b |
| Affected (indirect) | Yellow | #eab308 |
| OK / Unaffected | Green | #22c55e |
| UI layer (default) | Blue | #3b82f6 |
| Data layer (default) | Purple | #8b5cf6 |
| Test (passing) | Teal | #14b8a6 |
| Test (failing/at risk) | Red | #ef4444 |

**Interactions:**
- **Click node** → Side panel shows:
  - Full file path
  - Layer classification
  - Exported functions
  - Impact status (broken/affected/ok)
  - Reason (e.g., "Imports from broken excelParser.ts")
  - Which tests cover this file
  - "Investigate" button (deepest-first list in failure mode)
  - "Copy test command" button (in refactor mode)
- **Hover** → Highlight all connected edges
- **Search** → Filter nodes by name, center graph on result
- **Toggle modes** → Switch between Test Failure / Refactor
- **Filter layers** → Show/hide UI/feature/shared/test layers
- **Show only impacted** → Hide all unaffected nodes
- **Zoom/Pan** → Built into Cytoscape.js

**Style:**
- Dark background (#0f172a)
- Rounded nodes with subtle shadows
- Red edges for impact paths, gray for normal
- Smooth animations on highlight
- Responsive sidebar panel
- Modern, clean — not ugly

---

## CLI Commands

```bash
# ── Setup ──

# Scan a codebase and generate graph
whatbreaks scan <dir> [--output .whatbreaks/graph.json]

# Serve interactive UI
whatbreaks serve [--port 4567]

# ── Test Failure Mode ──

# A test failed — what files should I investigate?
whatbreaks failing <test-file>
whatbreaks failing <test-file> --json          # JSON output for AI tools

# ── Refactor Mode ──

# I want to change this file — what will be affected?
whatbreaks refactor <file>
whatbreaks refactor <file> --json               # JSON output for AI tools
whatbreaks refactor <file> --tests-only         # Just show affected tests

# ── Query ──

# Show blast radius for a file (both directions)
whatbreaks impact <file> [--direction both|forward|backward]

# Show which tests cover a file
whatbreaks tests <file>

# Show what a test covers
whatbreaks covers <test-file>

# ── UI Integration ──

# Open graph with a specific file pre-highlighted
whatbreaks serve --highlight <file>
whatbreaks serve --failing <test-file>
whatbreaks serve --refactor <file>
```

**All commands support `--json` flag for AI tool integration.**

### Risk Analysis Commands (from scan data)

```bash
# ── Risk Analysis ──

# Full health report: hotspots, fragile chains, circular deps
whatbreaks report
whatbreaks report --json

# Top N highest blast-radius files
whatbreaks hotspots [--top 10]

# Detect circular dependencies
whatbreaks circular

# Show deepest dependency chains
whatbreaks chains [--top 5]
```

---

## Module 5: Risk Analyzer

Runs automatically after `whatbreaks scan`. Computes risk metrics from the graph.

**Detects:**
- **High fan-in files** — imported by many files (highest blast radius if changed)
- **Deepest dependency chains** — long import chains = fragile, hard to debug
- **Circular dependencies** — A imports B imports A (design smell)
- **Fragile test chains** — tests that cover deep chains (one break = test fails for unclear reasons)
- **Central shared modules** — files that sit at the intersection of many flows

**Output: `whatbreaks report`**

```
=== WHATBREAKS HEALTH REPORT ===

Source files: 847
Test files: 42
Edges: 2341

=== HIGH RISK FILES (by blast radius) ===

  1. src/shared/lib/payroll/excelParser.ts
     Fan-in: 23 files depend on this
     Risk: HIGH — core parser, entire upload flow breaks if changed
     Tests at risk: 4

  2. src/shared/api/supabase.ts
     Fan-in: 67 files depend on this
     Risk: HIGH — every DB operation goes through this
     Tests at risk: 12

  3. src/shared/lib/payroll/shiftDetector.ts
     Fan-in: 8 files depend on this
     Risk: MEDIUM — used by clock extraction + backfill
     Tests at risk: 4

  ...

=== FRAGILE TEST CHAINS ===

  1. payroll-upload.spec.ts
     Chain depth: 7
     Deepest dep: excelParser.ts → employeeMatcher.ts
     Risk: Any break in 7-file chain fails this test

  2. processing-log.spec.ts
     Chain depth: 6
     Deepest dep: processingLogBuilder.ts → processingLog.ts
     Risk: Forensic logging chain, hard to debug

=== CIRCULAR DEPENDENCIES ===

  None detected ✓  (or list them if found)

=== REFACTOR HOTSPOTS ===

  Files that would cause the LARGEST cascade if modified:
  1. supabase.ts — 67 dependents, 12 tests
  2. excelParser.ts — 23 dependents, 4 tests
  3. constants.ts — 15 dependents, 8 tests

=== PRIORITIZED ACTIONS ===

  1. INSPECT: excelParser.ts — highest risk-to-test ratio
  2. CAREFUL: supabase.ts — most dependents, refactor with caution
  3. ISOLATE: payroll-upload.spec.ts — deepest chain, consider splitting test
```

---

## AI Tool Integration

WhatBreaks is designed to be used BY AI coding assistants, not just by humans.

### How AI tools use it:

```bash
# Before changing a file, AI runs:
whatbreaks refactor src/shared/lib/payroll/excelParser.ts --json

# After test failure, AI runs:
whatbreaks failing tests/e2e/payroll-upload.spec.ts --json

# AI gets structured JSON it can reason about
```

### What AI gets back:

```json
{
  "mode": "refactor",
  "target": "src/shared/lib/payroll/excelParser.ts",
  "affected": {
    "total_files": 23,
    "total_tests": 4,
    "direct_importers": ["useAttendanceUpload.ts", "employeeMatcher.ts"],
    "transitive_affected": ["attendancePersistence.ts", "..."],
    "tests_to_run": ["payroll-upload.spec.ts", "..."]
  },
  "suggested_test_command": "npx playwright test payroll-upload payroll-upload-overlap payroll-upload-breakdown processing-log",
  "risk_level": "high",
  "risk_reason": "Core parser used by entire upload flow"
}
```

### Compatible with:
- **Claude Code** — can call `whatbreaks` via Bash tool
- **ChatGPT Codex** — can call via shell
- **Cursor** — can call via terminal
- **Windsurf** — can call via terminal
- **Aider** — can call via shell commands
- **Any tool with shell access**

### Potential: MCP Server (Phase 2)

Could also expose as an MCP server so AI tools can call it natively:

```json
{
  "tool": "whatbreaks_refactor",
  "input": { "file": "excelParser.ts" },
  "output": { "affected_files": 23, "tests_to_run": [...] }
}
```

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Language | TypeScript | Same as target codebases |
| Scanner | ts-morph | Best TS AST parser, handles Vue SFC |
| Graph UI | Cytoscape.js | WebGL, handles 1000+ nodes, great layouts |
| Frontend | Vue 3 | Lightweight, fast, familiar |
| CLI | Node.js + Commander | Simple CLI framework |
| Build | tsup | Fast TS bundler for CLI tools |
| Package | npm | Distribute as `npx whatbreaks` |

**No backend. No database. No server (except static file server for UI).**

---

## File Structure

```
WhatBreaks/
├── src/
│   ├── cli/                    # CLI entry point + commands
│   │   ├── index.ts            # Commander setup
│   │   ├── scan.ts             # scan command
│   │   ├── serve.ts            # serve command (static file server)
│   │   ├── failing.ts          # test failure analysis command
│   │   ├── refactor.ts         # refactor impact command
│   │   └── impact.ts           # generic impact command
│   ├── scanner/                # Repo scanning
│   │   ├── fileScanner.ts      # Walk directory, find TS/Vue files
│   │   ├── importParser.ts     # ts-morph import extraction
│   │   ├── vueParser.ts        # Vue SFC <script> extraction
│   │   ├── testMapper.ts       # Test file detection + mapping
│   │   └── layerClassifier.ts  # Classify files by layer
│   ├── engine/                 # Impact analysis
│   │   ├── graph.ts            # Graph data structure + loading
│   │   ├── impact.ts           # BFS impact computation (both directions)
│   │   ├── failing.ts          # Test failure root cause analysis
│   │   ├── refactor.ts         # Refactor blast radius analysis
│   │   └── risk.ts             # Risk analyzer (hotspots, chains, circular deps)
│   ├── ui/                     # Web UI (Vue 3 + Cytoscape)
│   │   ├── index.html          # Entry point
│   │   ├── App.vue
│   │   ├── components/
│   │   │   ├── GraphView.vue       # Cytoscape.js wrapper
│   │   │   ├── NodePanel.vue       # Side panel for clicked node
│   │   │   ├── ModeToggle.vue      # Switch: Failure / Refactor mode
│   │   │   ├── SearchBar.vue       # Node search + filter
│   │   │   ├── TestCommand.vue     # Copy-paste test command panel
│   │   │   └── Legend.vue          # Color legend
│   │   └── composables/
│   │       ├── useGraph.ts         # Graph state management
│   │       ├── useImpact.ts        # Impact highlighting
│   │       └── useMode.ts          # Mode switching (failure/refactor)
│   └── types/                  # Shared types
│       └── graph.ts            # Node, Edge, Graph, ImpactResult types
├── package.json
├── tsconfig.json
├── tsup.config.ts              # CLI build config
├── vite.config.ts              # UI build config
└── SPEC.md                     # This file
```

---

## Scalability Strategy (1000+ files)

1. **Cluster by directory** — collapse `shared/lib/payroll/` into one node, expand on click
2. **Lazy rendering** — only render visible viewport nodes
3. **Level-of-detail** — zoomed out = module clusters, zoomed in = individual files
4. **Filter by layer** — toggle UI/feature/shared/test layers
5. **Search-first** — type a filename, graph centers on it with neighbors visible
6. **Impact-only view** — hide all unaffected nodes, show only blast radius

---

## Phase 2 (Future)

- [ ] **Live file watcher** — re-scan on save, graph updates in real-time
- [ ] **Git diff integration** — "what changed since last commit?" → highlight those nodes
- [ ] **Test runner integration** — run tests, auto-detect failures, auto-highlight in graph
- [ ] **AI flow detection** — LLM reads code, generates logical flow clusters (e.g., "Upload Attendance Flow")
- [ ] **AI explain** — "Why might this test fail?" based on recent changes + graph
- [ ] **MCP Server** — expose as MCP tool for native AI assistant integration
- [ ] **Multi-language** — support Python, Go, PHP, Rust parsers
- [ ] **CI integration** — `whatbreaks ci --changed` outputs only affected tests for selective test running
- [ ] **Playwright/Vitest plugin** — auto-run `whatbreaks failing` on test failure

---

## Non-Goals (MVP)

- No backend server (CLI + static UI only)
- No database (in-memory JSON graph)
- No AI features (pure AST analysis)
- No multi-language (TypeScript + Vue only)
- No real-time watching (manual `scan` command)
- No cloud/SaaS (local tool only)
- No MCP server (just CLI with `--json` flag)

---

## Success Criteria

MVP is done when:

1. `whatbreaks scan ./src` produces correct `graph.json` with all files, imports, and test mappings
2. `whatbreaks serve` opens browser with interactive Cytoscape.js graph
3. `whatbreaks failing <test>` outputs correct root cause chain (deepest-first)
4. `whatbreaks refactor <file>` outputs correct blast radius + affected tests + test command
5. Both commands work with `--json` flag for AI tool consumption
6. Web UI has working Test Failure mode and Refactor mode with proper highlighting
7. Clicking any node shows details in side panel
8. Graph handles 500+ nodes without lag
9. `whatbreaks report` outputs risk analysis with hotspots, fragile chains, and circular deps
10. It looks good. Dark theme. Modern. Not ugly.
11. Install is one command: `npm install -g whatbreaks`
