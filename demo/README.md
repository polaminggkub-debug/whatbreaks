# BattleVerse Engine

A battle simulator engine built as a demo for [WhatBreaks](https://github.com/polamin/whatbreaks) - showing how changing one line in a shared dependency causes a massive chain reaction across the test suite.

## Quick Start

```bash
cd demo
npm install
npm test          # All 205 tests pass
npm run demo      # Automated chain reaction demo
```

## What This Demonstrates

**The Problem:** In any codebase, certain files are "hubs" - they're imported by dozens of other modules. Changing these hubs has a blast radius that's hard to predict.

**The Demo:** `damageCalculator.ts` is used by every skill, item, battle engine, XP system, and analytics module. Change one operator (`*` to `+`) and 170+ tests break across the entire system.

## Manual Walkthrough

### 1. Run tests (all green)

```bash
npm test
# 205 tests passed
```

### 2. Introduce a subtle bug

Open `src/core/damage/damageCalculator.ts` and change line 16:

```diff
- const rawDamage = input.baseDamage * levelBonus * elementMult * critMult;
+ const rawDamage = input.baseDamage + levelBonus * elementMult * critMult;
```

This compiles fine. No syntax errors. No runtime crashes.

### 3. Run tests again

```bash
npm test
# 170 failed, 35 passed
```

### 4. Use WhatBreaks to understand the blast radius

```bash
cd ..
whatbreaks scan demo/
whatbreaks serve
# Open http://localhost:4567
# Click on damageCalculator.ts to see the impact
```

Or from CLI:

```bash
whatbreaks impact demo/src/core/damage/damageCalculator.ts
```

### 5. Revert the bug

```bash
git checkout demo/src/core/damage/damageCalculator.ts
```

## Architecture

```
globalCombatConfig (L0)
    |
    v
elementResolver / critEngine / defenseCalculator (L1)
    |
    v
damageCalculator (L2) <-- THE HUB
    |
    v
calculateFinalDamage (L3)
    |
    v
25 skills / 20 items / statusEngine / battleEngine (L4)
    |
    v
xpEngine (L5)
    |
    v
analyticsEngine (L6)
    |
    v
createCharacter + presets (L7)
```

Change anything at L0-L2 and watch the cascade ripple through every layer below.

## File Counts

| Category | Files | Tests |
|----------|-------|-------|
| Core modules | 12 | 67 |
| Skills | 25 | 75 |
| Items | 20 | 28 |
| Battle | 3 | 15 |
| Characters | 7 | 5 |
| Integration | - | 40 |
| E2E | - | 15 |
| **Total** | **67** | **~205** |

## Test Pyramid

- **Unit tests (~150):** Every skill, item, and engine module with exact numeric assertions
- **Integration tests (~40):** Battle flows, combos, status stacking, XP progression
- **E2E tests (~15):** Full battle simulations, boss fights, level-up scenarios

35 tests are "damage-insensitive" (structural checks, factory tests, config validation) and survive the bug injection - making the failure pattern realistic.
