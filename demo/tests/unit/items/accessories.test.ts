import { describe, it, expect } from 'vitest';
import { applyAccessoryBonus as ringBonus } from '../../../src/items/accessories/ring.js';
import { applyAccessoryBonus as amuletBonus } from '../../../src/items/accessories/amulet.js';
import { applyAccessoryBonus as beltBonus } from '../../../src/items/accessories/belt.js';
import { applyAccessoryBonus as bootsBonus } from '../../../src/items/accessories/boots.js';
import { applyAccessoryBonus as glovesBonus } from '../../../src/items/accessories/gloves.js';
import { applyAccessoryBonus as cloakBonus } from '../../../src/items/accessories/cloak.js';

// applyAccessoryBonus(baseDamage, attackerLevel, targetDefense)
// -> calculateFinalDamage with neutral, critSeed=1, no crit
// flatBonusDamage=FLAT, bonusDamagePercent=BONUS_VALUE
// levelBonus = 1 + attackerLevel*0.05
// rawDamage = baseDamage * levelBonus
// defReduction = 100/(100+targetDefense)
// finalDamage = round(rawDamage * defReduction)
// bonusDamage = round(finalDamage * BONUS_VALUE / 100) + FLAT
// totalDamage = finalDamage + bonusDamage -> returned as boostedDamage

// All tests: baseDamage=100, lv5, defense=0
// levelBonus=1.25, rawDamage=125, defReduction=1.0, finalDamage=125

describe('accessories', () => {
  // RING: BONUS=15, FLAT=5
  // bonusDamage = round(125*15/100) + 5 = round(18.75) + 5 = 19 + 5 = 24
  // total = 125 + 24 = 149
  it('ring: 100 base, lv5, def 0 = 149', () => {
    const r = ringBonus(100, 5, 0);
    expect(r.boostedDamage).toBe(149);
  });

  // AMULET: BONUS=20, FLAT=10
  // bonusDamage = round(125*20/100) + 10 = 25 + 10 = 35
  // total = 125 + 35 = 160
  it('amulet: 100 base, lv5, def 0 = 160', () => {
    const r = amuletBonus(100, 5, 0);
    expect(r.boostedDamage).toBe(160);
  });

  // BELT: BONUS=10, FLAT=8
  // bonusDamage = round(125*10/100) + 8 = round(12.5) + 8 = 13 + 8 = 21
  // total = 125 + 21 = 146
  it('belt: 100 base, lv5, def 0 = 146', () => {
    const r = beltBonus(100, 5, 0);
    expect(r.boostedDamage).toBe(146);
  });

  // BOOTS: BONUS=12, FLAT=3
  // bonusDamage = round(125*12/100) + 3 = round(15) + 3 = 15 + 3 = 18
  // total = 125 + 18 = 143
  it('boots: 100 base, lv5, def 0 = 143', () => {
    const r = bootsBonus(100, 5, 0);
    expect(r.boostedDamage).toBe(143);
  });

  // GLOVES: BONUS=18, FLAT=6
  // bonusDamage = round(125*18/100) + 6 = round(22.5) + 6 = 23 + 6 = 29
  // total = 125 + 29 = 154
  it('gloves: 100 base, lv5, def 0 = 154', () => {
    const r = glovesBonus(100, 5, 0);
    expect(r.boostedDamage).toBe(154);
  });

  // CLOAK: BONUS=8, FLAT=12
  // bonusDamage = round(125*8/100) + 12 = round(10) + 12 = 10 + 12 = 22
  // total = 125 + 22 = 147
  it('cloak: 100 base, lv5, def 0 = 147', () => {
    const r = cloakBonus(100, 5, 0);
    expect(r.boostedDamage).toBe(147);
  });
});
