# Test Pyramid UI Visualization

## Goal

Make the test pyramid visible in the graph UI. Currently `testLevel` exists in graph.json but the UI renders all test nodes identically. After this work, users will instantly see which tests are unit/integration/e2e by color.

## Prerequisites (Already Done)

- `TestLevel` type exists in `src/types/graph.ts`
- `testLevel` field set on test nodes during scanning
- `classifyTestLevel()` working with 5-layer detection chain
- Both demos restructured with unit/integration/e2e directories

## Task 1: Shared Test Level Colors

Add `TEST_LEVEL_COLORS` to `src/ui/utils/constants.ts`:

```typescript
import type { TestLevel } from '../../types/graph.js';

export const TEST_LEVEL_COLORS: Record<TestLevel, string> = {
  unit: '#94a3b8',        // Gray — quiet, bulk of pyramid
  integration: '#60a5fa', // Blue — middle layer
  e2e: '#f59e0b',         // Amber — top of pyramid, high visibility
};
```

Import from this single source everywhere. No duplicate color definitions.

## Task 2: Cytoscape Node Styling

In `src/ui/components/GraphView.vue`:

**Pass testLevel in node data:**
```typescript
data: {
  ...existing,
  testLevel: n.testLevel ?? 'unit',
}
```

**Add Cytoscape style selectors** (after existing hub styles):
```typescript
{
  selector: 'node[type="test"][testLevel="unit"]',
  style: { 'background-color': '#94a3b8', 'border-color': '#94a3b8' }
},
{
  selector: 'node[type="test"][testLevel="integration"]',
  style: { 'background-color': '#60a5fa', 'border-color': '#60a5fa' }
},
{
  selector: 'node[type="test"][testLevel="e2e"]',
  style: { 'background-color': '#f59e0b', 'border-color': '#f59e0b' }
},
```

Remove inline color mapping for test nodes — let Cytoscape selectors handle it.

## Task 3: NodePanel Badge

In `src/ui/components/NodePanel.vue`, when a test node is selected, show test level:

```html
<div v-if="node.type === 'test'">
  <div class="section-label">Test Level</div>
  <span class="badge" :style="{ background: testLevelColor }">
    {{ node.testLevel ?? 'unit' }}
  </span>
</div>
```

Import `TEST_LEVEL_COLORS` from shared constants for the color lookup.

## Task 4: Legend Update

Add a "TEST PYRAMID" section to the legend. Order must be pyramid (top to bottom):

```
LAYERS
● Foundation  ● Core  ● Feature  ● Entry

TEST PYRAMID
● E2E
● Integration
● Unit
```

Requirements:
- Section headers with label styling (uppercase, ~60% opacity)
- Pyramid order: E2E first, Unit last
- Use `TEST_LEVEL_COLORS` for dot colors
- Clickable: clicking a level highlights only those test nodes (dims everything else)

## Task 5: Realistic Playwright Happy Path Tests

Rewrite the stub Playwright tests in both demos.

**Rules for realism:**
- Import only `@playwright/test` (`test`, `expect`)
- Import shared **types** for test data (not controllers/services)
- Use `data-testid` selectors (`page.getByTestId(...)`)
- Include one intentionally failing test for blast radius demo

### Easy Demo (`demo-simple/tests/e2e/app.e2e.spec.ts`):

```typescript
import { test, expect } from '@playwright/test';
import type { Todo } from '../../src/models/todo.js';

test.describe('Todo App - Happy Path', () => {
  test('create and complete a todo', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('todo-input').fill('Buy groceries');
    await page.getByTestId('add-todo-btn').click();
    await expect(page.getByTestId('todo-item').first()).toContainText('Buy groceries');
    await page.getByTestId('complete-btn').first().click();
    await expect(page.getByTestId('todo-item').first()).toHaveClass(/completed/);
  });

  test('shows empty state message', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('empty-state')).toBeVisible();
  });

  // Intentionally failing test — for blast radius demo
  test('todo shows correct count after deletion', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('todo-count')).toHaveText('0 items');
    // This will fail — demonstrates WhatBreaks blast radius detection
  });
});
```

### BattleVerse (`demo/tests/e2e/battleUI.e2e.spec.ts`):

```typescript
import { test, expect } from '@playwright/test';
import type { DamageInput } from '../../src/core/damage/types.js';
import type { Character } from '../../src/characters/characterTypes.js';

test.describe('BattleVerse UI - Happy Path', () => {
  test('complete a full battle flow', async ({ page }) => {
    await page.goto('/battle');
    await page.getByTestId('character-select-p1').selectOption('warrior');
    await page.getByTestId('character-select-p2').selectOption('mage');
    await page.getByTestId('start-battle-btn').click();
    await expect(page.getByTestId('battle-log')).toBeVisible();
    await expect(page.getByTestId('winner-display')).toBeVisible();
  });

  test('show damage breakdown in results', async ({ page }) => {
    await page.goto('/battle');
    await page.getByTestId('character-select-p1').selectOption('assassin');
    await page.getByTestId('character-select-p2').selectOption('healer');
    await page.getByTestId('start-battle-btn').click();
    await expect(page.getByTestId('damage-breakdown')).toBeVisible();
    await expect(page.getByTestId('round-count')).not.toHaveText('0');
  });

  // Intentionally failing test — for blast radius demo
  test('battle history persists after page reload', async ({ page }) => {
    await page.goto('/battle/history');
    await expect(page.getByTestId('history-list')).toHaveCount(5);
    // This will fail — demonstrates WhatBreaks blast radius detection
  });
});
```

Key: type imports create graph edges to models/types layer, which cascades to deeper source files. E2E nodes connect to the type layer, showing realistic dependency flow.

## Task 6: Build and Verify

1. Build UI (`npm run build:ui`)
2. Scan both demos
3. Verify: test nodes have correct colors in graph
4. Verify: clicking test node shows testLevel badge in panel
5. Verify: legend shows TEST PYRAMID section
6. Verify: e2e test nodes are amber, integration blue, unit gray

## Out of Scope

- Runtime coverage-based e2e edges (future: replace type imports with real coverage data)
- Node shape differences per test level
- Node size scaling by test level
- Pyramid count widget
