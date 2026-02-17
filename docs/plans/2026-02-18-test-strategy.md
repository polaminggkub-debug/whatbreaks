# WhatBreaks Test Strategy — Unit + Integration Tests

## Approach: Hybrid

- **Scanner** → Integration tests with real fixture files (needs filesystem)
- **Engine** → Unit tests with constructed Graph objects (pure logic, no I/O)

## Fixture Projects

```
tests/fixtures/
├── basic-imports/           # Simple A→B imports, nested dirs, mixed default+named
├── js-to-ts-resolution/     # ESM .js extension → .ts files
├── type-only-imports/        # import type { X } from '...'
├── index-resolution/         # Directory imports via index.ts, barrel exports
├── test-mapping/             # *.test.ts files importing source, transitive mapping
├── circular-deps/            # A → B → A
└── layered-project/          # pages/ widgets/ features/ entities/ shared/
```

Each fixture is 2-5 files. Tests ONE specific behavior.

## Scanner Integration Tests (20 tests)

### importParser.test.ts (11 tests)

| # | Test | Fixture |
|---|------|---------|
| 1 | Basic: `import { foo } from './b'` → resolves to b.ts | basic-imports |
| 2 | ESM .js→.ts: `import { foo } from './b.js'` → resolves to b.ts | js-to-ts-resolution |
| 3 | Type-only: `import type { X } from './types'` → creates edge | type-only-imports |
| 4 | Index: `import { x } from './utils'` → resolves to utils/index.ts | index-resolution |
| 5 | Parent dir: `import { x } from '../shared/helper'` → resolves | basic-imports (nested) |
| 6 | Non-existent import → skipped gracefully, no crash | basic-imports |
| 7 | Re-export: A→B, B re-exports C → both edges exist | basic-imports |
| 8 | Circular: A→B, B→A → both edges exist, no crash | circular-deps |
| 9 | Barrel: `export * from './foo'` in index.ts → resolves through | index-resolution |
| 10 | Mixed: `import foo, { bar } from './utils'` → edge created | basic-imports |
| 11 | node_modules imports → skipped, no edge | basic-imports |

### testMapper.test.ts (4 tests)

| # | Test | Fixture |
|---|------|---------|
| 1 | foo.test.ts importing foo.ts → test-covers edge | test-mapping |
| 2 | .test.ts suffix → node type = test | test-mapping |
| 3 | Test→Helper→Source → transitive test-covers | test-mapping |
| 4 | testUtils.ts (not a test) → type = source | test-mapping |

### layerClassifier.test.ts (5 tests)

| # | Test |
|---|------|
| 1 | src/pages/Home.ts → page |
| 2 | src/components/Button.ts → ui |
| 3 | src/shared/utils.ts → shared |
| 4 | src/foo.test.ts → test |
| 5 | src/app.config.ts → config |

## Engine Unit Tests (25 tests)

### impact.test.ts (7 tests)

| # | Test | Graph |
|---|------|-------|
| 1 | Forward: A→B→C from A → [B, C] | chain |
| 2 | Backward: A→B→C from C → [B, A] | chain |
| 3 | Fan-out: A→B, A→C, A→D from A → [B,C,D] | star |
| 4 | Cycle: A→B→C→A from A → [B,C], no hang | cycle |
| 5 | Isolated node → empty result | single |
| 6 | Deep chain: A→B→C→D→E → correct depth | 5-deep |
| 7 | Self-import: A→A → returns A, no hang | self-edge |

### failing.test.ts (5 tests)

| # | Test |
|---|------|
| 1 | Test→A→B→C deepest-first → [C, B, A] |
| 2 | Diamond: Test→A→C, Test→B→C → C once, ranked deepest |
| 3 | Test with no imports → empty chain |
| 4 | Two independent chains → both in results |
| 5 | Circular in chain: Test→A→B→A → [A, B], no hang |

### refactor.test.ts (7 tests)

| # | Test |
|---|------|
| 1 | Refactor B where A→B←C → affected = [A, C] |
| 2 | Test1→A→B, refactor B → affected tests = [Test1] |
| 3 | Leaf node (no dependents) → empty blast radius |
| 4 | Transitive: A→B→C, refactor C → A in blast radius |
| 5 | Test command generation → correct vitest command |
| 6 | Multiple tests: Test1→B, Test2→B, Test3→B → all 3 returned |
| 7 | Test→Helper→Source, refactor Source → Test in affected |

### risk.test.ts (6 tests)

| # | Test |
|---|------|
| 1 | Hotspot: B has 5 importers → top hotspot |
| 2 | Chain depth: A→B→C→D = depth 3 |
| 3 | Circular: A→B→A → detected |
| 4 | Triangle: A→B→C→A → detected |
| 5 | No cycles → empty list |
| 6 | Hotspot with tests: 3 source + 2 test importers → fan-in = 5 |

## Total: 45 tests

- 20 scanner (integration)
- 25 engine (unit)
- All run via `npm test` (vitest)
