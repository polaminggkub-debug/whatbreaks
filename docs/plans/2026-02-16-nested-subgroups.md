# Nested Subgroups Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add directory-based nested subgroups inside existing file groups, rendered as nested Cytoscape compound nodes.

**Architecture:** Flat `FileGroup[]` with `parentGroupId` field — no nested `children[]`. Groups at level 0 are top-level feature groups (existing). Groups at level 1 are subdirectory-based subgroups. Cytoscape handles nesting via `parent` property chains (file → subgroup → group). Detection rule: if a group contains files from 2+ subdirectories, each with 2+ files, create subgroups.

**Tech Stack:** TypeScript, Cytoscape.js compound nodes, Vitest

---

### Task 1: Add `parentGroupId` and `level` to FileGroup interface

**Files:**
- Modify: `src/types/graph.ts:27-32`
- Modify: `tests/engine/grouping.test.ts:8-13` (type test)

**Step 1: Write the failing test**

Update the type test in `tests/engine/grouping.test.ts` to verify the new fields exist:

```typescript
it('should have required properties including parentGroupId and level', () => {
  const group: FileGroup = {
    id: 'group-todo',
    label: 'Todo',
    nodeIds: ['src/todo.ts', 'src/todoService.ts'],
    centralNodeId: 'src/todo.ts',
    level: 0,
  };
  expect(group.id).toBe('group-todo');
  expect(group.level).toBe(0);
  expect(group.parentGroupId).toBeUndefined(); // optional

  const subgroup: FileGroup = {
    id: 'group-todo-api',
    label: 'Api',
    nodeIds: ['src/todo/api/get.ts'],
    centralNodeId: 'src/todo/api/get.ts',
    level: 1,
    parentGroupId: 'group-todo',
  };
  expect(subgroup.parentGroupId).toBe('group-todo');
  expect(subgroup.level).toBe(1);
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/grouping.test.ts -t "should have required properties"`
Expected: FAIL — `level` does not exist on type `FileGroup`

**Step 3: Write minimal implementation**

Update `src/types/graph.ts` FileGroup interface:

```typescript
export interface FileGroup {
  id: string;
  label: string;
  nodeIds: string[];
  centralNodeId: string;
  parentGroupId?: string;
  level: number;
}
```

**Step 4: Fix existing code that creates FileGroups**

Update `src/engine/grouping.ts` `buildFileGroup` function to include `level: 0`:

```typescript
return { id, label, nodeIds, centralNodeId, level: 0 };
```

**Step 5: Run all tests to verify nothing breaks**

