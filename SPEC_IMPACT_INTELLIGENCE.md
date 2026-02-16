# WhatBreaks — Impact Intelligence

> From "showing structure" to "explaining impact."

## Problem

The graph shows **what** is connected. It doesn't explain **why** something breaks or **how** impact propagates. Users still have to trace paths with their eyes and mentally reconstruct causality.

## Goal

Three features that make the graph an impact explanation tool:

1. **Dependency Path Trace** — click any impacted node, see the exact chain that connects it to the root cause
2. **Break Simulation** — right-click any file, instantly see "what breaks if I touch this?" without switching modes
3. **Health Insights Panel** — surface hotspots, circular deps, and fragile chains that the engine already computes but the UI hides

---

## Feature 1: Dependency Path Trace

### The Gap

When impact analysis runs, NodePanel shows `"Directly tested by the failing test"` or `"Indirectly affected"`. But it doesn't show **the path**. The user sees a red node and has to guess why it's red.

### Behavior

When impact analysis is active and user clicks an affected node:

**NodePanel shows a new "Impact Path" section:**

```
WHY THIS FILE IS AFFECTED

battleEngine.ts
  └─ imports damageSystem.ts
       └─ imports calculateFinalDamage.ts  ← root cause
```

- Each step in the path is clickable (navigates to that node)
- Hovering a step highlights that specific edge on the graph
- Path shows the **shortest** connection from the clicked node to the impact root

### Engine

Add `tracePath(fromId: string, toId: string, edges: GraphEdge[]): string[]` to `useImpact.ts`:

- BFS from `fromId` toward `toId` using import edges
- Track parent pointers during BFS
- Reconstruct path by backtracking from `toId` to `fromId`
- Return ordered array of node IDs: `[fromId, ..., toId]`
- For failing mode: trace from affected file → test (backward through imports)
- For refactor mode: trace from affected file → refactored file (backward through reverse imports)

### UI Changes

**NodePanel.vue** — new section below "Impact Status":

```html
<!-- Impact path (only shown when impact active + node is affected) -->
<div class="section" v-if="impactPath.length > 0">
  <div class="section-label">Why This File Is Affected</div>
  <div class="impact-chain">
    <div v-for="(step, i) in impactPath" :key="step.id" class="chain-step"
         @click="emit('navigateToNode', step.id)"
         @mouseenter="emit('highlightEdge', step.id, impactPath[i+1]?.id)"
         @mouseleave="emit('clearEdgeHighlight')">
      <span class="chain-indent" v-for="_ in i" :key="_"></span>
      <span class="chain-arrow" v-if="i > 0">imports</span>
      <span class="chain-file">{{ step.label }}</span>
      <span class="chain-tag" v-if="i === 0">this file</span>
      <span class="chain-tag root" v-if="i === impactPath.length - 1">root</span>
    </div>
  </div>
</div>
```

**GraphView.vue** — new edge highlight handler:

- On `highlightEdge(sourceId, targetId)`: add `path-highlight` class to that specific edge (bright white, width 3)
- On `clearEdgeHighlight`: remove `path-highlight` class

### Style

```css
.chain-step {
  padding: 4px 6px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  gap: 6px;
}
.chain-step:hover { background: #0f172a; color: #a5b4fc; }
.chain-indent { width: 16px; display: inline-block; }
.chain-arrow { color: #475569; font-size: 10px; }
.chain-file { font-family: 'Fira Code', monospace; }
.chain-tag { font-size: 9px; padding: 1px 6px; border-radius: 8px; background: #334155; color: #94a3b8; }
.chain-tag.root { background: #dc2626; color: #fff; }
```

---

## Feature 2: Break Simulation

### The Gap

To see what breaks when you touch a file, you must: switch to Refactor mode → search for the file → click Analyze. Three steps. Should be one.

### Behavior

**Right-click any source node on the graph** → context menu appears:

```
┌──────────────────────────────┐
│  What breaks if I touch this?  │
│  Show all importers            │
│  Copy file path                │
└──────────────────────────────┘
```

**"What breaks if I touch this?"** triggers:

1. Run `analyzeRefactor(fileId)` instantly
2. Apply impact highlighting to graph (same as refactor mode)
3. Open NodePanel with full blast radius details
4. Show impact summary toast at top of graph:

```
┌─────────────────────────────────────────────────────┐
│  Touching damageCalculator.ts would affect           │
│  12 files  •  8 tests  •  Risk: HIGH                │
│                                              [Clear] │
└─────────────────────────────────────────────────────┘
```

