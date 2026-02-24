# Group Aggregation — Collapse/Expand with Aggregate Edges

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Groups collapse to single nodes with aggregate edges showing dependency count and thickness, solving the "too many arrows" problem without touching the engine.

**Architecture:** Visual-only aggregation layer. The real file-to-file graph is never modified. `buildCytoscapeElements()` pre-computes aggregate edges (hidden by default). A new composable `useGroupCollapse.ts` toggles visibility of children, real edges, and aggregate edges via CSS classes — no `initCytoscape()` calls, no layout recomputation. Impact mode auto-expands affected groups.

**Tech Stack:** Vue 3, Cytoscape.js, TypeScript

**Critical constraints:**
1. Aggregation is VISUAL ONLY — engine graph stays file-to-file
2. Collapse/expand = CSS class toggle, never graph rebuild
3. Aggregate edges show count label + thickness scaling
4. Impact mode auto-expands relevant groups, restores collapse on clear

---

## Task 1: Pre-compute aggregate edges in buildCytoscapeElements

**Files:**
- Modify: `src/ui/utils/buildCytoscapeElements.ts:49-139`
- Test: `tests/ui/buildElements.test.ts` (create)

**Step 1: Write the failing test**

Create `tests/ui/buildElements.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildElements } from '../../src/ui/utils/buildCytoscapeElements';
import type { Graph } from '../../src/types/graph';

describe('buildElements aggregate edges', () => {
  const graph: Graph = {
    nodes: [
      { id: 'src/a/foo.ts', label: 'foo.ts', layer: 'feature', type: 'source', functions: [], depth: 1, layerIndex: 1, fanIn: 0, size: 30 },
      { id: 'src/a/bar.ts', label: 'bar.ts', layer: 'feature', type: 'source', functions: [], depth: 1, layerIndex: 1, fanIn: 0, size: 30 },
      { id: 'src/b/baz.ts', label: 'baz.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 2, size: 30 },
      { id: 'src/b/qux.ts', label: 'qux.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 1, size: 30 },
    ],
    edges: [
      { source: 'src/a/foo.ts', target: 'src/b/baz.ts', type: 'import' },
      { source: 'src/a/bar.ts', target: 'src/b/baz.ts', type: 'import' },
      { source: 'src/a/foo.ts', target: 'src/b/qux.ts', type: 'import' },
    ],
    groups: [
      { id: 'group-a', label: 'A', nodeIds: ['src/a/foo.ts', 'src/a/bar.ts'], centralNodeId: 'src/a/foo.ts', level: 0 },
      { id: 'group-b', label: 'B', nodeIds: ['src/b/baz.ts', 'src/b/qux.ts'], centralNodeId: 'src/b/baz.ts', level: 0 },
    ],
  };

  it('outputs aggregate edges with correct count', () => {
    const elements = buildElements(graph, {
      showTests: true, showFoundation: true, sizeMode: 'fanIn', layoutMode: 'cose',
    });

    const aggEdges = elements.filter(el =>
      el.data.edgeType === 'aggregate'
    );

    expect(aggEdges.length).toBe(1); // group-a -> group-b
    const agg = aggEdges[0];
    expect(agg.data.source).toBe('group-a');
    expect(agg.data.target).toBe('group-b');
    expect(agg.data.count).toBe(3); // 3 real edges cross the boundary
    expect(agg.data.label).toBe('3');
  });

  it('does NOT create aggregate edge for intra-group edges', () => {
    const graphWithIntra: Graph = {
      ...graph,
      edges: [
        ...graph.edges,
        { source: 'src/a/foo.ts', target: 'src/a/bar.ts', type: 'import' }, // intra-group
      ],
    };
    const elements = buildElements(graphWithIntra, {
      showTests: true, showFoundation: true, sizeMode: 'fanIn', layoutMode: 'cose',
    });

    const aggEdges = elements.filter(el => el.data.edgeType === 'aggregate');
    // Only group-a -> group-b, no intra-group aggregate
    expect(aggEdges.length).toBe(1);
  });

  it('creates aggregate edge from ungrouped node to group', () => {
    const graphUngrouped: Graph = {
      nodes: [
        ...graph.nodes,
        { id: 'src/main.ts', label: 'main.ts', layer: 'page', type: 'source', functions: [], depth: 2, layerIndex: 2, fanIn: 0, size: 30 },
      ],
      edges: [
        { source: 'src/main.ts', target: 'src/a/foo.ts', type: 'import' },
      ],
      groups: graph.groups,
    };
    const elements = buildElements(graphUngrouped, {
      showTests: true, showFoundation: true, sizeMode: 'fanIn', layoutMode: 'cose',
    });

    const aggEdges = elements.filter(el => el.data.edgeType === 'aggregate');
    const mainToA = aggEdges.find(e =>
      e.data.source === 'src/main.ts' && e.data.target === 'group-a'
    );
    expect(mainToA).toBeDefined();
    expect(mainToA!.data.count).toBe(1);
  });

  it('aggregate edges have classes property set to aggregate-edge', () => {
    const elements = buildElements(graph, {
      showTests: true, showFoundation: true, sizeMode: 'fanIn', layoutMode: 'cose',
    });

    const aggEdges = elements.filter(el => el.data.edgeType === 'aggregate');
    for (const agg of aggEdges) {
      expect(agg.classes).toBe('aggregate-edge');
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/buildElements.test.ts`
Expected: FAIL — no aggregate edges in output

