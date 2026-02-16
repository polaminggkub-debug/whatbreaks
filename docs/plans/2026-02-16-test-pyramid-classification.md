# Test Pyramid Classification

## Goal

Classify test files by level (unit / integration / e2e) instead of treating all tests as a flat `type: 'test'`. This enables blast radius analysis to show impact severity — a failing E2E test has wider scope than a failing unit test.

## Type System Changes

In `src/types/graph.ts`:

```typescript
export type TestLevel = 'unit' | 'integration' | 'e2e';
```

Add `testLevel?: TestLevel` to `GraphNode` (only set when `type === 'test'`).

## Detection Chain

Priority order — first match wins:

1. **Config glob override** — `.whatbreaks.config.json` `testLevels` mapping (optional, never required)
2. **Directory convention** — regex against file path
3. **Filename convention** — regex against basename
4. **Import heuristic** — reuse parsed imports from scanner (no extra fs reads)
5. **Default** — `unit`

### Layer 1: Config Override

```json
{
  "testLevels": {
    "**/e2e/**": "e2e",
    "**/specs/**": "integration"
  }
}
```

Glob matching via micromatch. Solves AI repos, monorepos, custom layouts.

### Layer 2: Directory Convention

```
e2e:         /(e2e|e2e-tests|cypress|playwright)/
integration: /(integration|integration-tests)/
unit:        /(unit|unit-tests|__tests__)/
```

### Layer 3: Filename Convention

```
e2e:         *.e2e.spec.ts, *.e2e.test.ts, *.e2e.ts
integration: *.integration.test.ts, *.int.test.ts
```

### Layer 4: Import Heuristic

From already-parsed AST imports (no extra file reads):

```
@playwright/test, cypress  → e2e
supertest, @nestjs/testing → integration
```

### Layer 5: Default

`unit` — safe default since most tests in the wild are unit tests.

## Scanner Changes

- `testMapper.ts`: Add `classifyTestLevel(filePath, imports)` function
- `index.ts`: Set `testLevel` on test nodes during node building
- No changes to edge logic — `test-covers` edges work the same regardless of level

## Demo Changes

### Easy Demo (Todo App) — Restructure + Add Playwright

```
demo-simple/tests/
  unit/
    todo.test.ts              (moved)
    validator.test.ts         (moved)
    formatter.test.ts         (moved)
  integration/
    todoService.test.ts       (moved)
    todoController.test.ts    (moved)
    userService.test.ts       (moved)
  e2e/
    app.e2e.spec.ts           (NEW — Playwright happy path)
```

Happy path: create todo, mark complete, verify done.

### BattleVerse Demo — Add Playwright

```
demo/tests/e2e/
  fullBattle.test.ts          (existing)
  partyBattle.test.ts         (existing)
  bossFight.test.ts           (existing)
  levelUp.test.ts             (existing)
  battleUI.e2e.spec.ts        (NEW — Playwright happy path)
```

Happy path: open battle UI, select characters, start battle, verify winner.

Both are stub Playwright tests — import `@playwright/test` and reference source modules so WhatBreaks can detect edges. The app does not need to run. WhatBreaks only reads imports, not runtime behavior.

## README Update

Add "Supported test types" section:

- Classify by level, not runner
- Detection priority table
- "WhatBreaks does NOT run tests. It only analyzes file relationships."
- "Works even with messy AI-generated test folders" example
- Recognized test file patterns (runner-agnostic) table

## Edge Fix (Already Done)

Test files no longer get duplicate edges. Previously each test→source pair had both an "import" edge and a "test-covers" edge. Now test files only get "test-covers" edges.

## Out of Scope (MVP)

- Component test level
- Confidence score on classification
- Test runner metadata on nodes
- Visual pyramid widget in UI
