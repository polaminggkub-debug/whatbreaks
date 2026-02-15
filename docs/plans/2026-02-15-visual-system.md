# Visual System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add dependency-depth layering, fan-in-based node sizing, and architectural color system to the graph visualization.

**Architecture:** Extend the scanner pipeline to compute `depth`, `layerIndex`, `fanIn`, and `size` per node at scan time. Persist in `graph.json`. UI reads these fields to drive dagre layout rank, node size, and base color. Runtime failure overlay is unchanged (already works).

**Tech Stack:** TypeScript, ts-morph (scanner), Cytoscape.js + cytoscape-dagre (UI), Vue 3

**Spec:** `SPEC_VISUAL.md`

---

## Task 1: Extend GraphNode Type

**Files:**
- Modify: `src/types/graph.ts:7-13`

**Step 1: Add new fields to GraphNode**

```typescript
export interface GraphNode {
  id: string;
  label: string;
  layer: NodeLayer;
  type: NodeType;
  functions: string[];
  // Visual system computed fields
  depth: number;
  layerIndex: number;
  fanIn: number;
  size: number;
}
```

**Step 2: Verify build still compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Type errors in scanner/index.ts (nodes missing new fields) — that's correct, we'll fix in Task 3.

**Step 3: Commit**

```bash
git add src/types/graph.ts
git commit -m "feat(types): add depth, layerIndex, fanIn, size to GraphNode"
```

---

## Task 2: Create Graph Metrics Module

**Files:**
- Create: `src/engine/metrics.ts`

This module computes all visual system metrics from a Graph. It runs at scan time (called from scanner) and can be tested independently.

**Step 1: Write the module**

