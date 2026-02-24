# File Grouping (Code Understanding Layer) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically group source files into logical feature modules using hybrid directory + dependency clustering, and render them as collapsible compound nodes in the Cytoscape graph.

**Architecture:** New `computeFileGroups()` engine function runs after `computeVisualMetrics()` in the scan pipeline. It uses a 3-pass algorithm: (1) directory seeds, (2) dependency-based merge using a direction-aware coupling score, (3) name resolution. Groups are stored in `graph.json` as an optional `groups` array. The UI reads groups and creates Cytoscape compound parent nodes, defaulting to collapsed state.

**Tech Stack:** TypeScript (engine), Vue 3 + Cytoscape.js (UI), Vitest (tests)

---

## Task 1: Add `FileGroup` type to graph types

**Files:**
- Modify: `src/types/graph.ts:27-30`

**Step 1: Write the failing test**

Create the test file first:

```typescript
// tests/engine/grouping.test.ts
import { describe, it, expect } from 'vitest';
import type { FileGroup, Graph } from '../../src/types/graph';

describe('FileGroup type', () => {
  it('should have required properties', () => {
    const group: FileGroup = {
      id: 'group-todo',
      label: 'Todo',
      nodeIds: ['src/todo.ts', 'src/todoService.ts'],
      centralNodeId: 'src/todo.ts',
    };
    expect(group.id).toBe('group-todo');
    expect(group.label).toBe('Todo');
    expect(group.nodeIds).toHaveLength(2);
    expect(group.centralNodeId).toBe('src/todo.ts');
  });

  it('Graph type should support optional groups array', () => {
    const graph: Graph = {
      nodes: [],
      edges: [],
      groups: [{ id: 'g1', label: 'G1', nodeIds: [], centralNodeId: '' }],
    };
    expect(graph.groups).toHaveLength(1);
  });

  it('Graph without groups should still be valid', () => {
    const graph: Graph = { nodes: [], edges: [] };
    expect(graph.groups).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/grouping.test.ts`
Expected: FAIL — `FileGroup` not exported from types, `groups` not on `Graph`

**Step 3: Write minimal implementation**

Add to `src/types/graph.ts` after the `GraphEdge` interface (line 25):

```typescript
export interface FileGroup {
  id: string;
  label: string;
  nodeIds: string[];
  centralNodeId: string;
}
```

Update the `Graph` interface (line 27-30) to:

```typescript
export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  groups?: FileGroup[];
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine/grouping.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/graph.ts tests/engine/grouping.test.ts
git commit -m "feat: add FileGroup type and optional groups to Graph"
```

---

## Task 2: Implement Pass 1 — Directory seed grouping

**Files:**
- Create: `src/engine/grouping.ts`
- Modify: `tests/engine/grouping.test.ts`

**Step 1: Write the failing tests**

Append to `tests/engine/grouping.test.ts`:

```typescript
import { computeFileGroups } from '../../src/engine/grouping';

describe('computeFileGroups', () => {
  describe('Pass 1: directory seeds', () => {
    it('groups files in the same directory', () => {
      const graph: Graph = {
        nodes: [
          { id: 'src/todo/service.ts', label: 'service.ts', layer: 'feature', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'src/todo/model.ts', label: 'model.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'src/user/service.ts', label: 'service.ts', layer: 'feature', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        ],
        edges: [],
      };
      const groups = computeFileGroups(graph);
      expect(groups).toHaveLength(2);
      const todoGroup = groups.find(g => g.nodeIds.includes('src/todo/service.ts'));
      expect(todoGroup).toBeDefined();
      expect(todoGroup!.nodeIds).toContain('src/todo/model.ts');
    });

    it('excludes test nodes from grouping', () => {
      const graph: Graph = {
        nodes: [
          { id: 'src/todo.ts', label: 'todo.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'tests/todo.test.ts', label: 'todo.test.ts', layer: 'test', type: 'test', functions: [], depth: 0, layerIndex: -1, fanIn: 0, size: 30 },
        ],
        edges: [],
      };
      const groups = computeFileGroups(graph);
      const allNodeIds = groups.flatMap(g => g.nodeIds);
      expect(allNodeIds).not.toContain('tests/todo.test.ts');
    });

    it('root-level files each start as own seed', () => {
      const graph: Graph = {
        nodes: [
          { id: 'src/todoService.ts', label: 'todoService.ts', layer: 'feature', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'src/userService.ts', label: 'userService.ts', layer: 'feature', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        ],
        edges: [],
      };
      // Before merging, each root file is its own seed
      const groups = computeFileGroups(graph);
      // Without edges between them, they stay separate (singletons get filtered)
      expect(groups).toHaveLength(0); // singletons filtered
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/grouping.test.ts`
Expected: FAIL — `computeFileGroups` not found

