# WhatBreaks Visual System

> Architecture-aware graph visualization with layered layout, importance sizing, and semantic color.

## Overview

Three core visualization systems that work together:

1. **Layering** — vertical position based on dependency depth (not folder names)
2. **Node Size** — log-scaled by fan-in (importer count)
3. **Color** — base color = architectural role, red reserved for runtime failure only

---

## 1. Layer System (Structural Architecture)

### Goal

Organize the graph vertically by real dependency direction.
Files that import others render above. Files that are imported render below.

### Step A: Compute Depth (Longest Dependency Path)

For each node:

```
depth(node):
  if node imports nothing -> depth = 0
  else -> depth = max(depth(importedNode) + 1)
```

**Cycle handling:**
1. Compute Strongly Connected Components (SCC) using Tarjan's algorithm
2. Collapse each SCC into a single virtual node
3. Compute depth on the resulting DAG
4. Assign the SCC's depth to all nodes within it

### Step B: Map Depth to 4 Buckets

Normalize depth into 4 architectural layers:

```
maxDepth = maximum depth in graph
bucketSize = ceil(maxDepth / 4)

layerIndex = floor(depth / bucketSize)  // clamped to 0-3
```

| `layerIndex` | Name                    | Description                        |
|--------------|-------------------------|------------------------------------|
| 0            | Foundation              | Leaf nodes, types, utilities       |
| 1            | Core                    | Shared logic, services             |
| 2            | Feature / Orchestrator  | Feature modules, coordinators      |
| 3            | Entry / Top Layer       | Entry points, pages, app root      |

### Step C: Layout

Use **dagre** layout (hierarchical).

- Set `rank = layerIndex` for each node
- Bottom = Foundation (0), Top = Entry (3)
- Test files rendered in a **separate column** outside the vertical layering

### Relationship to Existing `layer` Field

The existing path-based `NodeLayer` (`ui`, `feature`, `shared`, etc.) is retained for filtering and metadata. The new `layerIndex` is a computed structural property that drives layout position. They coexist:

- `layer` = classification by path convention (user-facing label)
- `layerIndex` = classification by dependency depth (layout position)

---

## 2. Node Size System (Importance)

### Goal

Bigger node = more central = higher blast radius.

### Metric: Fan-in (Importer Count)

```
fanIn(node) = number of files that directly import this file
```

This represents coupling, centrality, risk, and blast radius.

### Size Formula (Log Scale)

```
size = 30 + log2(fanIn + 1) * 12
```

| Fan-in | Approximate Size |
|--------|-----------------|
| 0      | 30 (minimum)    |
| 1      | 42              |
| 5      | 61              |
| 10     | 72              |
| 20+    | 84+             |

**Why log scale:** Prevents nodes with very high fan-in from dominating the graph visually.

### Constraints

- Use **fan-in only** for size
- Do NOT use: number of exports, file size, fan-out, or any other metric
- `fanIn` is already computed by the engine (see `HotspotFile.fanIn`)

---

## 3. Color System

### Rule #1

**Red is reserved for runtime failure state only.** Never use red for layers or risk.

### Base Color = Architectural Layer

Cool tones only. Applied by `layerIndex`:

| Layer              | `layerIndex` | Color          | Hex       |
|--------------------|--------------|----------------|-----------|
| Foundation         | 0            | Teal           | `#14b8a6` |
| Core               | 1            | Blue           | `#3b82f6` |
| Feature            | 2            | Purple         | `#a855f7` |
| Entry              | 3            | Dark Blue      | `#1e40af` |
| Test (separate)    | —            | Soft Gray-Blue | `#64748b` |

These colors represent **structural role**, not status.

### Runtime Failure Overlay

When a test fails, apply overlay **on top of** base color (do not replace it):

| Status                | Overlay Color | Hex       |
|-----------------------|---------------|-----------|
| Root cause            | Red           | `#ef4444` |
| Directly affected     | Orange        | `#f97316` |
| Indirectly affected   | Yellow        | `#eab308` |
| Failure path edges    | Red           | `#ef4444` |

**When failure clears, revert to base colors.**

### Risk Highlight (Optional, Non-Red)

For high fan-in nodes in normal mode:
- Subtle blue glow or thicker border
- **Never** use red for risk indication

---

## 4. Data Model Extension

### `GraphNode` additions

```typescript
export interface GraphNode {
  // Existing fields
  id: string;
  label: string;
  layer: NodeLayer;       // Path-based classification (retained)
  type: NodeType;
  functions: string[];

  // New computed fields
  depth: number;          // Longest dependency path (0 = leaf)
  layerIndex: number;     // 0-3 bucket from depth
  fanIn: number;          // Number of direct importers
  size: number;           // Computed: 30 + log2(fanIn + 1) * 12
}
```

### Computation Pipeline

```
scan → resolve imports → build edges
                              ↓
                     compute SCC (if cycles)
                              ↓
                     compute depth per node
                              ↓
                     bucket depth → layerIndex
                              ↓
                     count fan-in per node
                              ↓
                     compute size per node
                              ↓
                     write graph.json
```

All fields are computed at **scan time** and persisted in `graph.json`. The UI reads them directly — no recomputation needed client-side.

---

## 5. UI Controls

### Required Toggles

| Control              | Options                      | Default    |
|----------------------|------------------------------|------------|
| Hide Foundation      | Show / Hide layer 0          | Show       |
| Hide Tests           | Show / Hide test nodes        | Show       |
| Size Mode            | Fan-in (dynamic) / Uniform   | Fan-in     |
| Show Impact Only     | All nodes / Impacted only     | All        |

### Layout Toggle

| Control              | Options                      | Default    |
|----------------------|------------------------------|------------|
| Layout               | Dagre (layered) / Cose (force) | Dagre    |

When switching to Dagre, use `layerIndex` as rank. When Cose, `layerIndex` is unused for positioning but still drives color.

---

## 6. Visual Philosophy

### Normal Mode
- Bottom = Foundation, Top = Entry
- Bigger = More critical (higher fan-in)
- Color = Architectural role (cool tones)
- Clean, structural, no alarm colors

### Failure Mode
- System "lights up" with warm failure colors
- Red = runtime breakage (root cause)
- Orange/Yellow = propagation path
- Impact path is visually obvious
- Unaffected nodes dim to 0.25 opacity

---

## 7. Implementation Scope

### Engine (scan-time computation)
- [ ] Compute `depth` via longest-path on DAG (with SCC for cycles)
- [ ] Bucket `depth` into `layerIndex` (0-3)
- [ ] Compute `fanIn` per node
- [ ] Compute `size` per node using log formula
- [ ] Extend `GraphNode` type with new fields
- [ ] Persist all fields in `graph.json`

### UI (visualization)
- [ ] Switch default layout to dagre with `rank = layerIndex`
- [ ] Apply node size from `size` field
- [ ] Apply base color from `layerIndex`
- [ ] Implement runtime failure overlay (red/orange/yellow on top of base)
- [ ] Add UI toggles (hide layers, size mode, layout switch)
- [ ] Revert to base colors when failure clears
- [ ] Optional: blue glow for high fan-in nodes

---

## Non-Goals

- No custom user-defined layers (use path-based `layer` for that)
- No animated transitions between layouts (simple re-render)
- No 3D visualization
- No color themes beyond dark mode