```typescript
import type { Graph, GraphNode } from '../types/graph.js';

/**
 * Compute visual metrics for all nodes in the graph.
 * Mutates nodes in-place, adding: depth, layerIndex, fanIn, size.
 */
export function computeVisualMetrics(graph: Graph): void {
  const importAdj = buildImportAdjacency(graph);
  const importedByAdj = buildImportedByAdjacency(graph);

  // 1. Compute fan-in
  const fanInMap = computeFanIn(graph, importedByAdj);

  // 2. Compute depth (longest path, with SCC for cycles)
  const depthMap = computeDepth(graph, importAdj);

  // 3. Bucket into layerIndex
  const maxDepth = Math.max(0, ...Array.from(depthMap.values()));
  const bucketSize = maxDepth > 0 ? Math.ceil(maxDepth / 4) : 1;

  // 4. Assign to nodes
  for (const node of graph.nodes) {
    const fanIn = fanInMap.get(node.id) ?? 0;
    const depth = depthMap.get(node.id) ?? 0;

    node.fanIn = fanIn;
    node.depth = depth;
    node.layerIndex = node.type === 'test'
      ? -1  // Tests are separate from layering
      : Math.min(3, Math.floor(depth / bucketSize));
    node.size = Math.round(30 + Math.log2(fanIn + 1) * 12);
  }
}

/** Build adjacency: nodeId -> [nodes it imports] */
function buildImportAdjacency(graph: Graph): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) adj.set(node.id, []);
  for (const edge of graph.edges) {
    if (edge.type === 'import') {
      adj.get(edge.source)?.push(edge.target);
    }
  }
  return adj;
}

/** Build reverse adjacency: nodeId -> [nodes that import it] */
function buildImportedByAdjacency(graph: Graph): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) adj.set(node.id, []);
  for (const edge of graph.edges) {
    if (edge.type === 'import') {
      adj.get(edge.target)?.push(edge.source);
    }
  }
  return adj;
}

/** Fan-in = number of direct importers (source nodes only) */
function computeFanIn(
  graph: Graph,
  importedBy: Map<string, string[]>,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const node of graph.nodes) {
    const importers = importedBy.get(node.id) ?? [];
    // Count only non-test importers for fan-in
    result.set(node.id, importers.length);
  }
  return result;
}

/**
 * Compute depth = longest dependency path for each node.
 * Uses Tarjan's SCC to handle cycles, then topological sort on DAG.
 */
function computeDepth(
  graph: Graph,
  importAdj: Map<string, string[]>,
): Map<string, number> {
  const nodeIds = graph.nodes
    .filter(n => n.type !== 'test')
    .map(n => n.id);

  // Step 1: Find SCCs using Tarjan's algorithm
  const sccs = tarjanSCC(nodeIds, importAdj);

  // Step 2: Map each node to its SCC index
  const nodeToScc = new Map<string, number>();
  for (let i = 0; i < sccs.length; i++) {
    for (const nodeId of sccs[i]) {
      nodeToScc.set(nodeId, i);
    }
  }

  // Step 3: Build DAG of SCCs
  const sccAdj = new Map<number, Set<number>>();
  for (let i = 0; i < sccs.length; i++) sccAdj.set(i, new Set());

  for (const nodeId of nodeIds) {
    const sccIdx = nodeToScc.get(nodeId)!;
    for (const dep of (importAdj.get(nodeId) ?? [])) {
      const depScc = nodeToScc.get(dep);
      if (depScc !== undefined && depScc !== sccIdx) {
        sccAdj.get(sccIdx)!.add(depScc);
      }
    }
  }

  // Step 4: Compute depth on SCC DAG via memoized DFS
  const sccDepth = new Map<number, number>();

  function getSccDepth(sccIdx: number): number {
    if (sccDepth.has(sccIdx)) return sccDepth.get(sccIdx)!;

    sccDepth.set(sccIdx, 0); // Prevent infinite recursion (shouldn't happen in DAG)
    let maxChildDepth = -1;

    for (const childScc of sccAdj.get(sccIdx) ?? []) {
      maxChildDepth = Math.max(maxChildDepth, getSccDepth(childScc));
    }

    const depth = maxChildDepth + 1;
    sccDepth.set(sccIdx, depth);
    return depth;
  }

  for (let i = 0; i < sccs.length; i++) getSccDepth(i);

  // Step 5: Map SCC depth back to nodes
  const result = new Map<string, number>();
  for (const node of graph.nodes) {
    if (node.type === 'test') {
      result.set(node.id, 0);
    } else {
      const sccIdx = nodeToScc.get(node.id);
      result.set(node.id, sccIdx !== undefined ? (sccDepth.get(sccIdx) ?? 0) : 0);
    }
  }

  return result;
}

/**
 * Tarjan's SCC algorithm.
 * Returns array of SCCs (each SCC is an array of node IDs).
 */
function tarjanSCC(
  nodeIds: string[],
  adj: Map<string, string[]>,
): string[][] {
  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const nodeIndex = new Map<string, number>();
  const nodeLowlink = new Map<string, number>();
  const sccs: string[][] = [];

  function strongConnect(v: string): void {
    nodeIndex.set(v, index);
    nodeLowlink.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    for (const w of (adj.get(v) ?? [])) {
      // Only consider nodes in our set (skip test nodes etc.)
      if (!nodeIds.includes(w) && !nodeIndex.has(w)) continue;

      if (!nodeIndex.has(w)) {
        strongConnect(w);
        nodeLowlink.set(v, Math.min(nodeLowlink.get(v)!, nodeLowlink.get(w)!));
      } else if (onStack.has(w)) {
        nodeLowlink.set(v, Math.min(nodeLowlink.get(v)!, nodeIndex.get(w)!));
      }
    }

    if (nodeLowlink.get(v) === nodeIndex.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  for (const v of nodeIds) {
    if (!nodeIndex.has(v)) {
      strongConnect(v);
    }
  }

  return sccs;
}
```

**Step 2: Export from engine barrel**

Add to `src/engine/index.ts`:
```typescript
export { computeVisualMetrics } from './metrics.js';
```

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 4: Commit**

```bash
git add src/engine/metrics.ts src/engine/index.ts
git commit -m "feat(engine): add visual metrics computation (depth, fanIn, layerIndex, size)"
```

---

## Task 3: Integrate Metrics into Scanner

**Files:**
- Modify: `src/scanner/index.ts:85-92` (node creation) and end of `scanRepository`

**Step 1: Import and call computeVisualMetrics**

At top of `src/scanner/index.ts`, add import:
```typescript
import { computeVisualMetrics } from '../engine/metrics.js';
```

In the node creation loop (~line 85), add default values so the type is satisfied:
```typescript
    nodes.push({
      id: filePath,
      label,
      layer,
      type: nodeType,
      functions,
      depth: 0,
      layerIndex: 0,
      fanIn: 0,
      size: 30,
    });
```

Before the final `return { nodes, edges }` (~line 116), add:
```typescript
  // Step 6: Compute visual metrics (depth, layerIndex, fanIn, size)
  const graph: Graph = { nodes, edges };
  computeVisualMetrics(graph);

  return graph;
```

Remove the old return statement.

**Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: Clean compile