**Step 3: Write minimal implementation**

Create `src/engine/grouping.ts`:

```typescript
import path from 'node:path';
import type { Graph, FileGroup } from '../types/graph.js';

const MIN_FILES_FOR_GROUPING = 8;
const MIN_GROUP_SIZE = 2;

/**
 * Compute logical file groups using hybrid directory + dependency clustering.
 *
 * Pass 1: Directory seeds — group files by deepest shared directory.
 * Pass 2: Dependency merge — merge groups with high coupling score.
 * Pass 3: Name resolution — pick meaningful group names.
 *
 * Returns empty array if graph has fewer than MIN_FILES_FOR_GROUPING source files.
 */
export function computeFileGroups(graph: Graph): FileGroup[] {
  const sourceNodes = graph.nodes.filter(n => n.type !== 'test');

  if (sourceNodes.length < MIN_FILES_FOR_GROUPING) return [];

  // Pass 1: Directory seeds
  const dirGroups = new Map<string, string[]>();

  for (const node of sourceNodes) {
    const dir = path.dirname(node.id);
    const existing = dirGroups.get(dir) ?? [];
    existing.push(node.id);
    dirGroups.set(dir, existing);
  }

  // Convert to group array, filtering singletons
  let groups: { nodeIds: string[] }[] = [];

  for (const [_dir, nodeIds] of dirGroups) {
    if (nodeIds.length >= MIN_GROUP_SIZE) {
      groups.push({ nodeIds: [...nodeIds] });
    }
  }

  // TODO: Pass 2 (dependency merge) — Task 3
  // TODO: Pass 3 (name resolution) — Task 4

  // Temporary: simple naming
  return groups.map((g, i) => buildFileGroup(g.nodeIds, graph, i));
}

function buildFileGroup(nodeIds: string[], graph: Graph, index: number): FileGroup {
  // Find central node (highest fanIn)
  let centralNodeId = nodeIds[0];
  let maxFanIn = 0;
  for (const id of nodeIds) {
    const node = graph.nodes.find(n => n.id === id);
    if (node && node.fanIn > maxFanIn) {
      maxFanIn = node.fanIn;
      centralNodeId = id;
    }
  }

  const label = `Group ${index + 1}`;
  const id = `group-${index}`;

  return { id, label, nodeIds, centralNodeId };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine/grouping.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/engine/grouping.ts tests/engine/grouping.test.ts
git commit -m "feat: add Pass 1 directory seed grouping"
```

---

## Task 3: Implement Pass 2 — Dependency merge with direction-aware coupling

**Files:**
- Modify: `src/engine/grouping.ts`
- Modify: `tests/engine/grouping.test.ts`

**Step 1: Write the failing tests**

Append to `tests/engine/grouping.test.ts`:

