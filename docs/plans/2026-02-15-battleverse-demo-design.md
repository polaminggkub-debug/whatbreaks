# BattleVerse Demo Design

## Purpose

Demo project for WhatBreaks - showcases chain reaction when a shared dependency breaks.
Pure TypeScript library. No UI, no database, no external APIs.

## Demo Flow

1. `npm test` → 205 tests green
2. Change `*` to `+` in `damageCalculator.ts`
3. `npm test` → 170 fail, 35 pass
4. `whatbreaks impact damageCalculator.ts` → blast radius visualization
5. Revert

## File Structure

```
demo/
  src/
    core/
      config/globalCombatConfig.ts          ← L0: root config
      element/elementResolver.ts            ← L1: primitive
      element/types.ts
      crit/critEngine.ts                    ← L1: primitive
      defense/defenseCalculator.ts          ← L1: primitive
      defense/types.ts
      damage/damageCalculator.ts            ← L2: THE HUB
      damage/calculateFinalDamage.ts        ← L3: wrapper
      damage/types.ts
      status/statusEngine.ts                ← L4: consumer
      status/types.ts
      xp/xpEngine.ts                        ← L5: secondary
      analytics/analyticsEngine.ts           ← L6: observer
    skills/
      fire/fireball.ts ember.ts inferno.ts flameWave.ts blazeStrike.ts
      ice/frostbolt.ts blizzard.ts iceSpear.ts glacialSlash.ts freeze.ts
      lightning/thunderbolt.ts sparkChain.ts stormCall.ts shockwave.ts voltStrike.ts
      earth/rockSlam.ts earthquake.ts stoneWall.ts mudSlide.ts boulderToss.ts
      wind/gust.ts tornado.ts airSlash.ts cyclone.ts windBlade.ts
    items/
      weapons/sword.ts bow.ts staff.ts axe.ts dagger.ts hammer.ts spear.ts wand.ts
      armor/plate.ts chain.ts leather.ts robe.ts shield.ts helm.ts
      accessories/ring.ts amulet.ts belt.ts boots.ts gloves.ts cloak.ts
    battle/
      battleEngine.ts turnResolver.ts comboResolver.ts
    characters/
      createCharacter.ts characterTypes.ts
      presets/warrior.ts mage.ts archer.ts healer.ts assassin.ts
  tests/
    unit/core/ unit/skills/ unit/items/ unit/battle/ unit/characters/
    integration/
    e2e/
  scripts/demo.ts
  package.json
  tsconfig.json
  vitest.config.ts
  README.md
```

~90 source files, ~205 tests

## Dependency Chain (8 layers)

```
L0: globalCombatConfig
L1: elementResolver, critEngine, defenseCalculator  → globalCombatConfig
L2: damageCalculator → elementResolver, critEngine, defenseCalculator, globalCombatConfig
L3: calculateFinalDamage → damageCalculator, globalCombatConfig
L4: skills(25), items(20), statusEngine, battleEngine, comboResolver → calculateFinalDamage
L5: xpEngine → battleEngine, calculateFinalDamage
L6: analyticsEngine → battleEngine
L7: createCharacter → xpEngine
L8: presets(5) → createCharacter
```

## Test Strategy

- All damage-related tests use exact assertions: `expect(result).toBe(137)`
- Integration tests assert outcomes: `expect(battleResult.winner).toBe('Player')`
- 35 tests are damage-insensitive (stay green after bug injection)

### Breakdown

| Layer | Tests | Fail on bug? |
|-------|-------|-------------|
| globalCombatConfig structural | 5 | No |
| elementResolver type-check | 5 | No |
| createCharacter factory | 5 | No |
| Input validation across engines | 10 | No |
| Character preset structure | 5 | No |
| Utility/helper | 5 | No |
| Skill unit tests | 75 | Yes |
| Item unit tests | 30 | Yes |
| Core engine unit tests | 25 | Yes |
| Integration battle flows | 25 | Yes |
| Integration outcome tests | 10 | Yes |
| E2E simulations | 15 | Yes |

## Bug Injection

In `damageCalculator.ts`:
```ts
// Original
input.baseDamage * levelBonus * elementMult * critMult * defReduction
// Bug
input.baseDamage + levelBonus * elementMult * critMult * defReduction
```

## Demo Script (`npm run demo`)

1. Run tests → show green count
2. Inject bug (file swap)
3. Run tests → show red/green breakdown
4. Run whatbreaks impact → show blast radius
5. Restore original