**Step 3: Test with demo project**

Run: `node dist/cli.js scan demo/`
Then: `cat .whatbreaks/graph.json | node -e "const g=require('fs').readFileSync('/dev/stdin','utf8'); const n=JSON.parse(g).nodes; console.log(n.slice(0,3).map(x=>({id:x.id,depth:x.depth,layerIndex:x.layerIndex,fanIn:x.fanIn,size:x.size})))"`

Expected: Nodes have non-zero depth/layerIndex/fanIn values. The hub file `damageCalculator.ts` should have high fanIn.

**Step 4: Commit**

```bash
git add src/scanner/index.ts
git commit -m "feat(scanner): compute visual metrics at scan time"
```

---

## Task 4: Install cytoscape-dagre

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Install dagre layout plugin**

Run: `npm install cytoscape-dagre`

Check types: `npm install -D @types/cytoscape-dagre 2>/dev/null || echo "No types package — will use any"`

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add cytoscape-dagre layout plugin"
```

---

## Task 5: Update Constants (Layer Colors)

**Files:**
- Modify: `src/ui/utils/constants.ts`

**Step 1: Add depth-based layer colors and update LAYERS array**

Replace entire file:
```typescript
/** Path-based layer colors (existing, used for NodePanel badge) */
export const LAYER_COLORS: Record<string, string> = {
  page: '#6366f1',
  ui: '#3b82f6',
  feature: '#8b5cf6',
  entity: '#a855f7',
  shared: '#06b6d4',
  test: '#64748b',
  config: '#64748b',
};

/** Depth-based architectural layer colors (for graph nodes) */
export const DEPTH_LAYER_COLORS: Record<number, string> = {
  0: '#14b8a6',  // Foundation — Teal
  1: '#3b82f6',  // Core — Blue
  2: '#a855f7',  // Feature — Purple
  3: '#1e40af',  // Entry — Dark Blue
  [-1]: '#64748b', // Test — Gray-blue (layerIndex = -1)
};

/** Depth-based layer labels */
export const DEPTH_LAYER_LABELS: Record<number, string> = {
  0: 'Foundation',
  1: 'Core',
  2: 'Feature',
  3: 'Entry',
  [-1]: 'Test',
};

export const IMPACT_COLORS: Record<string, string> = {
  root: '#ef4444',
  direct: '#f59e0b',
  indirect: '#eab308',
  unaffected: '#64748b',
};

export const LAYERS = [
  { key: 'page', label: 'Page', color: '#6366f1' },
  { key: 'ui', label: 'UI', color: '#3b82f6' },
  { key: 'feature', label: 'Feature', color: '#8b5cf6' },
  { key: 'entity', label: 'Entity', color: '#a855f7' },
  { key: 'shared', label: 'Shared', color: '#06b6d4' },
  { key: 'test', label: 'Test', color: '#14b8a6' },
  { key: 'config', label: 'Config', color: '#64748b' },
] as const;

/** Depth-based layers for the legend (replaces LAYERS when dagre active) */
export const DEPTH_LAYERS = [
  { key: 0, label: 'Foundation', color: '#14b8a6' },
  { key: 1, label: 'Core', color: '#3b82f6' },
  { key: 2, label: 'Feature', color: '#a855f7' },
  { key: 3, label: 'Entry', color: '#1e40af' },
  { key: -1, label: 'Test', color: '#64748b' },
] as const;

export const IMPACTS = [
  { key: 'root', label: 'Root', color: '#ef4444' },
  { key: 'direct', label: 'Direct', color: '#f59e0b' },
  { key: 'indirect', label: 'Indirect', color: '#eab308' },
] as const;
```

**Step 2: Verify UI build**

Run: `cd src/ui && npx vue-tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/ui/utils/constants.ts
git commit -m "feat(ui): add depth-based layer colors and labels"
```

---

## Task 6: Update GraphView — Layout, Size, Color

**Files:**
- Modify: `src/ui/components/GraphView.vue`

This is the largest change. We need to:
1. Register cytoscape-dagre
2. Add a `layout` prop (or reactive state) for toggling dagre/cose
3. Use `data(size)` for node width/height
4. Use depth-based color for `border-color`
5. Use dagre layout with `rank` from `layerIndex`

**Step 1: Register dagre plugin**

At top of `<script setup>`, after cytoscape import:
```typescript
import cyDagre from 'cytoscape-dagre';
cytoscape.use(cyDagre);
```

**Step 2: Add layout toggle state**

```typescript
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue';