**Step 3: Write implementation**

In `src/ui/utils/buildCytoscapeElements.ts`, add after the `edges` array (after line 136), before the return statement (line 138):

```typescript
  // Pre-compute aggregate edges between groups (hidden by default, shown on collapse)
  const aggregateEdges = computeAggregateEdges(graph, nodeIds, nodeParentMap);

  return [...groupNodes, ...nodes, ...edges, ...aggregateEdges];
```

Remove the old return on line 138.

Add this new function at the bottom of the file:

```typescript
/**
 * Pre-computes aggregate edges between groups.
 * Each aggregate edge represents N real edges crossing a group boundary.
 * Built once, toggled via CSS classes on collapse/expand.
 */
function computeAggregateEdges(
  graph: Graph,
  nodeIds: Set<string>,
  nodeParentMap: Map<string, string>,
): cytoscape.ElementDefinition[] {
  if (!graph.groups?.length) return [];

  // Map every file to its top-level (level-0) group
  const nodeToTopGroup = new Map<string, string>();
  const level0Groups = graph.groups.filter(g => g.level === 0 || !g.parentGroupId);
  for (const group of level0Groups) {
    const allIds = getAllDescendantNodeIds(group, graph.groups);
    for (const nodeId of allIds) {
      if (nodeIds.has(nodeId)) nodeToTopGroup.set(nodeId, group.id);
    }
  }

  // Count cross-boundary edges per (source, target) pair
  const aggCounts = new Map<string, number>();
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;

    const srcGroup = nodeToTopGroup.get(edge.source);
    const tgtGroup = nodeToTopGroup.get(edge.target);

    // Skip intra-group edges
    if (srcGroup && srcGroup === tgtGroup) continue;
    // Skip if neither end is in a group
    if (!srcGroup && !tgtGroup) continue;

    const aggSrc = srcGroup ?? edge.source;
    const aggTgt = tgtGroup ?? edge.target;
    const key = `${aggSrc}\0${aggTgt}`;
    aggCounts.set(key, (aggCounts.get(key) ?? 0) + 1);
  }

  return Array.from(aggCounts.entries()).map(([key, count]) => {
    const [src, tgt] = key.split('\0');
    return {
      data: {
        id: `agg-${src}-${tgt}`,
        source: src,
        target: tgt,
        edgeType: 'aggregate',
        count,
        label: String(count),
      },
      classes: 'aggregate-edge',
    };
  });
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/buildElements.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/utils/buildCytoscapeElements.ts tests/ui/buildElements.test.ts
git commit -m "feat: pre-compute aggregate edges between groups in buildElements"
```

---

## Task 2: Add CSS styles for collapsed groups and aggregate edges

**Files:**
- Modify: `src/ui/utils/graphStyles.ts:422-455` (append new selectors)

**Step 1: Write implementation**

Add these selectors at the end of the stylesheet array in `getStylesheet()`, before the closing `];` (after line 453):