5. User can then click any affected node to see the dependency path (Feature 1)

**Key difference from current refactor mode:** no mode switch needed. Right-click → instant answer. The mode toggle still exists for the search-based flow.

### UI Changes

**GraphView.vue** — add `cxttap` handler (Cytoscape right-click):

```typescript
cy.on('cxttap', 'node[type = "source"]', (evt) => {
  const nodeId = evt.target.id();
  showContextMenu(evt.renderedPosition, nodeId);
});
```

**New component: `ContextMenu.vue`**

- Positioned at click coordinates
- 2-3 menu items (break simulation, show importers, copy path)
- Closes on click-away or Escape
- Emits action events to parent

**New component: `ImpactToast.vue`**

- Fixed position at top center of graph area
- Shows affected files count, test count, risk level
- Clear button removes impact highlighting
- Auto-appears when break simulation runs

### Data Flow

```
right-click node
  → ContextMenu shows
    → user clicks "What breaks?"
      → analyzeRefactor(nodeId)
        → highlightResult updates
          → graph highlights affected nodes
          → ImpactToast appears
          → NodePanel opens on clicked node
```

---

## Feature 3: Health Insights Panel

### The Gap

The engine computes hotspots, circular dependencies, and fragile chains. The CLI exposes them via `whatbreaks report`. But the web UI shows none of this.

### Behavior

**New button in toolbar: "Health"** (pill icon or heartbeat icon)

Clicking it opens a left-side panel (opposite of NodePanel):

```
┌──────────────────────────────┐
│  CODEBASE HEALTH             │
│                              │
│  HOTSPOTS (5)                │
│  ● damageCalculator.ts  HIGH │
│    Fan-in: 12 • Tests: 8     │
│  ● battleEngine.ts     MED  │
│    Fan-in: 8 • Tests: 5      │
│  ...                         │
│                              │
│  FRAGILE CHAINS (3)          │
│  ⚠ damage.spec.ts           │
│    Chain depth: 7             │
│    Deepest: types.ts          │
│  ...                         │
│                              │
│  CIRCULAR DEPS (1)           │
│  ↻ a.ts → b.ts → c.ts → a.ts│
│                              │
└──────────────────────────────┘
```

- **Hotspot items are clickable** → runs break simulation on that file
- **Fragile chain items are clickable** → runs failing analysis on that test
- **Circular dep items are clickable** → highlights the cycle on the graph
- Risk badges use existing color system (red HIGH, amber MEDIUM, teal LOW)

### Engine

The engine already has `analyzeRisk()` in `src/engine/risk.ts` returning `HealthReport`. The UI just needs to call it.

**One addition:** circular dependency highlighting on the graph. When user clicks a circular dep:
- Highlight all nodes in the cycle with a new `cycle-highlight` class
- Highlight edges between them
- Dim everything else

### UI Changes

**New component: `HealthPanel.vue`**

- Left-side slide-in panel (mirrors NodePanel on right)
- Three collapsible sections: Hotspots, Fragile Chains, Circular Deps
- Each item clickable with hover states
- Computes health data once on graph load, caches result

**ViewControls.vue** — add Health toggle button

**GraphView.vue** — add cycle highlighting handler

---

## Implementation Order

```
1. tracePath() in useImpact.ts          — engine foundation
2. Impact Path section in NodePanel     — the "why" explanation
3. Edge highlight on path hover         — visual connection
4. ContextMenu.vue                      — right-click menu
5. Break simulation wiring              — instant impact
6. ImpactToast.vue                      — summary feedback
7. HealthPanel.vue                      — surface hidden data
8. Cycle highlighting                   — circular dep viz
```

Steps 1-3 are Feature 1 (path trace). Steps 4-6 are Feature 2 (break sim). Steps 7-8 are Feature 3 (health).

**Ship Feature 1 first.** It's the smallest, highest-impact change. The others build on it.

---

## Non-Goals

- No undo/redo for simulations
- No multi-file simulation ("what if I change A and B together?")
- No animated path traversal
- No persistence of simulation results
- No diff integration (that's SPEC_DEV_RUNTIME territory)
- No AI explanations (pure graph analysis)

## Done When

1. Click an affected node during impact analysis → see exact dependency path in NodePanel
2. Hover path steps → corresponding edge lights up on graph
3. Right-click any source node → "What breaks?" → instant blast radius
4. Impact toast shows file count, test count, risk level
5. Health panel shows hotspots, fragile chains, circular deps from engine
6. Click hotspot → triggers break simulation
7. Click circular dep → highlights cycle on graph