const layoutMode = ref<'dagre' | 'cose'>('dagre');
```

Expose it so parent can control later (or keep internal for now).

**Step 3: Update buildElements to pass new data fields**

```typescript
function buildElements(graph: Graph) {
  const nodes = graph.nodes.map(n => ({
    data: {
      id: n.id,
      label: n.label,
      layer: n.layer,
      type: n.type,
      functions: n.functions,
      layerOrder: LAYER_ORDER[n.layer] ?? 99,
      color: DEPTH_LAYER_COLORS[n.layerIndex ?? 0] ?? '#64748b',
      icon: getFileIcon(n.id, n.type),
      nodeSize: n.size ?? 36,
      layerIndex: n.layerIndex ?? 0,
      fanIn: n.fanIn ?? 0,
      depth: n.depth ?? 0,
    },
  }));

  // ... edges same as before
}
```

Import `DEPTH_LAYER_COLORS` from constants (replace `LAYER_COLORS` import for graph coloring).

**Step 4: Update node style to use dynamic size**

In `getStylesheet()`, update the base node selector:
```typescript
{
  selector: 'node',
  style: {
    'background-color': '#1e293b',
    'background-image': 'data(icon)',
    'background-fit': 'contain',
    'background-clip': 'none',
    'background-width': '70%',
    'background-height': '70%',
    'label': 'data(label)',
    'color': '#e2e8f0',
    'font-size': '10px',
    'text-valign': 'bottom',
    'text-halign': 'center',
    'text-margin-y': 6,
    'width': 'data(nodeSize)',       // <-- dynamic
    'height': 36,                     // keep height fixed
    'shape': 'roundrectangle',
    'border-width': 2,
    'border-color': 'data(color)',    // <-- already uses data(color), now depth-based
    'border-opacity': 0.6,
    'text-wrap': 'ellipsis',
    'text-max-width': '80px',
    'overlay-padding': 4,
    'transition-property': 'background-color, border-color, opacity, border-width',
    'transition-duration': 250,
  } as unknown as cytoscape.Css.Node,
},
```

**Step 5: Update initCytoscape to use dagre layout**

Replace the layout config in `initCytoscape()`:
```typescript
const layoutConfig = layoutMode.value === 'dagre'
  ? {
      name: 'dagre',
      rankDir: 'BT',          // Bottom to Top (Foundation at bottom, Entry at top)
      nodeSep: 50,
      edgeSep: 10,
      rankSep: 80,
      animate: !prefersReducedMotion,
      animationDuration: prefersReducedMotion ? 0 : 800,
      fit: true,
      padding: 40,
      // Use layerIndex as rank for vertical positioning
      rank: (node: any) => node.data('layerIndex'),
    }
  : {
      name: 'cose',
      animate: !prefersReducedMotion,
      animationDuration: prefersReducedMotion ? 0 : 800,
      padding: 40,
      nodeRepulsion: () => nodeCount > 100 ? 8000 : 4500,
      idealEdgeLength: () => nodeCount > 100 ? 120 : 80,
      edgeElasticity: () => 100,
      gravity: 0.25,
      numIter: 1000,
      nodeDimensionsIncludeLabels: true,
      fit: true,
      randomize: false,
    };
```

Use `layoutConfig` in cytoscape constructor.

**Step 6: Watch layoutMode to re-layout**

```typescript
watch(layoutMode, () => {
  if (!cy.value) return;
  const nodeCount = props.graph.nodes.length;
  // Re-run layout
  const layoutConfig = layoutMode.value === 'dagre'
    ? { /* same dagre config */ }
    : { /* same cose config */ };
  cy.value.layout(layoutConfig as any).run();
});
```

**Step 7: Build and verify**

Run: `npm run build:ui`
Expected: Clean build

**Step 8: Commit**

```bash
git add src/ui/components/GraphView.vue
git commit -m "feat(ui): dagre layout with depth-based layering and dynamic node size"
```

---

## Task 7: Update Legend Component

**Files:**
- Modify: `src/ui/components/Legend.vue`

**Step 1: Show depth-based layers**

Import `DEPTH_LAYERS` from constants. Replace the layer legend:

```vue
<script setup lang="ts">
import { DEPTH_LAYERS, IMPACTS } from '../utils/constants';
</script>