Run: `npx vitest run tests/engine/grouping.test.ts`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/types/graph.ts src/engine/grouping.ts tests/engine/grouping.test.ts
git commit -m "feat: add parentGroupId and level fields to FileGroup interface"
```

---

### Task 2: Implement `detectSubgroups` function

**Files:**
- Modify: `src/engine/grouping.ts` (add function + integrate into pipeline)
- Modify: `tests/engine/grouping.test.ts` (add unit tests)

**Step 1: Write the failing tests**

Add a new describe block in `tests/engine/grouping.test.ts`:

```typescript
describe('subgroup detection', () => {
  it('creates subgroups when group has 2+ subdirectories each with 2+ files', () => {
    // Simulate a group with files from items/armor/ and items/weapons/
    const graph: Graph = {
      nodes: [
        // items/armor/ (3 files)
        { id: 'src/items/armor/plate.ts', label: 'plate.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        { id: 'src/items/armor/leather.ts', label: 'leather.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        { id: 'src/items/armor/chain.ts', label: 'chain.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        // items/weapons/ (3 files)
        { id: 'src/items/weapons/sword.ts', label: 'sword.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        { id: 'src/items/weapons/axe.ts', label: 'axe.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        { id: 'src/items/weapons/bow.ts', label: 'bow.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        // other groups to pass MIN_FILES_FOR_GROUPING (8)
        { id: 'src/battle/engine.ts', label: 'engine.ts', layer: 'feature', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        { id: 'src/battle/turn.ts', label: 'turn.ts', layer: 'feature', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
      ],
      edges: [],
    };
    const groups = computeFileGroups(graph);

    // Should have subgroups for armor and weapons
    const armorSubgroup = groups.find(g => g.label.toLowerCase().includes('armor'));
    const weaponsSubgroup = groups.find(g => g.label.toLowerCase().includes('weapon'));

    expect(armorSubgroup).toBeDefined();
    expect(armorSubgroup!.level).toBe(1);
    expect(armorSubgroup!.parentGroupId).toBeDefined();

    expect(weaponsSubgroup).toBeDefined();
    expect(weaponsSubgroup!.level).toBe(1);
    expect(weaponsSubgroup!.parentGroupId).toBeDefined();

    // Parent group should exist
    const parentGroup = groups.find(g => g.id === armorSubgroup!.parentGroupId);
    expect(parentGroup).toBeDefined();
    expect(parentGroup!.level).toBe(0);
  });

  it('does NOT create subgroups when subdirectory has only 1 file', () => {
    const graph: Graph = {
      nodes: [
        // core/damage/ (3 files)
        { id: 'src/core/damage/calc.ts', label: 'calc.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        { id: 'src/core/damage/types.ts', label: 'types.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        { id: 'src/core/damage/utils.ts', label: 'utils.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        // core/config/ (1 file — should NOT become subgroup)
        { id: 'src/core/config/global.ts', label: 'global.ts', layer: 'config', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        // padding to reach 8 source files
        { id: 'src/a.ts', label: 'a.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        { id: 'src/b.ts', label: 'b.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        { id: 'src/c.ts', label: 'c.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        { id: 'src/d.ts', label: 'd.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
      ],
      edges: [],
    };
    const groups = computeFileGroups(graph);

    // No subgroup for config (only 1 file)
    const configSubgroup = groups.find(g =>
      g.level === 1 && g.label.toLowerCase().includes('config')
    );
    expect(configSubgroup).toBeUndefined();
  });

  it('keeps group flat when all files are in the same directory', () => {
    const graph: Graph = {
      nodes: [
        { id: 'src/components/Button.tsx', label: 'Button.tsx', layer: 'ui', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        { id: 'src/components/Modal.tsx', label: 'Modal.tsx', layer: 'ui', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        { id: 'src/components/Input.tsx', label: 'Input.tsx', layer: 'ui', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        // padding
        { id: 'src/a.ts', label: 'a.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        { id: 'src/b.ts', label: 'b.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        { id: 'src/c.ts', label: 'c.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        { id: 'src/d.ts', label: 'd.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        { id: 'src/e.ts', label: 'e.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
      ],
      edges: [],
    };
    const groups = computeFileGroups(graph);

    // No level 1 groups
    const subgroups = groups.filter(g => g.level === 1);
    expect(subgroups).toHaveLength(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/grouping.test.ts -t "subgroup detection"`
Expected: FAIL — subgroups not detected, level 1 groups not created

**Step 3: Implement `detectSubgroups` in `src/engine/grouping.ts`**

Add this function after `buildFileGroup`:

```typescript
const MIN_SUBGROUP_SIZE = 2;

function detectSubgroups(parentGroup: FileGroup, graph: Graph): FileGroup[] {
  // Group files by their immediate subdirectory relative to the group's common root
  const dirMap = new Map<string, string[]>();
  for (const nodeId of parentGroup.nodeIds) {
    const dir = path.dirname(nodeId);
    if (!dirMap.has(dir)) dirMap.set(dir, []);
    dirMap.get(dir)!.push(nodeId);
  }

  // Find the common prefix among all directories
  const dirs = Array.from(dirMap.keys());
  if (dirs.length < 2) return []; // all files in same dir — no subgroups

  // Only keep subdirectories with 2+ files
  const qualifiedDirs = dirs.filter(d => dirMap.get(d)!.length >= MIN_SUBGROUP_SIZE);
  if (qualifiedDirs.length < 2) return []; // need 2+ qualifying subdirs

  const subgroups: FileGroup[] = [];
  const claimedNodeIds = new Set<string>();

  for (const dir of qualifiedDirs) {
    const nodeIds = dirMap.get(dir)!;
    const dirName = path.basename(dir);
    const label = dirName.charAt(0).toUpperCase() + dirName.slice(1);
    const id = `${parentGroup.id}/${dirName}`;

    // Find central node (highest fanIn)
    let centralNodeId = nodeIds[0];
    let maxFanIn = 0;
    for (const nid of nodeIds) {
      const node = graph.nodes.find(n => n.id === nid);
      if (node && node.fanIn > maxFanIn) {
        maxFanIn = node.fanIn;
        centralNodeId = nid;
      }
    }

    subgroups.push({
      id,
      label,
      nodeIds,
      centralNodeId,
      parentGroupId: parentGroup.id,
      level: 1,
    });

    for (const nid of nodeIds) claimedNodeIds.add(nid);
  }

  // Update parent group: remove claimed nodeIds (they belong to subgroups now)
  // Keep unclaimed files directly in the parent
  parentGroup.nodeIds = parentGroup.nodeIds.filter(nid => !claimedNodeIds.has(nid));

  return subgroups;
}
```

**Step 4: Integrate into `computeFileGroups` pipeline**

At the end of `computeFileGroups`, after Pass 3 builds the initial groups, add subgroup detection:

Replace the return statement (line ~101-103) with:

```typescript
  // ── Pass 3: Name resolution ─────────────────────────────────────────
  const groups = finalGroups.map((nodeIds, i) =>
    buildFileGroup(Array.from(nodeIds), graph, i)
  );

  // ── Pass 4: Subgroup detection (directory-based) ────────────────────
  const allGroups: FileGroup[] = [];
  for (const group of groups) {
    allGroups.push(group);
    const subs = detectSubgroups(group, graph);
    allGroups.push(...subs);
  }

  return allGroups;
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/engine/grouping.test.ts`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/engine/grouping.ts tests/engine/grouping.test.ts
git commit -m "feat: add directory-based subgroup detection in grouping engine"
```

---

### Task 3: Update Cytoscape element builder for nested compound nodes

**Files:**
- Modify: `src/ui/components/GraphView.vue:41-56` (buildElements function)

**Step 1: Update the group node creation in `buildElements`**

Replace the group building block (lines 41-56) with logic that handles `parentGroupId`:

```typescript
  // Create group (compound parent) nodes — supports nested subgroups
  const groupNodes: cytoscape.ElementDefinition[] = [];
  const nodeParentMap = new Map<string, string>();

  if (graph.groups?.length) {
    // First pass: create all group nodes (parents before children)
    const level0 = graph.groups.filter(g => g.level === 0 || !g.parentGroupId);
    const level1 = graph.groups.filter(g => g.level === 1 && g.parentGroupId);

    for (const group of level0) {
      const allDescendantIds = getAllDescendantNodeIds(group, graph.groups);
      const visibleDescendants = allDescendantIds.filter(id => nodeIds.has(id));
      if (visibleDescendants.length < 2) continue;
      groupNodes.push({
        data: { id: group.id, label: group.label, type: 'group', level: group.level ?? 0 },
      });
    }

    for (const sub of level1) {
      const visibleChildren = sub.nodeIds.filter(id => nodeIds.has(id));
      if (visibleChildren.length < 2) continue;
      // Only add if parent group was added
      if (!groupNodes.find(g => g.data.id === sub.parentGroupId)) continue;
      groupNodes.push({
        data: {
          id: sub.id,
          label: sub.label,
          type: 'group',
          level: sub.level,
          parent: sub.parentGroupId,
        },
      });
      for (const nid of visibleChildren) {
        nodeParentMap.set(nid, sub.id);
      }
    }

    // Files not claimed by subgroups stay in parent group
    for (const group of level0) {
      if (!groupNodes.find(g => g.data.id === group.id)) continue;
      for (const nid of group.nodeIds) {
        if (nodeIds.has(nid) && !nodeParentMap.has(nid)) {
          nodeParentMap.set(nid, group.id);
        }
      }
    }
  }
```

**Step 2: Add helper function before `buildElements`**

```typescript
function getAllDescendantNodeIds(group: FileGroup, allGroups: FileGroup[]): string[] {
  const ids = [...group.nodeIds];
  const children = allGroups.filter(g => g.parentGroupId === group.id);
  for (const child of children) {
    ids.push(...child.nodeIds);
  }
  return ids;
}
```

Note: import `FileGroup` type at the top of the `<script setup>`:

```typescript
import type { Graph, AnalysisMode, FailingResult, RefactorResult, FileGroup } from '../../types/graph';
```

**Step 3: Build and verify visually**

Run: `npm run build:cli && npx whatbreaks scan demo && npm run dev:ui`
Expected: Groups like "Items" should contain subgroups "Armor", "Weapons", "Accessories" rendered as nested containers

**Step 4: Commit**

```bash
git add src/ui/components/GraphView.vue
git commit -m "feat: render nested subgroups as Cytoscape compound nodes"
```

---

### Task 4: Add subgroup styling

**Files:**
- Modify: `src/ui/utils/graphStyles.ts` (add level-1 group style)

**Step 1: Add subgroup style after the existing group style (after line 67)**

```typescript
    // Subgroup (nested compound) node styles — slightly different from parent groups
    {
      selector: 'node[type="group"][level=1]',
      style: {
        'background-color': '#1e293b',
        'background-opacity': 0.4,
        'border-width': 1,
        'border-style': 'dotted',
        'border-color': '#334155',
        'border-opacity': 0.5,
        'font-size': '9px',
        'padding': '12px',
        'text-margin-y': -3,
      } as unknown as cytoscape.Css.Node,
    },
```

Key visual differences from parent groups:
- `dotted` border (vs `dashed` for parent) — visual hierarchy cue
- Slightly lower opacity (0.4 vs 0.6)
- Smaller font (9px vs 10px)
- Smaller padding (12px vs 16px)

**Step 2: Build and verify visually**

Run: `npm run dev:ui`
Expected: Subgroups should have a subtler appearance inside parent groups

**Step 3: Commit**

```bash
git add src/ui/utils/graphStyles.ts
git commit -m "style: add dotted-border styling for nested subgroups"
```

---

### Task 5: Update focus mode to work with nested groups

**Files:**
- Modify: `src/ui/components/GraphView.vue:161-203` (focus mode handler)

**Step 1: Update the focus mode click handler**

The current focus mode uses `target.descendants()` which already works with nested compounds — Cytoscape's `.descendants()` returns all descendants recursively. However, we need to handle:

1. Clicking a **subgroup** should focus just that subgroup
2. Clicking a **parent group** should focus the parent + all subgroups inside it
3. Both should dim appropriately

The current code at lines 161-203 already does this correctly because:
- `target.descendants()` on a parent returns subgroups + their children
- `target.descendants()` on a subgroup returns just its children

**Verify existing behavior works — no code changes needed if `.descendants()` is recursive.**

Run manual test: Click a parent group → should zoom into the whole group including subgroups. Click a subgroup → should zoom into just that subgroup.

**Step 2: Build and verify**

Run: `npm run dev:ui`
Expected: Focus mode works for both parent groups and subgroups

**Step 3: Commit (only if changes were needed)**

```bash
git add src/ui/components/GraphView.vue
git commit -m "fix: ensure focus mode works correctly with nested subgroups"
```

---

### Task 6: Integration test with demo project

**Files:**
- Modify: `tests/engine/grouping.test.ts` (add integration test)

**Step 1: Write integration test**

Add to the existing `scan pipeline integration` describe block:

```typescript
it('produces subgroups for demo project (deeply nested directories)', async () => {
  const graph = await scanRepository('demo');
  expect(graph.groups).toBeDefined();

  const subgroups = graph.groups!.filter(g => g.level === 1);
  expect(subgroups.length).toBeGreaterThanOrEqual(2);

  // Items group should have armor, weapons, accessories subgroups
  const armorSub = subgroups.find(g =>
    g.label.toLowerCase().includes('armor')
  );
  expect(armorSub).toBeDefined();
  expect(armorSub!.parentGroupId).toBeDefined();

  // Every subgroup should have a valid parent
  for (const sub of subgroups) {
    const parent = graph.groups!.find(g => g.id === sub.parentGroupId);
    expect(parent).toBeDefined();
    expect(parent!.level).toBe(0);
  }

  // Parent groups should exist at level 0
  const topGroups = graph.groups!.filter(g => g.level === 0);
  expect(topGroups.length).toBeGreaterThanOrEqual(2);
});
```

**Step 2: Run the full test suite**

Run: `npx vitest run tests/engine/grouping.test.ts`
Expected: ALL PASS

**Step 3: Run a scan and inspect graph.json**

Run: `npm run build:cli && npx whatbreaks scan demo`
Then inspect `.whatbreaks/graph.json` — groups should show nested structure with parentGroupId.

**Step 4: Commit**

```bash
git add tests/engine/grouping.test.ts
git commit -m "test: add integration test for nested subgroups with demo project"
```

---

## Task Dependency Graph

```
Task 1 (types) → Task 2 (detection) → Task 3 (Cytoscape) → Task 4 (styling)
                                                           → Task 5 (focus mode)
                                         Task 6 (integration test) — after all above
```

Tasks 4 and 5 can be done in parallel after Task 3.

## Verification Checklist

- [ ] `npx vitest run tests/engine/grouping.test.ts` — all pass
- [ ] `npm run build:cli && npx whatbreaks scan demo` — generates graph with subgroups
- [ ] `npm run dev:ui` — subgroups visible as nested containers
- [ ] Focus mode works on both parent groups and subgroups
- [ ] Parent groups with no qualifying subdirectories stay flat (no subgroups)
- [ ] Subdirectories with only 1 file are NOT turned into subgroups