```typescript
describe('Pass 2: dependency merge', () => {
  it('merges cross-directory groups with high coupling', () => {
    const graph: Graph = {
      nodes: [
        { id: 'src/controllers/todoCtrl.ts', label: 'todoCtrl.ts', layer: 'feature', type: 'source', functions: [], depth: 2, layerIndex: 2, fanIn: 0, size: 30 },
        { id: 'src/controllers/userCtrl.ts', label: 'userCtrl.ts', layer: 'feature', type: 'source', functions: [], depth: 2, layerIndex: 2, fanIn: 0, size: 30 },
        { id: 'src/services/todoSvc.ts', label: 'todoSvc.ts', layer: 'feature', type: 'source', functions: [], depth: 1, layerIndex: 1, fanIn: 1, size: 36 },
        { id: 'src/services/userSvc.ts', label: 'userSvc.ts', layer: 'feature', type: 'source', functions: [], depth: 1, layerIndex: 1, fanIn: 1, size: 36 },
        { id: 'src/models/todo.ts', label: 'todo.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 2, size: 42 },
        { id: 'src/models/user.ts', label: 'user.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 2, size: 42 },
        { id: 'src/utils/validator.ts', label: 'validator.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 3, size: 48 },
        { id: 'src/utils/formatter.ts', label: 'formatter.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 2, size: 42 },
      ],
      edges: [
        // Todo feature chain: ctrl -> svc -> model
        { source: 'src/controllers/todoCtrl.ts', target: 'src/services/todoSvc.ts', type: 'import' },
        { source: 'src/services/todoSvc.ts', target: 'src/models/todo.ts', type: 'import' },
        { source: 'src/controllers/todoCtrl.ts', target: 'src/models/todo.ts', type: 'import' },
        // User feature chain: ctrl -> svc -> model
        { source: 'src/controllers/userCtrl.ts', target: 'src/services/userSvc.ts', type: 'import' },
        { source: 'src/services/userSvc.ts', target: 'src/models/user.ts', type: 'import' },
        // Shared utils — imported by both
        { source: 'src/services/todoSvc.ts', target: 'src/utils/validator.ts', type: 'import' },
        { source: 'src/services/userSvc.ts', target: 'src/utils/validator.ts', type: 'import' },
        { source: 'src/controllers/todoCtrl.ts', target: 'src/utils/formatter.ts', type: 'import' },
      ],
    };
    const groups = computeFileGroups(graph);

    // Should have merged todo-related files across dirs
    const todoGroup = groups.find(g =>
      g.nodeIds.includes('src/controllers/todoCtrl.ts') &&
      g.nodeIds.includes('src/services/todoSvc.ts')
    );
    expect(todoGroup).toBeDefined();

    // Shared utils (imported by many) should NOT merge into a feature group
    const validatorGroup = groups.find(g => g.nodeIds.includes('src/utils/validator.ts'));
    if (validatorGroup) {
      // If validator is in a group, it shouldn't be in the todo group
      expect(validatorGroup.nodeIds).not.toContain('src/controllers/todoCtrl.ts');
    }
  });

  it('merges flat root-level files with strong coupling', () => {
    const graph: Graph = {
      nodes: [
        { id: 'src/todoService.ts', label: 'todoService.ts', layer: 'feature', type: 'source', functions: [], depth: 1, layerIndex: 1, fanIn: 1, size: 36 },
        { id: 'src/todoController.ts', label: 'todoController.ts', layer: 'feature', type: 'source', functions: [], depth: 2, layerIndex: 2, fanIn: 0, size: 30 },
        { id: 'src/todo.ts', label: 'todo.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 2, size: 42 },
        { id: 'src/userService.ts', label: 'userService.ts', layer: 'feature', type: 'source', functions: [], depth: 1, layerIndex: 1, fanIn: 1, size: 36 },
        { id: 'src/userController.ts', label: 'userController.ts', layer: 'feature', type: 'source', functions: [], depth: 2, layerIndex: 2, fanIn: 0, size: 30 },
        { id: 'src/user.ts', label: 'user.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 2, size: 42 },
        { id: 'src/config.ts', label: 'config.ts', layer: 'config', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 4, size: 54 },
        { id: 'src/index.ts', label: 'index.ts', layer: 'page', type: 'source', functions: [], depth: 3, layerIndex: 3, fanIn: 0, size: 30 },
      ],
      edges: [
        { source: 'src/todoController.ts', target: 'src/todoService.ts', type: 'import' },
        { source: 'src/todoService.ts', target: 'src/todo.ts', type: 'import' },
        { source: 'src/todoController.ts', target: 'src/todo.ts', type: 'import' },
        { source: 'src/userController.ts', target: 'src/userService.ts', type: 'import' },
        { source: 'src/userService.ts', target: 'src/user.ts', type: 'import' },
        { source: 'src/index.ts', target: 'src/todoController.ts', type: 'import' },
        { source: 'src/index.ts', target: 'src/userController.ts', type: 'import' },
      ],
    };
    const groups = computeFileGroups(graph);

    // Flat files with "todo" in name and strong deps should merge
    const todoGroup = groups.find(g =>
      g.nodeIds.includes('src/todoService.ts') &&
      g.nodeIds.includes('src/todo.ts')
    );
    expect(todoGroup).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/grouping.test.ts`
Expected: FAIL — grouping doesn't merge cross-directory groups yet

**Step 3: Write implementation**

Update `src/engine/grouping.ts` — replace the `computeFileGroups` function body with the full 3-pass algorithm. The key addition is the dependency merge pass:

```typescript
import path from 'node:path';
import type { Graph, FileGroup } from '../types/graph.js';

const MIN_FILES_FOR_GROUPING = 8;
const MIN_GROUP_SIZE = 2;
const COUPLING_THRESHOLD = 0.4;

export function computeFileGroups(graph: Graph): FileGroup[] {
  const sourceNodes = graph.nodes.filter(n => n.type !== 'test');
  if (sourceNodes.length < MIN_FILES_FOR_GROUPING) return [];

  // Build adjacency for import edges
  const forwardAdj = new Map<string, Set<string>>();
  const reverseAdj = new Map<string, Set<string>>();
  for (const node of sourceNodes) {
    forwardAdj.set(node.id, new Set());
    reverseAdj.set(node.id, new Set());
  }
  for (const edge of graph.edges) {
    if (edge.type !== 'import') continue;
    forwardAdj.get(edge.source)?.add(edge.target);
    reverseAdj.get(edge.target)?.add(edge.source);
  }

  // ── Pass 1: Directory seeds ─────────────────────────────────────────
  const dirGroups = new Map<string, Set<string>>();
  for (const node of sourceNodes) {
    const dir = path.dirname(node.id);
    if (!dirGroups.has(dir)) dirGroups.set(dir, new Set());
    dirGroups.get(dir)!.add(node.id);
  }

  // Convert to numbered groups; singletons get their own group (for merge later)
  let groupMap = new Map<number, Set<string>>(); // groupIndex -> nodeIds
  const nodeToGroup = new Map<string, number>();  // nodeId -> groupIndex
  let nextGroupId = 0;

  for (const [_dir, nodeIds] of dirGroups) {
    const gId = nextGroupId++;
    groupMap.set(gId, new Set(nodeIds));
    for (const nid of nodeIds) nodeToGroup.set(nid, gId);
  }

  // ── Pass 2: Dependency merge ────────────────────────────────────────
  // Compute coupling between every pair of groups and merge if above threshold.
  // Uses direction-aware formula:
  //   coupling(A, B) = (edges A->B + edges B->A) / totalOutgoing(smaller group)

  let merged = true;
  while (merged) {
    merged = false;
    const groupIds = Array.from(groupMap.keys());

    for (let i = 0; i < groupIds.length && !merged; i++) {
      for (let j = i + 1; j < groupIds.length && !merged; j++) {
        const gA = groupIds[i];
        const gB = groupIds[j];
        const nodesA = groupMap.get(gA)!;
        const nodesB = groupMap.get(gB)!;

        const coupling = computeCoupling(nodesA, nodesB, forwardAdj);
        if (coupling >= COUPLING_THRESHOLD) {
          // Merge B into A
          for (const nid of nodesB) {
            nodesA.add(nid);
            nodeToGroup.set(nid, gA);
          }
          groupMap.delete(gB);
          merged = true;
        }
      }
    }
  }

  // Filter singletons and single-group results
  const finalGroups = Array.from(groupMap.values())
    .filter(nodeIds => nodeIds.size >= MIN_GROUP_SIZE);

  if (finalGroups.length <= 1 && finalGroups[0]?.size === sourceNodes.length) {
    return []; // Everything in one group = pointless
  }

  // ── Pass 3: Name resolution ─────────────────────────────────────────
  return finalGroups.map((nodeIds, i) =>
    buildFileGroup(Array.from(nodeIds), graph, i)
  );
}

function computeCoupling(
  nodesA: Set<string>,
  nodesB: Set<string>,
  forwardAdj: Map<string, Set<string>>,
): number {
  let edgesAtoB = 0;
  let edgesBtoA = 0;
  let totalOutgoingSmaller = 0;

  for (const nid of nodesA) {
    const targets = forwardAdj.get(nid);
    if (!targets) continue;
    for (const t of targets) {
      if (nodesB.has(t)) edgesAtoB++;
    }
  }

  for (const nid of nodesB) {
    const targets = forwardAdj.get(nid);
    if (!targets) continue;
    for (const t of targets) {
      if (nodesA.has(t)) edgesBtoA++;
    }
  }

  // Total outgoing edges of the smaller group (to normalize)
  const smaller = nodesA.size <= nodesB.size ? nodesA : nodesB;
  for (const nid of smaller) {
    totalOutgoingSmaller += forwardAdj.get(nid)?.size ?? 0;
  }

  if (totalOutgoingSmaller === 0) return 0;
  return (edgesAtoB + edgesBtoA) / totalOutgoingSmaller;
}

function buildFileGroup(nodeIds: string[], graph: Graph, index: number): FileGroup {
  // Find central node (highest fanIn)
  let centralNodeId = nodeIds[0];
  let maxFanIn = 0;
  for (const id of nodeIds) {
    const node = graph.nodes.find(n => n.id === id);
    if (node && node.fanIn > maxFanIn) {
      maxFanIn = node.fanIn;
      centralNodeId = id;
    }
  }

  // Name resolution: find most common stem across filenames
  const label = resolveGroupName(nodeIds, centralNodeId);
  const id = `group-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return { id, label, nodeIds, centralNodeId };
}