```typescript
    // ── Group collapse/expand ──────────────────────────────────────────
    // Collapsed group — fixed size, centered label with file count
    {
      selector: 'node[type="group"].group-collapsed',
      style: {
        'padding': '30px',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': '120px',
        'label': 'data(collapsedLabel)',
        'background-opacity': 0.25,
        'border-width': 3,
        'font-size': '12px',
      } as unknown as cytoscape.Css.Node,
    },
    // Children of collapsed group — hidden
    {
      selector: 'node.collapsed-child',
      style: {
        'display': 'none',
      } as unknown as cytoscape.Css.Node,
    },
    // Edges touching collapsed children — hidden
    {
      selector: 'edge.collapsed-edge',
      style: {
        'display': 'none',
      } as unknown as cytoscape.Css.Edge,
    },
    // Aggregate edges — hidden by default
    {
      selector: 'edge.aggregate-edge',
      style: {
        'display': 'none',
      } as unknown as cytoscape.Css.Edge,
    },
    // Aggregate edges — visible when groups are collapsed
    {
      selector: 'edge.aggregate-edge.aggregate-visible',
      style: {
        'display': 'element',
        'width': 'mapData(count, 1, 20, 2.5, 8)',
        'line-color': '#818cf8',
        'target-arrow-color': '#818cf8',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.8,
        'opacity': 0.7,
        'curve-style': 'bezier',
        'label': 'data(label)',
        'color': '#e2e8f0',
        'font-size': '10px',
        'text-background-color': '#0f172a',
        'text-background-opacity': 0.9,
        'text-background-padding': '3px',
        'text-rotation': 'autorotate',
        'z-index': 10,
      } as unknown as cytoscape.Css.Edge,
    },
```

**Step 2: Verify build compiles**

Run: `npm run build:ui`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/ui/utils/graphStyles.ts
git commit -m "style: add CSS selectors for collapsed groups and aggregate edges"
```

---

## Task 3: Create useGroupCollapse composable

**Files:**
- Create: `src/ui/composables/useGroupCollapse.ts`
- Test: `tests/ui/useGroupCollapse.test.ts` (create)

**Step 1: Write the failing test**

Create `tests/ui/useGroupCollapse.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  getCollapsedGroups,
  shouldShowAggregateEdge,
} from '../../src/ui/composables/useGroupCollapse';

