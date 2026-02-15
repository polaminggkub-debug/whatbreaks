import { describe, it, expect } from 'vitest';
import { calculateDamage } from '../../../src/core/damage/damageCalculator.js';

describe('damageCalculator', () => {
  // Test 1: baseDamage:100, level:10, fire vs ice, critChance:0, critSeed:1, defense:50
  // levelBonus = 1 + 10*0.05 = 1.5
  // elementMult = 2.0 (fire vs ice)
  // critMult = 1.0 (seed 1 > getCritChance(0)=0.05)
  // defReduction = 100/150 = 0.6667
  // rawDamage = 100 * 1.5 * 2.0 * 1.0 = 300
  // finalDamage = round(300 * 0.6667) = round(200) = 200
  it('100 base, lv10, fire vs ice, no crit, def 50 = 200', () => {
    const r = calculateDamage({ baseDamage: 100, attackerLevel: 10, element: 'fire', targetElement: 'ice', critChance: 0, critSeed: 1, targetDefense: 50 });
    expect(r.finalDamage).toBe(200);
    expect(r.rawDamage).toBe(300);
    expect(r.wasCrit).toBe(false);
  });

  // Test 2: baseDamage:100, level:1, neutral vs neutral, critSeed:1, defense:0
  // levelBonus = 1.05, elementMult = 1.0, critMult = 1.0, defReduction = 1.0
  // rawDamage = 100 * 1.05 = 105, finalDamage = round(105) = 105
  it('100 base, lv1, neutral, no crit, def 0 = 105', () => {
    const r = calculateDamage({ baseDamage: 100, attackerLevel: 1, element: 'neutral', targetElement: 'neutral', critChance: 0, critSeed: 1, targetDefense: 0 });
    expect(r.finalDamage).toBe(105);
    expect(r.rawDamage).toBe(105);
  });

  // Test 3: baseDamage:50, level:20, fire vs fire (0.5), critSeed:1, defense:100
  // levelBonus = 1 + 20*0.05 = 2.0
  // elementMult = 0.5, critMult = 1.0
  // rawDamage = 50 * 2.0 * 0.5 = 50
  // defReduction = 100/200 = 0.5
  // finalDamage = round(50 * 0.5) = 25
  it('50 base, lv20, fire vs fire (resisted), def 100 = 25', () => {
    const r = calculateDamage({ baseDamage: 50, attackerLevel: 20, element: 'fire', targetElement: 'fire', critChance: 0, critSeed: 1, targetDefense: 100 });
    expect(r.finalDamage).toBe(25);
    expect(r.rawDamage).toBe(50);
  });

  // Test 4: WITH CRIT. baseDamage:100, level:1, neutral, critChance:0.5, critSeed:0, defense:0
  // getCritChance(0.5) = min((0.05+0.5)*1.0, 1.0) = 0.55, seed 0 < 0.55 -> crit 1.5
  // levelBonus = 1.05, elementMult = 1.0
  // rawDamage = 100 * 1.05 * 1.0 * 1.5 = 157.5 -> round = 158
  // finalDamage = round(157.5 * 1.0) = 158
  it('100 base, lv1, neutral, crit (seed 0), def 0 = 158', () => {
    const r = calculateDamage({ baseDamage: 100, attackerLevel: 1, element: 'neutral', targetElement: 'neutral', critChance: 0.5, critSeed: 0, targetDefense: 0 });
    expect(r.finalDamage).toBe(158);
    expect(r.rawDamage).toBe(158);
    expect(r.wasCrit).toBe(true);
  });

  // Test 5: baseDamage:200, level:5, ice vs earth (2.0), critSeed:1, defense:0
  // levelBonus = 1.25, elementMult = 2.0, critMult = 1.0
  // rawDamage = 200 * 1.25 * 2.0 = 500
  // finalDamage = 500
  it('200 base, lv5, ice vs earth, no crit, def 0 = 500', () => {
    const r = calculateDamage({ baseDamage: 200, attackerLevel: 5, element: 'ice', targetElement: 'earth', critChance: 0, critSeed: 1, targetDefense: 0 });
    expect(r.finalDamage).toBe(500);
    expect(r.rawDamage).toBe(500);
  });

  // Test 6: baseDamage:80, level:10, lightning vs wind (2.0), critSeed:1, defense:100
  // levelBonus = 1.5, elementMult = 2.0, critMult = 1.0
  // rawDamage = 80 * 1.5 * 2.0 = 240
  // defReduction = 100/200 = 0.5
  // finalDamage = round(240 * 0.5) = 120
  it('80 base, lv10, lightning vs wind, no crit, def 100 = 120', () => {
    const r = calculateDamage({ baseDamage: 80, attackerLevel: 10, element: 'lightning', targetElement: 'wind', critChance: 0, critSeed: 1, targetDefense: 100 });
    expect(r.finalDamage).toBe(120);
    expect(r.rawDamage).toBe(240);
  });

  // Test 7: baseDamage:60, level:1, earth vs lightning (2.0), critSeed:0, critChance:0, defense:0
  // getCritChance(0) = 0.05, seed 0 < 0.05 -> crit 1.5
  // levelBonus = 1.05, elementMult = 2.0
  // rawDamage = 60 * 1.05 * 2.0 * 1.5 = 189
  // finalDamage = 189
  it('60 base, lv1, earth vs lightning, crit, def 0 = 189', () => {
    const r = calculateDamage({ baseDamage: 60, attackerLevel: 1, element: 'earth', targetElement: 'lightning', critChance: 0, critSeed: 0, targetDefense: 0 });
    expect(r.finalDamage).toBe(189);
    expect(r.wasCrit).toBe(true);
  });

  // Test 8: baseDamage:100, level:1, neutral, no crit, defense:100
  // levelBonus = 1.05, elementMult = 1.0, critMult = 1.0
  // rawDamage = 105, defReduction = 0.5
  // finalDamage = round(105 * 0.5) = round(52.5) = 53
  it('100 base, lv1, neutral, no crit, def 100 = 53', () => {
    const r = calculateDamage({ baseDamage: 100, attackerLevel: 1, element: 'neutral', targetElement: 'neutral', critChance: 0, critSeed: 1, targetDefense: 100 });
    expect(r.finalDamage).toBe(53);
  });

  // Test 9: baseDamage:10, level:100, neutral, no crit, defense:0
  // levelBonus = 1 + 100*0.05 = 6.0
  // rawDamage = 10 * 6.0 = 60
  // finalDamage = 60
  it('10 base, lv100, neutral, no crit, def 0 = 60', () => {
    const r = calculateDamage({ baseDamage: 10, attackerLevel: 100, element: 'neutral', targetElement: 'neutral', critChance: 0, critSeed: 1, targetDefense: 0 });
    expect(r.finalDamage).toBe(60);
  });

  // Test 10: baseDamage:45, level:5, fire vs neutral (1.0), no crit, defense:0
  // levelBonus = 1.25, elementMult = 1.0
  // rawDamage = 45 * 1.25 = 56.25 -> round = 56
  // finalDamage = round(56.25) = 56
  it('45 base, lv5, fire vs neutral, no crit, def 0 = 56', () => {
    const r = calculateDamage({ baseDamage: 45, attackerLevel: 5, element: 'fire', targetElement: 'neutral', critChance: 0, critSeed: 1, targetDefense: 0 });
    expect(r.finalDamage).toBe(56);
    expect(r.rawDamage).toBe(56);
  });
});