function resolveGroupName(nodeIds: string[], centralNodeId: string): string {
  // Extract stems from filenames (strip extensions and common suffixes)
  const suffixes = ['Controller', 'Service', 'Model', 'Repository', 'Handler',
    'Ctrl', 'Svc', 'Repo', 'Helper', 'Utils', 'Util', 'Factory',
    'controller', 'service', 'model', 'repository', 'handler',
    'ctrl', 'svc', 'repo', 'helper', 'utils', 'util', 'factory'];

  const stems = new Map<string, number>();

  for (const id of nodeIds) {
    const base = path.basename(id).replace(/\.[^.]+$/, ''); // strip extension
    let stem = base;
    for (const suffix of suffixes) {
      if (stem.endsWith(suffix) && stem.length > suffix.length) {
        stem = stem.slice(0, -suffix.length);
        break;
      }
    }
    // Normalize: lowercase first char
    stem = stem.charAt(0).toLowerCase() + stem.slice(1);
    if (stem.length >= 2) {
      stems.set(stem, (stems.get(stem) ?? 0) + 1);
    }
  }

  // Pick most frequent stem
  let bestStem = '';
  let bestCount = 0;
  for (const [stem, count] of stems) {
    if (count > bestCount) {
      bestCount = count;
      bestStem = stem;
    }
  }

  if (bestStem) {
    // Capitalize
    return bestStem.charAt(0).toUpperCase() + bestStem.slice(1);
  }

  // Fallback: use directory name of central node
  const dir = path.basename(path.dirname(centralNodeId));
  if (dir && dir !== '.' && dir !== 'src') {
    return dir.charAt(0).toUpperCase() + dir.slice(1);
  }

  // Last resort: use central node filename
  return path.basename(centralNodeId).replace(/\.[^.]+$/, '');
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine/grouping.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/engine/grouping.ts tests/engine/grouping.test.ts
git commit -m "feat: add Pass 2 dependency merge + Pass 3 name resolution"
```

---

## Task 4: Integrate grouping into scan pipeline

**Files:**
- Modify: `src/scanner/index.ts:124-131`
- Modify: `src/cli/scan.ts:40-55`

**Step 1: Write the failing test**

Append to `tests/engine/grouping.test.ts`:

```typescript
import { scanRepository } from '../../src/scanner/index';

describe('scan pipeline integration', () => {
  it('scanRepository returns groups when project is large enough', async () => {
    // Use demo-simple which has 10 source files (>= 8 threshold)
    const graph = await scanRepository('demo-simple');
    expect(graph.groups).toBeDefined();
    expect(Array.isArray(graph.groups)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/grouping.test.ts`
Expected: FAIL — `graph.groups` is undefined (not computed yet)

**Step 3: Write implementation**

In `src/scanner/index.ts`, add the import at the top (after line 13):

```typescript
import { computeFileGroups } from '../engine/grouping.js';
```

After line 128 (`computeVisualMetrics(graph);`), add:

```typescript
  // Step 7: Compute file groups (hybrid directory + dependency clustering)
  graph.groups = computeFileGroups(graph);
```

In `src/cli/scan.ts`, after line 52 (test mappings log), add a groups count:

```typescript
        const groupCount = graph.groups?.length ?? 0;
        if (groupCount > 0) {
          console.log(`    ${chalk.bold(String(groupCount))} file groups`);
        }
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine/grouping.test.ts`
Expected: PASS

**Step 5: Verify with real project**

Run: `npx tsx src/cli/index.ts scan demo-simple`
Expected: Output shows file groups count

Run: `npx tsx src/cli/index.ts scan demo`
Expected: Output shows file groups count (larger demo project)

**Step 6: Commit**

```bash
git add src/scanner/index.ts src/cli/scan.ts
git commit -m "feat: integrate file grouping into scan pipeline"
```

---

## Task 5: Add `whatbreaks groups` CLI command

**Files:**
- Create: `src/cli/groups.ts`
- Modify: `src/cli/index.ts`

**Step 1: Write the implementation**

Create `src/cli/groups.ts`:

```typescript
import { Command } from 'commander';
import { resolve } from 'path';
import chalk from 'chalk';
import { loadGraph } from '../engine/graph.js';

export function registerGroupsCommand(program: Command): void {
  program
    .command('groups')
    .description('Show file groups from the dependency graph')
    .option('-i, --input <path>', 'Path to graph file', '.whatbreaks/graph.json')
    .option('--json', 'Output as JSON')
    .action((opts: { input: string; json?: boolean }) => {
      const graphPath = resolve(process.cwd(), opts.input);

      try {
        const graph = loadGraph(graphPath);
        const groups = graph.groups ?? [];

        if (opts.json) {
          console.log(JSON.stringify(groups, null, 2));
          return;
        }

        if (groups.length === 0) {
          console.log(chalk.dim('\n  No file groups found.\n'));
          console.log(chalk.dim('  This can happen if the project has fewer than 8 source files.\n'));
          return;
        }

        console.log(chalk.cyan.bold(`\n  File Groups (${groups.length})\n`));

        for (const group of groups) {
          console.log(chalk.bold(`  ${group.label}`));
          console.log(chalk.dim(`  Central: ${group.centralNodeId}`));
          for (const nodeId of group.nodeIds) {
            const marker = nodeId === group.centralNodeId ? chalk.yellow('*') : ' ';
            console.log(`    ${marker} ${nodeId}`);
          }
          console.log();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n  Error: ${message}\n`));
        console.error(chalk.dim('  Run "whatbreaks scan <dir>" first.\n'));
        process.exit(1);
      }
    });
}
```

Register in `src/cli/index.ts` — add import and registration call alongside existing commands.

**Step 2: Run to verify**

Run: `npx tsx src/cli/index.ts scan demo-simple && npx tsx src/cli/index.ts groups`
Expected: Shows grouped files with names

Run: `npx tsx src/cli/index.ts groups --json`
Expected: JSON output of groups array

**Step 3: Commit**

```bash
git add src/cli/groups.ts src/cli/index.ts
git commit -m "feat: add whatbreaks groups CLI command"
```

---

## Task 6: Render groups as compound nodes in Cytoscape UI

**Files:**
- Modify: `src/ui/components/GraphView.vue:31-69` (buildElements)
- Modify: `src/ui/components/GraphView.vue:71-264` (getStylesheet)

**Step 1: Modify `buildElements` to create compound parent nodes**

In `GraphView.vue`, update the `buildElements` function. After creating the `nodes` array (line 55) and before creating `edges` (line 57), add compound parent creation:

```typescript
function buildElements(graph: Graph) {
  const filteredNodes = graph.nodes.filter(n => {
    if (props.showTests === false && n.type === 'test') return false;
    if (props.showFoundation === false && n.layerIndex === 0) return false;
    return true;
  });

  const nodeIds = new Set(filteredNodes.map(n => n.id));

  // Create group (compound parent) nodes if groups exist
  const groupNodes: cytoscape.ElementDefinition[] = [];
  const nodeParentMap = new Map<string, string>(); // nodeId -> groupId

  if (graph.groups?.length) {
    for (const group of graph.groups) {
      // Only create group if it has visible children
      const visibleChildren = group.nodeIds.filter(id => nodeIds.has(id));
      if (visibleChildren.length < 2) continue;

      groupNodes.push({
        data: {
          id: group.id,
          label: group.label,
          type: 'group',
        },
      });

      for (const nid of visibleChildren) {
        nodeParentMap.set(nid, group.id);
      }
    }
  }

  const nodes = filteredNodes.map(n => ({
    data: {
      id: n.id,
      label: n.label,
      layer: n.layer,
      type: n.type,
      functions: n.functions,
      color: DEPTH_LAYER_COLORS[n.layerIndex ?? 0] ?? '#64748b',
      testLevel: n.testLevel ?? 'unit',
      icon: getFileIcon(n.id, n.type, n.testLevel),
      nodeSize: props.sizeMode === 'uniform' ? 36 : (n.size ?? 36),
      layerIndex: n.layerIndex ?? 0,
      fanIn: n.fanIn ?? 0,
      depth: n.depth ?? 0,
      parent: nodeParentMap.get(n.id) ?? undefined,
    },
  }));

  const edges = graph.edges
    .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e, i) => ({
      data: {
        id: `e${i}`,
        source: e.source,
        target: e.target,
        edgeType: e.type,
      },
    }));

  return [...groupNodes, ...nodes, ...edges];
}
```

**Step 2: Add compound node styles to `getStylesheet`**

Add after the base node style (line 104):

```typescript
    // Group (compound parent) node styles
    {
      selector: 'node[type="group"]',
      style: {
        'shape': 'roundrectangle',
        'background-color': '#1e293b',
        'background-opacity': 0.6,
        'border-width': 1,
        'border-style': 'dashed',
        'border-color': '#475569',
        'border-opacity': 0.5,
        'label': 'data(label)',
        'color': '#94a3b8',
        'font-size': '10px',
        'font-weight': 600,
        'text-transform': 'uppercase',
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': -4,
        'padding': '16px',
        'text-background-color': '#1e293b',
        'text-background-opacity': 0.9,
        'text-background-padding': '3px',
      } as unknown as cytoscape.Css.Node,
    },
    // Group focus mode — fade unrelated groups
    {
      selector: 'node[type="group"].group-dimmed',
      style: {
        'opacity': 0.15,
        'border-opacity': 0.1,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node[type="group"].group-focused',
      style: {
        'border-color': '#6366f1',
        'border-opacity': 0.8,
        'border-width': 2,
      } as unknown as cytoscape.Css.Node,
    },
```

**Step 3: Add group click handler for focus mode**

In `initCytoscape()`, add after the existing node tap handler (line 329):

```typescript
  // Group focus mode: click a group to dim others
  instance.on('tap', 'node[type="group"]', (evt) => {
    const groupId = evt.target.id();

    // Toggle: if already focused, clear
    if (evt.target.hasClass('group-focused')) {
      instance.nodes('[type="group"]').removeClass('group-focused group-dimmed');
      instance.nodes().not('[type="group"]').removeClass('impact-unaffected');
      instance.edges().removeClass('impact-unaffected');
      return;
    }

    // Focus this group, dim others
    instance.nodes('[type="group"]').addClass('group-dimmed').removeClass('group-focused');
    evt.target.removeClass('group-dimmed').addClass('group-focused');

    // Dim nodes not in this group
    const childNodeIds = new Set(
      instance.nodes(`[parent="${groupId}"]`).map((n: any) => n.id())
    );

    instance.nodes().not('[type="group"]').forEach((n: any) => {
      if (!childNodeIds.has(n.id())) {
        n.addClass('impact-unaffected');
      } else {
        n.removeClass('impact-unaffected');
      }
    });

    // Dim edges not connecting group members
    instance.edges().forEach((e: any) => {
      if (childNodeIds.has(e.source().id()) || childNodeIds.has(e.target().id())) {
        e.removeClass('impact-unaffected');
      } else {
        e.addClass('impact-unaffected');
      }
    });

    // Zoom to fit group
    const groupEles = evt.target.descendants().add(evt.target);
    instance.animate({
      fit: { eles: groupEles, padding: 60 },
      duration: 400,
      easing: 'ease-out-cubic',
    });
  });
```

**Step 4: Verify visually**

Run: `npx tsx src/cli/index.ts scan demo-simple && npm run dev:ui`
Open browser: Verify groups appear as dashed containers around related files.
Click a group: Verify focus mode dims unrelated groups.
Click same group again: Verify it toggles off.

**Step 5: Commit**

```bash
git add src/ui/components/GraphView.vue
git commit -m "feat: render file groups as compound nodes with focus mode"
```

---

## Task 7: Add collapse/expand for group nodes

**Files:**
- Modify: `src/ui/components/GraphView.vue`

**Step 1: Add collapse state management**

Add a reactive Set to track which groups are expanded. Default = all collapsed.

In the `<script setup>` section after existing refs:

```typescript
const expandedGroups = ref(new Set<string>());
```

**Step 2: Modify `buildElements` to handle collapsed state**

When a group is collapsed:
- Don't emit child nodes
- Instead, show the group node with a badge (file count)
- Create aggregate edges between collapsed groups

Update `buildElements`:

```typescript
// After creating groupNodes and nodeParentMap...

// Handle collapsed groups: remove children, add badge to group label
for (const group of graph.groups ?? []) {
  if (!expandedGroups.value.has(group.id)) {
    // Collapsed: remove children from visible set
    const visibleChildren = group.nodeIds.filter(id => nodeIds.has(id));
    for (const nid of visibleChildren) {
      nodeIds.delete(nid); // hide individual nodes
      nodeParentMap.delete(nid);
    }

    // Update group label with count
    const groupNode = groupNodes.find(gn => gn.data.id === group.id);
    if (groupNode) {
      groupNode.data.label = `${group.label} (${visibleChildren.length})`;
      groupNode.data.collapsedCount = visibleChildren.length;
      groupNode.data.collapsedNodeIds = visibleChildren;
    }
  }
}

// After building edges, add aggregate edges for collapsed groups
const collapsedGroupNodeMap = new Map<string, string>(); // nodeId -> groupId (for collapsed only)
for (const group of graph.groups ?? []) {
  if (!expandedGroups.value.has(group.id)) {
    for (const nid of group.nodeIds) {
      collapsedGroupNodeMap.set(nid, group.id);
    }
  }
}

// Create aggregate edges between collapsed groups
const aggregateEdgeSet = new Set<string>();
const aggregateEdges: cytoscape.ElementDefinition[] = [];

for (const edge of graph.edges) {
  const srcGroup = collapsedGroupNodeMap.get(edge.source);
  const tgtGroup = collapsedGroupNodeMap.get(edge.target);

  if (srcGroup && tgtGroup && srcGroup !== tgtGroup) {
    const key = `${srcGroup}->${tgtGroup}`;
    if (!aggregateEdgeSet.has(key)) {
      aggregateEdgeSet.add(key);
      aggregateEdges.push({
        data: {
          id: `agg-${key}`,
          source: srcGroup,
          target: tgtGroup,
          edgeType: 'aggregate',
        },
      });
    }
  }
}
```

**Step 3: Add double-click handler for expand/collapse**

In `initCytoscape()`:

```typescript
  // Double-click group to expand/collapse
  instance.on('dblclick', 'node[type="group"]', (evt) => {
    const groupId = evt.target.id();
    if (expandedGroups.value.has(groupId)) {
      expandedGroups.value.delete(groupId);
    } else {
      expandedGroups.value.add(groupId);
    }
    // Re-render graph with new collapse state
    initCytoscape();
  });
```

**Step 4: Add collapsed group style**

```typescript
    // Collapsed group node — larger, more prominent
    {
      selector: 'node[type="group"][collapsedCount]',
      style: {
        'width': 80,
        'height': 40,
        'font-size': '11px',
        'text-valign': 'center',
        'background-opacity': 0.8,
        'border-style': 'solid',
        'padding': '0px',
      } as unknown as cytoscape.Css.Node,
    },
    // Aggregate edge style
    {
      selector: 'edge[edgeType="aggregate"]',
      style: {
        'width': 2.5,
        'line-color': '#64748b',
        'target-arrow-color': '#64748b',
        'line-style': 'solid',
        'opacity': 0.6,
      } as unknown as cytoscape.Css.Edge,
    },
```

**Step 5: Verify visually**

Run dev server and test:
- Groups should start collapsed (showing label + count)
- Double-click a group → expands to show children
- Double-click again → collapses back
- Edges between collapsed groups should be visible as thick lines

**Step 6: Commit**

```bash
git add src/ui/components/GraphView.vue
git commit -m "feat: add collapse/expand for group nodes with aggregate edges"
```

---

## Task 8: Update Legend and stats bar for groups

**Files:**
- Modify: `src/ui/components/Legend.vue`
- Modify: `src/ui/App.vue:225-230`

**Step 1: Add group legend entry**

In `Legend.vue`, add a new legend group section for file groups:

```html
<div class="legend-separator"></div>
<div class="legend-group">
  <span class="legend-title">Groups:</span>
  <div class="legend-item">
    <span class="legend-dot" style="border: 1px dashed #475569; background: transparent;"></span>
    <span class="legend-label">File group</span>
  </div>
  <span class="legend-hint">dbl-click: expand</span>
</div>
```

**Step 2: Update stats bar in App.vue**

Update the stats footer (line 228) to include group count:

```html
<div class="stats" v-if="graph">
  {{ graph.nodes.length }} files &middot; {{ graph.edges.length }} connections
  <template v-if="graph.groups?.length">
    &middot; {{ graph.groups.length }} groups
  </template>
</div>
```

**Step 3: Verify visually**

Run dev server: legend should show group entry, stats bar should show group count.

**Step 4: Commit**

```bash
git add src/ui/components/Legend.vue src/ui/App.vue
git commit -m "feat: update legend and stats bar for file groups"
```

---

## Task 9: Export grouping from engine and add to engine index

**Files:**
- Modify: `src/engine/index.ts`

**Step 1: Add export**

Add to `src/engine/index.ts`:

```typescript
export { computeFileGroups } from './grouping.js';
```

**Step 2: Verify build**

Run: `npm run build:cli && npm run build:ui`
Expected: Both builds succeed with no errors.

**Step 3: End-to-end test with demo project**

Run: `npx tsx src/cli/index.ts scan demo && npx tsx src/cli/index.ts groups`
Expected: Shows meaningful groups for the BattleVerse Engine demo (67 source files).

Run: `npx tsx src/cli/index.ts groups --json | head -50`
Expected: Valid JSON output with group objects.

**Step 4: Commit**

```bash
git add src/engine/index.ts
git commit -m "feat: export computeFileGroups from engine"
```

---

## Task 10: Final integration test with both demo projects

**Files:**
- Modify: `tests/engine/grouping.test.ts`

**Step 1: Add integration test for demo project**

```typescript
describe('integration: demo-simple project', () => {
  it('produces groups for demo-simple (10 source files)', async () => {
    const graph = await scanRepository('demo-simple');
    expect(graph.groups).toBeDefined();
    expect(graph.groups!.length).toBeGreaterThanOrEqual(2);

    // Should find a Todo-related group
    const todoGroup = graph.groups!.find(g =>
      g.label.toLowerCase().includes('todo') ||
      g.nodeIds.some(id => id.includes('todo'))
    );
    expect(todoGroup).toBeDefined();
  });
});
```

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

**Step 3: Final commit**

```bash
git add tests/engine/grouping.test.ts
git commit -m "test: add integration tests for file grouping"
```

---

## Summary of all files changed

| File | Action | Purpose |
|------|--------|---------|
| `src/types/graph.ts` | Modify | Add `FileGroup` interface, `groups?` to `Graph` |
| `src/engine/grouping.ts` | Create | Core grouping algorithm (3-pass hybrid) |
| `src/engine/index.ts` | Modify | Export `computeFileGroups` |
| `src/scanner/index.ts` | Modify | Call `computeFileGroups` after metrics |
| `src/cli/scan.ts` | Modify | Show group count in scan output |
| `src/cli/groups.ts` | Create | `whatbreaks groups` CLI command |
| `src/cli/index.ts` | Modify | Register groups command |
| `src/ui/components/GraphView.vue` | Modify | Compound nodes, collapse/expand, focus mode |
| `src/ui/components/Legend.vue` | Modify | Add group legend entry |
| `src/ui/App.vue` | Modify | Show group count in stats |
| `tests/engine/grouping.test.ts` | Create | Unit + integration tests |