<template>
  <div class="legend">
    <div class="legend-group">
      <span class="legend-title">Layers:</span>
      <div v-for="item in DEPTH_LAYERS" :key="item.key" class="legend-item">
        <span class="legend-dot" :style="{ background: item.color }"></span>
        <span class="legend-label">{{ item.label }}</span>
      </div>
    </div>
    <div class="legend-separator"></div>
    <div class="legend-group">
      <span class="legend-title">Impact:</span>
      <div v-for="item in IMPACTS" :key="item.key" class="legend-item">
        <span class="legend-dot" :style="{ background: item.color }"></span>
        <span class="legend-label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>
```

Style stays the same.

**Step 2: Commit**

```bash
git add src/ui/components/Legend.vue
git commit -m "feat(ui): update legend to show depth-based architectural layers"
```

---

## Task 8: Add UI Toggle Controls

**Files:**
- Create: `src/ui/components/ViewControls.vue`
- Modify: `src/ui/App.vue`

**Step 1: Create ViewControls component**

```vue
<script setup lang="ts">
defineProps<{
  layout: 'dagre' | 'cose';
  showTests: boolean;
  showFoundation: boolean;
  sizeMode: 'fanIn' | 'uniform';
}>();

const emit = defineEmits<{
  'update:layout': [value: 'dagre' | 'cose'];
  'update:showTests': [value: boolean];
  'update:showFoundation': [value: boolean];
  'update:sizeMode': [value: 'fanIn' | 'uniform'];
}>();
</script>

<template>
  <div class="view-controls">
    <button
      class="ctrl-btn"
      :class="{ active: layout === 'dagre' }"
      @click="emit('update:layout', layout === 'dagre' ? 'cose' : 'dagre')"
      :title="layout === 'dagre' ? 'Switch to force layout' : 'Switch to layered layout'"
    >
      {{ layout === 'dagre' ? 'Layered' : 'Force' }}
    </button>

    <button
      class="ctrl-btn"
      :class="{ active: !showTests }"
      @click="emit('update:showTests', !showTests)"
      title="Toggle test nodes"
    >
      Tests {{ showTests ? 'ON' : 'OFF' }}
    </button>

    <button
      class="ctrl-btn"
      :class="{ active: !showFoundation }"
      @click="emit('update:showFoundation', !showFoundation)"
      title="Toggle foundation layer"
    >
      Foundation {{ showFoundation ? 'ON' : 'OFF' }}
    </button>

    <button
      class="ctrl-btn"
      :class="{ active: sizeMode === 'uniform' }"
      @click="emit('update:sizeMode', sizeMode === 'fanIn' ? 'uniform' : 'fanIn')"
      title="Toggle node size mode"
    >
      Size: {{ sizeMode === 'fanIn' ? 'Fan-in' : 'Uniform' }}
    </button>
  </div>
</template>

<style scoped>
.view-controls {
  display: flex;
  gap: 6px;
}

.ctrl-btn {
  background: #334155;
  color: #94a3b8;
  border: 1px solid #475569;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.ctrl-btn:hover {
  background: #475569;
  color: #e2e8f0;
}

.ctrl-btn.active {
  background: #1e40af;
  border-color: #3b82f6;
  color: #e2e8f0;
}
</style>
```

**Step 2: Add ViewControls to App.vue topbar**

In `App.vue`, import ViewControls and add reactive state:

```typescript
import ViewControls from './components/ViewControls.vue';

const layoutMode = ref<'dagre' | 'cose'>('dagre');
const showTests = ref(true);
const showFoundation = ref(true);
const sizeMode = ref<'fanIn' | 'uniform'>('fanIn');
```

Add to template (in topbar, after SearchBar):
```vue
<ViewControls
  :layout="layoutMode"
  :showTests="showTests"
  :showFoundation="showFoundation"
  :sizeMode="sizeMode"
  @update:layout="layoutMode = $event"
  @update:showTests="showTests = $event"
  @update:showFoundation="showFoundation = $event"
  @update:sizeMode="sizeMode = $event"
