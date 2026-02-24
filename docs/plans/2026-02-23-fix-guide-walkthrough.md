# Fix Guide Me Walkthrough Navigation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the 6-step Guide Me walkthrough so each step zooms to the correct content — especially making the hub node visible when it's inside a collapsed group, and teaching users about the right-click context menu.

**Architecture:** The walkthrough composable (`useWalkthrough.ts`) gains a context object with `expandGroup`/`collapseGroup` callbacks from `useGroupCollapse`. Steps that target a specific node call `ensureVisible()` to auto-expand the parent group first. A tracking set remembers which groups were expanded so `finish()` can re-collapse them. A new step 5 highlights right-click as the power-user feature.

**Tech Stack:** Vue 3 composables, Cytoscape.js, TypeScript

---

## Bugs Being Fixed

1. **Step 2** ("Your Main Modules") looks identical to step 1 — both fit all elements. Should zoom to group nodes only.
2. **Steps 3 & 4** zoom to empty space because the hub node is inside a collapsed group (`display:none` via `collapsed-child` CSS class). Must expand the group first.
3. **Right-click context menu** (the most powerful feature — "What breaks?", "Show importers", "Copy path") is barely mentioned. Deserves its own step.
4. **No edge dimming** — `walkthrough-dimmed` only targets `node` selector, edges stay bright during dimmed steps.

## Final Step Order (6 steps)

| # | Title | Animation |
|---|-------|-----------|
| 1 | Your Project at a Glance | Fit all elements |
| 2 | Your Main Modules | Fit group nodes only, highlight groups, dim rest |
| 3 | Most Connected File | Expand parent group if collapsed, zoom to hub |
| 4 | What If It Breaks? | Expand + red flash on hub, show test count |
| 5 | Right-Click for Power | Zoom to hub, describe context menu actions |
| 6 | Start Exploring | Reset view, re-collapse expanded groups |

---

### Task 1: Add edge walkthrough-dimmed style

**Files:**
- Modify: `src/ui/utils/graphStyles.ts:533-538`

**Step 1: Add the edge dimming selector**

After the existing `node.walkthrough-dimmed` entry (line 533-538), add a matching edge selector. Insert right before the `walkthrough-impact-flash` block:

```typescript
    // In graphStyles.ts, after the node.walkthrough-dimmed block (line 538):
    {
      selector: 'edge.walkthrough-dimmed',
      style: {
        'opacity': 0.1,
      } as unknown as cytoscape.Css.Edge,
    },
```

**Step 2: Verify build**