describe('useGroupCollapse', () => {
  describe('shouldShowAggregateEdge', () => {
    const groupIds = new Set(['group-a', 'group-b', 'group-c']);

    it('shows edge when both groups are collapsed', () => {
      const collapsed = new Set(['group-a', 'group-b']);
      expect(shouldShowAggregateEdge('group-a', 'group-b', collapsed, groupIds)).toBe(true);
    });

    it('shows edge when one group is collapsed and other end is a node', () => {
      const collapsed = new Set(['group-a']);
      expect(shouldShowAggregateEdge('group-a', 'src/main.ts', collapsed, groupIds)).toBe(true);
    });

    it('hides edge when source group is expanded', () => {
      const collapsed = new Set(['group-b']);
      expect(shouldShowAggregateEdge('group-a', 'group-b', collapsed, groupIds)).toBe(false);
    });

    it('hides edge when no groups are collapsed', () => {
      const collapsed = new Set<string>();
      expect(shouldShowAggregateEdge('group-a', 'group-b', collapsed, groupIds)).toBe(false);
    });
  });

  describe('getCollapsedGroups', () => {
    it('returns the current set', () => {
      const set = getCollapsedGroups();
      expect(set).toBeInstanceOf(Set);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/useGroupCollapse.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

Create `src/ui/composables/useGroupCollapse.ts`:

```typescript
import type cytoscape from 'cytoscape';

/** Set of currently collapsed group IDs. Module-level state (like lockedHubId). */
const collapsedGroups = new Set<string>();

/** IDs of groups that were auto-expanded for impact mode. */
const impactExpandedGroups = new Set<string>();

/** All group IDs in the current graph, set during init. */
let allGroupIds = new Set<string>();

/** Read-only access to collapsed state. */
export function getCollapsedGroups(): ReadonlySet<string> {
  return collapsedGroups;
}

/** Initialize: discover all group IDs from the Cytoscape instance. */
export function initGroupCollapse(instance: cytoscape.Core): void {
  allGroupIds = new Set<string>();
  instance.nodes('[type="group"]').forEach((g: cytoscape.NodeSingular) => {
    if (g.data('level') === 0 || !g.data('parentGroupId')) {
      allGroupIds.add(g.id());
    }
  });
}

/** Collapse all top-level groups (default state after layout). */
export function collapseAllGroups(instance: cytoscape.Core): void {
  for (const groupId of allGroupIds) {
    collapseGroup(instance, groupId);
  }
}

/** Collapse a single group. */
export function collapseGroup(instance: cytoscape.Core, groupId: string): void {
  if (collapsedGroups.has(groupId)) return;
  collapsedGroups.add(groupId);

  const group = instance.getElementById(groupId) as cytoscape.NodeSingular;
  if (!group.length) return;

  // Hide all descendants (includes subgroups + their children)
  const descendants = group.descendants().not('[type="group"]');
  descendants.addClass('collapsed-child');

  // Also hide subgroup containers
  group.descendants('[type="group"]').addClass('collapsed-child');

  // Hide real edges touching hidden nodes
  descendants.connectedEdges().not('.aggregate-edge').addClass('collapsed-edge');

  // Update group label
  const originalLabel = group.data('label') as string;
  group.data('collapsedLabel', `${originalLabel}\n${descendants.length} files`);
  group.addClass('group-collapsed');

  // Update aggregate edge visibility globally
  refreshAggregateEdges(instance);
}

/** Expand a single group. */
export function expandGroup(instance: cytoscape.Core, groupId: string): void {
  if (!collapsedGroups.has(groupId)) return;
  collapsedGroups.delete(groupId);

  const group = instance.getElementById(groupId) as cytoscape.NodeSingular;
  if (!group.length) return;

  // Show descendants
  const descendants = group.descendants().not('[type="group"]');
  descendants.removeClass('collapsed-child');

  // Show subgroup containers
  group.descendants('[type="group"]').removeClass('collapsed-child');

  // Restore real edges — but only if the OTHER end is also visible
  descendants.connectedEdges().not('.aggregate-edge').forEach((e: cytoscape.EdgeSingular) => {
    const otherEnd = e.source().id() === e.target().id()
      ? e.source() : (descendants.contains(e.source()) ? e.target() : e.source());
    // Only show edge if other end is not in a collapsed group
    if (!otherEnd.hasClass('collapsed-child')) {
      e.removeClass('collapsed-edge');
    }
  });

  group.removeClass('group-collapsed');

  refreshAggregateEdges(instance);
}

/** Toggle collapse/expand for a group. */
export function toggleGroup(instance: cytoscape.Core, groupId: string): void {
  if (collapsedGroups.has(groupId)) {
    expandGroup(instance, groupId);
  } else {
    collapseGroup(instance, groupId);
  }
}

/** Recalculate which aggregate edges should be visible. */
function refreshAggregateEdges(instance: cytoscape.Core): void {
  instance.edges('.aggregate-edge').forEach((e: cytoscape.EdgeSingular) => {
    const src = e.data('source') as string;
    const tgt = e.data('target') as string;
    if (shouldShowAggregateEdge(src, tgt, collapsedGroups, allGroupIds)) {
      e.addClass('aggregate-visible');
    } else {
      e.removeClass('aggregate-visible');
    }
  });
}

/**
 * Determines if an aggregate edge should be visible.
 * An aggregate edge is shown when at least one of its group endpoints is collapsed.
 * If a group endpoint is expanded, the edge stays hidden (real edges are visible instead).
 * Exported for unit testing.
 */
export function shouldShowAggregateEdge(
  src: string,
  tgt: string,
  collapsed: ReadonlySet<string>,
  groupIds: ReadonlySet<string>,
): boolean {
  const srcIsGroup = groupIds.has(src);
  const tgtIsGroup = groupIds.has(tgt);

  // At least one end must be a group
  if (!srcIsGroup && !tgtIsGroup) return false;

  // If a group end exists but is NOT collapsed, hide this aggregate
  if (srcIsGroup && !collapsed.has(src)) return false;
  if (tgtIsGroup && !collapsed.has(tgt)) return false;

  return true;
}

// ── Impact mode integration ───────────────────────────────────────────

/**
 * Auto-expand groups containing affected nodes before impact highlighting.
 * Stores which groups were expanded so they can be re-collapsed on clear.
 */
export function expandGroupsForImpact(
  instance: cytoscape.Core,
  affectedNodeIds: Set<string>,
): void {
  impactExpandedGroups.clear();

  for (const groupId of collapsedGroups) {
    const group = instance.getElementById(groupId) as cytoscape.NodeSingular;
    if (!group.length) continue;

    // Check if any affected node is a descendant of this group
    const hasAffected = group.descendants().some(
      (n: cytoscape.NodeSingular) => affectedNodeIds.has(n.id()),
    );

    if (hasAffected) {
      impactExpandedGroups.add(groupId);
    }
  }

  // Expand affected groups (iterate copy since expandGroup modifies the set)
  for (const groupId of impactExpandedGroups) {
    expandGroup(instance, groupId);
  }
}

/**
 * Re-collapse groups that were auto-expanded for impact mode.
 */
export function restoreGroupsAfterImpact(instance: cytoscape.Core): void {
  for (const groupId of impactExpandedGroups) {
    collapseGroup(instance, groupId);
  }
  impactExpandedGroups.clear();
}

/**
 * Reset all collapse state. Called when graph is reinitialized.
 */
export function resetCollapseState(): void {
  collapsedGroups.clear();
  impactExpandedGroups.clear();
  allGroupIds.clear();
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/useGroupCollapse.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/composables/useGroupCollapse.ts tests/ui/useGroupCollapse.test.ts
git commit -m "feat: create useGroupCollapse composable with collapse/expand + impact integration"
```

---

## Task 4: Wire up collapse in GraphView.vue and useGraphInteractions.ts

**Files:**
- Modify: `src/ui/components/GraphView.vue:1-10` (imports), `142-188` (initCytoscape), `168-179` (layoutstop)
- Modify: `src/ui/composables/useGraphInteractions.ts:107-111` (bindGraphInteractions), `157-207` (group click)

### Step 1: Update GraphView.vue imports

At `src/ui/components/GraphView.vue:9`, add the import:

```typescript
import {
  initGroupCollapse,
  collapseAllGroups,
  resetCollapseState,
} from '../composables/useGroupCollapse.js';
```

### Step 2: Wire up in initCytoscape and layoutstop

In `initCytoscape()` at line 142, after `cy.value.destroy()` (line 146-147), add:

```typescript
    resetCollapseState();
```

In the `layoutstop` callback (line 168-179), after `detectHubs(instance)` (line 178), add:

```typescript
    // Initialize and collapse all groups (default state)
    initGroupCollapse(instance);
    collapseAllGroups(instance);
```

### Step 3: Update group click handler in useGraphInteractions.ts

At `src/ui/composables/useGraphInteractions.ts:1`, add import:

```typescript
import { expandGroup, collapseGroup, getCollapsedGroups } from './useGroupCollapse.js';
```

Replace the group click handler (lines 157-207) with:

```typescript
  // Click group — collapsed: expand. Expanded: focus mode. Right-click: collapse.
  instance.on('tap', 'node[type="group"]', (evt) => {
    const target = evt.target as cytoscape.NodeSingular;
    const groupId = target.id();

    // Collapsed group → expand on click
    if (target.hasClass('group-collapsed')) {
      expandGroup(instance, groupId);
      return;
    }

    // Expanded group → existing focus mode toggle
    if (target.hasClass('group-focused')) {
      clearFocusMode(instance);
      instance.animate({
        fit: { eles: instance.elements(), padding: 40 },
        duration: 400,
        easing: 'ease-out-cubic',
      });
      return;
    }

    // Focus this group — also clear node selection
    clearFocusMode(instance);
    instance.elements().removeClass('selected-node selected-neighbor selected-connected selected-dimmed');
    target.addClass('group-focused');

    // Children of focused group (recursive — includes nested subgroups)
    const children = target.descendants();

    // Dim other groups, but NOT subgroups inside the focused parent
    const childGroupIds = new Set(children.filter('[type="group"]').map((n: cytoscape.NodeSingular) => n.id()));
    instance.nodes('[type="group"]').forEach((g: cytoscape.NodeSingular) => {
      if (g.id() !== target.id() && !childGroupIds.has(g.id())) {
        g.addClass('group-dimmed');
      }
    });
    const childIds = new Set(children.map((n: cytoscape.NodeSingular) => n.id()));

    // Dim non-member nodes
    instance.nodes().not('[type="group"]').forEach((n: cytoscape.NodeSingular) => {
      if (!childIds.has(n.id())) n.addClass('group-faded');
    });

    // Dim unrelated edges
    instance.edges().forEach((e: cytoscape.EdgeSingular) => {
      const connected = childIds.has(e.source().id()) || childIds.has(e.target().id());
      if (!connected) e.addClass('group-faded');
    });

    // Zoom to fit the group
    const groupEles = children.add(target);
    instance.animate({
      fit: { eles: groupEles, padding: 60 },
      duration: 400,
      easing: 'ease-out-cubic',
    });
  });

  // Right-click group — collapse expanded group
  instance.on('cxttap', 'node[type="group"]', (evt) => {
    const target = evt.target as cytoscape.NodeSingular;
    if (!target.hasClass('group-collapsed') && (target.data('level') === 0 || !target.data('parentGroupId'))) {
      collapseGroup(instance, target.id());
    }
  });
```

### Step 4: Verify build

Run: `npm run build:ui`
Expected: Build succeeds

### Step 5: Commit

```bash
git add src/ui/components/GraphView.vue src/ui/composables/useGraphInteractions.ts
git commit -m "feat: wire up group collapse — default collapsed, click to expand, right-click to collapse"
```

---

## Task 5: Integrate collapse with impact mode

**Files:**
- Modify: `src/ui/utils/highlightUtils.ts:1-3` (imports), `9-58` (applyHighlight)

### Step 1: Add import

At `src/ui/utils/highlightUtils.ts:3`, add to existing imports:

```typescript
import { expandGroupsForImpact, restoreGroupsAfterImpact } from '../composables/useGroupCollapse.js';
```

### Step 2: Auto-expand on impact

In `applyHighlight()`, after computing `affectedNodeIds` (after line 36, before marking unaffected at line 38), add:

```typescript
  // Auto-expand collapsed groups containing affected nodes
  expandGroupsForImpact(instance, affectedNodeIds);
```

### Step 3: Restore on impact clear

In the `if (!result)` early return block (lines 25-28), before `restoreHubEdges(instance)`, add:

```typescript
    restoreGroupsAfterImpact(instance);
```

### Step 4: Run existing tests

Run: `npx vitest run`
Expected: All existing tests still pass

### Step 5: Commit

```bash
git add src/ui/utils/highlightUtils.ts
git commit -m "feat: auto-expand collapsed groups on impact analysis, restore on clear"
```

---

## Task 6: Visual verification with demo project

**Step 1: Build and scan demo**

Run:
```bash
npm run build:cli && npx tsx src/cli/index.ts scan demo
```

Expected: Scan completes, shows groups count.

**Step 2: Launch dev server**

Run:
```bash
npm run dev:ui
```

Open browser at localhost.

**Step 3: Verify default collapsed state**

Expected:
- Groups appear as compact boxes with labels like "Combat\n8 files"
- Aggregate edges visible between collapsed groups with count labels (e.g., "12")
- Aggregate edges have varying thickness (thicker = more real edges)
- Individual file nodes are hidden inside collapsed groups
- Far fewer visible edges than before — the main UX improvement

**Step 4: Verify expand on click**

Click a collapsed group.
Expected:
- Group expands to show individual file nodes
- Aggregate edges involving this group disappear
- Real file-to-file edges appear
- Hub nodes within the group show their hub badges

**Step 5: Verify collapse on right-click**

Right-click the expanded group.
Expected:
- Group collapses back to compact box
- Real edges hidden, aggregate edges restored

**Step 6: Verify impact mode integration**

Select a file (e.g., `damageCalculator.ts`) and run impact analysis.
Expected:
- Relevant groups auto-expand to show affected files
- Impact highlighting works as before (red/amber/dimmed)
- When impact clears, groups re-collapse to their previous state

**Step 7: Commit verification**

If everything looks correct:
```bash
git add -A
git commit -m "test: verify group aggregation with demo project"
```

---

## Summary of all file changes

| File | Action | LOC delta | Purpose |
|------|--------|-----------|---------|
| `src/ui/utils/buildCytoscapeElements.ts` | Modify | +45 | Pre-compute aggregate edges |
| `src/ui/utils/graphStyles.ts` | Modify | +50 | CSS for collapsed/aggregate states |
| `src/ui/composables/useGroupCollapse.ts` | Create | ~150 | Collapse/expand state machine |
| `src/ui/components/GraphView.vue` | Modify | +8 | Wire up default-collapsed on layoutstop |
| `src/ui/composables/useGraphInteractions.ts` | Modify | +15 | Expand on click, collapse on right-click |
| `src/ui/utils/highlightUtils.ts` | Modify | +4 | Impact auto-expand/restore |
| `tests/ui/buildElements.test.ts` | Create | ~65 | Aggregate edge computation tests |
| `tests/ui/useGroupCollapse.test.ts` | Create | ~40 | Collapse visibility logic tests |

**What doesn't change:** Engine, scanner, types, CLI, graph.json format, layout algorithm, hub detection, progressive disclosure, edge animation.