/>
```

Pass `layoutMode`, `showTests`, `showFoundation`, `sizeMode` as props to `GraphView`.

**Step 3: Wire GraphView to accept filter props**

Update GraphView props:
```typescript
const props = defineProps<{
  graph: Graph;
  mode: AnalysisMode;
  highlightResult?: FailingResult | RefactorResult | null;
  layoutMode?: 'dagre' | 'cose';
  showTests?: boolean;
  showFoundation?: boolean;
  sizeMode?: 'fanIn' | 'uniform';
}>();
```

In `buildElements()`, filter nodes:
```typescript
const filteredNodes = graph.nodes.filter(n => {
  if (!props.showTests && n.type === 'test') return false;
  if (!props.showFoundation && (n.layerIndex === 0)) return false;
  return true;
});
```

For size mode, in node data:
```typescript
nodeSize: props.sizeMode === 'uniform' ? 36 : (n.size ?? 36),
```

Watch these props and re-init cytoscape when they change.

**Step 4: Build and verify**

Run: `npm run build:ui`

**Step 5: Commit**

```bash
git add src/ui/components/ViewControls.vue src/ui/App.vue src/ui/components/GraphView.vue
git commit -m "feat(ui): add view controls (layout, test/foundation toggle, size mode)"
```

---

## Task 9: Update NodePanel for New Fields

**Files:**
- Modify: `src/ui/components/NodePanel.vue`

**Step 1: Display depth, layerIndex, fan-in in the panel**

Add a new section after the Layer/Type row:

```vue
<!-- Depth & Fan-in -->
<div class="section row-section" v-if="node.depth !== undefined">
  <div>
    <div class="section-label">Depth</div>
    <span class="metric">{{ node.depth }}</span>
  </div>
  <div>
    <div class="section-label">Arch Layer</div>
    <span class="badge" :style="{ background: depthColor }">
      {{ depthLabel }}
    </span>
  </div>
  <div>
    <div class="section-label">Fan-in</div>
    <span class="metric">{{ node.fanIn ?? 0 }}</span>
  </div>
</div>
```

Add computed:
```typescript
import { DEPTH_LAYER_COLORS, DEPTH_LAYER_LABELS } from '../utils/constants';

const depthColor = computed(() =>
  DEPTH_LAYER_COLORS[props.node.layerIndex ?? 0] ?? '#64748b'
);
const depthLabel = computed(() =>
  DEPTH_LAYER_LABELS[props.node.layerIndex ?? 0] ?? 'Unknown'
);
```

Add style:
```css
.metric {
  font-size: 18px;
  font-weight: 700;
  color: #e2e8f0;
}
```

**Step 2: Commit**

```bash
git add src/ui/components/NodePanel.vue
git commit -m "feat(ui): show depth, arch layer, fan-in in node panel"
```

---

## Task 10: Build, Scan, and Manual Verify

**Step 1: Full build**

Run: `npm run build`
Expected: Clean build, no errors

**Step 2: Scan demo project**

Run: `node dist/cli.js scan demo/`
Expected: Graph generated with new fields

**Step 3: Verify graph.json has new fields**

Run: `node -e "const g=JSON.parse(require('fs').readFileSync('.whatbreaks/graph.json','utf8')); const n=g.nodes.find(x=>x.id.includes('damageCalculator')); console.log(JSON.stringify(n,null,2))"`

Expected: `damageCalculator.ts` has high `fanIn` (10+), `depth` > 0, `layerIndex` of 1 or 2, `size` > 50.

**Step 4: Start dev server and visually verify**

Run: `node dist/cli.js serve`
Open browser, verify:
- Nodes are arranged vertically (dagre layout)
- Foundation at bottom, Entry/Top at top
- Hub nodes are wider than leaf nodes
- Colors match spec (teal at bottom, blue middle, purple/dark-blue at top)
- Legend shows Foundation/Core/Feature/Entry/Test
- Clicking a node shows depth, arch layer, fan-in in panel
- View controls toggle work (layout switch, hide tests, size mode)

**Step 5: Verify failure highlighting still works**

- Switch to Test Failure mode
- Select a test → verify red/orange/yellow overlay works on top of new base colors
- Verify unaffected nodes dim to 0.25 opacity
- Verify clearing the highlight reverts to base colors

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: visual system — depth layering, fan-in sizing, architectural colors"
```

---

## Task Dependencies

```
Task 1 (types) ← Task 2 (metrics) ← Task 3 (scanner integration)
                                          ↓
Task 4 (dagre install) ← Task 5 (constants) ← Task 6 (GraphView) ← Task 8 (controls)
                                                     ↓
                                              Task 7 (Legend)
                                              Task 9 (NodePanel)
                                                     ↓
                                              Task 10 (verify)
```

Parallelizable groups:
- **Wave 1:** Task 1
- **Wave 2:** Task 2 + Task 4 (independent)
- **Wave 3:** Task 3 + Task 5 (independent)
- **Wave 4:** Task 6
- **Wave 5:** Task 7 + Task 8 + Task 9 (independent)
- **Wave 6:** Task 10