Run: `npm run build:ui`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/ui/utils/graphStyles.ts
git commit -m "feat(walkthrough): add edge.walkthrough-dimmed style for step 2 dimming"
```

---

### Task 2: Update useWalkthrough composable

**Files:**
- Modify: `src/ui/composables/useWalkthrough.ts` (full rewrite — 153 lines → ~175 lines)

This is the main change. The composable gets:
- `WalkthroughContext` interface for group expand/collapse
- `walkthroughExpandedGroups` tracking set
- `ensureVisible()` helper
- Fixed step 2, steps 3-4, new step 5, updated step 6

**Step 1: Add WalkthroughContext interface and update function signature**

Add after line 9 (after the `WalkthroughStep` interface):

```typescript
export interface WalkthroughContext {
  expandGroup: (cy: cytoscape.Core, groupId: string) => void;
  collapseGroup: (cy: cytoscape.Core, groupId: string) => void;
}
```

Change function signature from:
```typescript
export function useWalkthrough(graph: () => Graph | null) {
```
To:
```typescript
export function useWalkthrough(graph: () => Graph | null, ctx: WalkthroughContext) {
```

**Step 2: Add tracking set and helpers**

Add after `const currentStep = ref(0);`:

```typescript
const walkthroughExpandedGroups = new Set<string>();
```

Inside the `steps` computed, before the `return [...]`, add two helpers:

```typescript
function clearWalkthroughClasses(cy: cytoscape.Core): void {
  cy.elements().removeClass('walkthrough-highlight walkthrough-dimmed walkthrough-impact-flash');
}

/** Expand collapsed group if node is hidden inside it. */
function ensureVisible(cy: cytoscape.Core, nodeId: string): void {
  const node = cy.getElementById(nodeId);
  if (!node.length) return;
  const parent = node.parent('[type="group"]');
  if (parent.length && node.hasClass('collapsed-child')) {
    ctx.expandGroup(cy, parent.id());
    walkthroughExpandedGroups.add(parent.id());
  }
}
```

**Step 3: Fix Step 2 — fit to group nodes only**

Replace the step 2 `animate` function. Old:
```typescript
animate: (cy: cytoscape.Core) => {
  cy.elements().removeClass('walkthrough-highlight walkthrough-dimmed walkthrough-impact-flash');
  cy.nodes('[type="group"]').addClass('walkthrough-highlight');
  cy.animate({ fit: { eles: cy.elements(), padding: 40 }, duration: 600, easing: 'ease-out-cubic' });
},
```

New:
```typescript
animate: (cy: cytoscape.Core) => {
  clearWalkthroughClasses(cy);
  const groupNodes = cy.nodes('[type="group"]');
  if (groupNodes.length) {
    groupNodes.addClass('walkthrough-highlight');
    cy.nodes().not(groupNodes).addClass('walkthrough-dimmed');
    cy.edges().addClass('walkthrough-dimmed');
    cy.animate({ fit: { eles: groupNodes, padding: 50 }, duration: 600, easing: 'ease-out-cubic' });
  } else {
    cy.animate({ fit: { eles: cy.elements(), padding: 40 }, duration: 600, easing: 'ease-out-cubic' });
  }
},
```

Key changes: (a) dims non-group nodes AND edges, (b) fits to `groupNodes` not `cy.elements()`.

**Step 4: Fix Steps 3 & 4 — call ensureVisible before centering**

For step 3 ("Most Connected File"), add `ensureVisible` call and use the helper:
```typescript
animate: (cy: cytoscape.Core) => {
  clearWalkthroughClasses(cy);
  if (hub) {
    ensureVisible(cy, hub.id);
    const hubNode = cy.getElementById(hub.id);
    if (hubNode.length) {
      cy.nodes().not(hubNode).not('[type="group"]').addClass('walkthrough-dimmed');
      hubNode.addClass('walkthrough-highlight');
      cy.animate({ center: { eles: hubNode }, zoom: 1.5, duration: 600, easing: 'ease-out-cubic' });
    }
  }
},
```

For step 4 ("What If It Breaks?"), same pattern with impact flash:
```typescript
animate: (cy: cytoscape.Core) => {
  clearWalkthroughClasses(cy);
  if (hub) {
    ensureVisible(cy, hub.id);
    const hubNode = cy.getElementById(hub.id);
    if (hubNode.length) {
      cy.nodes().not(hubNode).not('[type="group"]').addClass('walkthrough-dimmed');
      hubNode.addClass('walkthrough-impact-flash');
      cy.animate({ center: { eles: hubNode }, zoom: 1.5, duration: 600, easing: 'ease-out-cubic' });
    }
  }
},
```

**Step 5: Add new Step 5 — "Right-Click for Power"**

Insert as 5th element in the steps array (before the final "Start Exploring"):

```typescript
{
  title: 'Right-Click for Power',
  description: hub
    ? `Right-click any file to: Simulate Break, Show Importers, or Copy Path. Try it on ${hub.label}!`
    : 'Right-click any file for actions: Simulate Break, Show Importers, Copy Path',
  animate: (cy: cytoscape.Core) => {
    clearWalkthroughClasses(cy);
    if (hub) {
      ensureVisible(cy, hub.id);
      const hubNode = cy.getElementById(hub.id);
      if (hubNode.length) {
        hubNode.addClass('walkthrough-highlight');
        cy.animate({ center: { eles: hubNode }, zoom: 1.5, duration: 600, easing: 'ease-out-cubic' });
      }
    }
  },
},
```

**Step 6: Update "Start Exploring" step and finish()**

Update the last step to use `clearWalkthroughClasses`:
```typescript
{
  title: 'Start Exploring',
  description: 'Click folders to expand, files for dependency chains, right-click for actions',
  animate: (cy: cytoscape.Core) => {
    clearWalkthroughClasses(cy);
    cy.animate({ fit: { eles: cy.elements(), padding: 40 }, duration: 600, easing: 'ease-out-cubic' });
  },
},
```

Update `start()` to clear the tracking set:
```typescript
function start(cy?: cytoscape.Core) {
  walkthroughExpandedGroups.clear();
  isActive.value = true;
  currentStep.value = 0;
  if (cy) steps.value[0]?.animate(cy);
}
```

Update `finish()` to re-collapse expanded groups:
```typescript
function finish(cy?: cytoscape.Core) {
  isActive.value = false;
  currentStep.value = 0;
  if (cy) {
    cy.elements().removeClass('walkthrough-highlight walkthrough-dimmed walkthrough-impact-flash');
    // Re-collapse groups that were expanded during walkthrough
    for (const groupId of walkthroughExpandedGroups) {
      ctx.collapseGroup(cy, groupId);
    }
    walkthroughExpandedGroups.clear();
    cy.animate({ fit: { eles: cy.elements(), padding: 40 }, duration: 400, easing: 'ease-out-cubic' });
  }
}
```

**Step 7: Verify build**

Run: `npm run build:ui`
Expected: Build succeeds (no errors).

**Step 8: Commit**

```bash
git add src/ui/composables/useWalkthrough.ts
git commit -m "feat(walkthrough): fix step 2 zoom, expand collapsed groups for hub, add right-click step"
```

---

### Task 3: Wire context in App.vue (2-line change)

**Files:**
- Modify: `src/ui/App.vue:19-20` and `src/ui/App.vue:40`

**Step 1: Add import**

After line 19 (`import { useWalkthrough } from './composables/useWalkthrough';`), add:
```typescript
import { expandGroup, collapseGroup } from './composables/useGroupCollapse';
```

**Step 2: Pass context to useWalkthrough**

Change line 40 from:
```typescript
const walkthrough = useWalkthrough(() => graph.value);
```
To:
```typescript
const walkthrough = useWalkthrough(() => graph.value, { expandGroup, collapseGroup });
```

**Step 3: Verify build**

Run: `npm run build:ui`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/ui/App.vue
git commit -m "feat(walkthrough): wire expandGroup/collapseGroup context into useWalkthrough"
```

---

### Task 4: Build and manual verification

**Step 1: Full build**

```bash
npm run build:cli && npm run build:ui
```

**Step 2: Scan demo project**

```bash
node dist/cli/index.js scan demo/
```

**Step 3: Serve**

```bash
node dist/cli/index.js serve --port 4567
```

**Step 4: Use agent-browser to verify all 6 steps**

Open `http://localhost:4567` and click "Guide me". Verify:

1. **Step 1** — full graph visible, all elements shown
2. **Step 2** — zooms to group nodes, non-groups are dimmed (including edges)
3. **Step 3** — hub node (`damageCalculator.ts`) is visible and highlighted. Parent group was expanded if it was collapsed.
4. **Step 4** — same hub node with red flash. Test count shown in description.
5. **Step 5** — hub highlighted, description mentions right-click actions
6. **Step 6** — resets view, re-collapses any groups that were expanded

Also test:
- **Back button**: Step 3 → 2 → 3 should re-expand the group correctly
- **Skip**: Should re-collapse expanded groups and reset view
- **Impact analysis during walkthrough**: Auto-dismisses walkthrough (existing behavior)

**Step 5: Take screenshots for verification**

Screenshot each step for visual confirmation.
