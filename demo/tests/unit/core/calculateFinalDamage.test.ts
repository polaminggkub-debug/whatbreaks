import { describe, it, expect } from 'vitest';
import { calculateFinalDamage } from '../../../src/core/damage/calculateFinalDamage.js';

describe('calculateFinalDamage', () => {
  // Test 1: baseDamage:100, level:10, neutral, critSeed:1, defense:0, bonusPercent:20, flat:10
  // levelBonus=1.5, elementMult=1.0, critMult=1.0, defReduction=1.0
  // rawDamage=150, finalDamage=150
  // bonusDamage = round(150*20/100) + 10 = 30 + 10 = 40
  // totalDamage = 150 + 40 = 190
  it('100 base, lv10, neutral, 20% bonus + 10 flat = 190', () => {
    const r = calculateFinalDamage({ baseDamage: 100, attackerLevel: 10, element: 'neutral', targetElement: 'neutral', critChance: 0, critSeed: 1, targetDefense: 0, bonusDamagePercent: 20, flatBonusDamage: 10 });
    expect(r.totalDamage).toBe(190);
    expect(r.bonusDamage).toBe(40);
    expect(r.finalDamage).toBe(150);
  });

  // Test 2: baseDamage:100, level:1, neutral, critSeed:1, defense:0, no bonus
  // finalDamage=105, bonusDamage=0, totalDamage=105
  it('100 base, lv1, neutral, no bonus = 105', () => {
    const r = calculateFinalDamage({ baseDamage: 100, attackerLevel: 1, element: 'neutral', targetElement: 'neutral', critChance: 0, critSeed: 1, targetDefense: 0 });
    expect(r.totalDamage).toBe(105);
    expect(r.bonusDamage).toBe(0);
  });

  // Test 3: baseDamage:100, level:10, fire vs ice, critSeed:1, defense:50, bonusPercent:10
  // finalDamage=200, bonusDamage=round(200*10/100)+0=20, totalDamage=220
  it('100 base, lv10, fire vs ice, def 50, 10% bonus = 220', () => {
    const r = calculateFinalDamage({ baseDamage: 100, attackerLevel: 10, element: 'fire', targetElement: 'ice', critChance: 0, critSeed: 1, targetDefense: 50, bonusDamagePercent: 10 });
    expect(r.totalDamage).toBe(220);
    expect(r.bonusDamage).toBe(20);
  });

  // Test 4: baseDamage:50, level:1, neutral, critSeed:1, defense:0, flatBonus:25
  // finalDamage=round(50*1.05)=53, bonusDamage=round(53*0/100)+25=25, totalDamage=78
  it('50 base, lv1, neutral, flat 25 = 78', () => {
    const r = calculateFinalDamage({ baseDamage: 50, attackerLevel: 1, element: 'neutral', targetElement: 'neutral', critChance: 0, critSeed: 1, targetDefense: 0, flatBonusDamage: 25 });
    expect(r.totalDamage).toBe(78);
    expect(r.bonusDamage).toBe(25);
  });

  // Test 5: baseDamage:200, level:5, neutral, critSeed:0 (crit), defense:0, bonusPercent:50
  // getCritChance(0)=0.05, seed 0 < 0.05 -> crit 1.5
  // rawDamage = 200 * 1.25 * 1.0 * 1.5 = 375, finalDamage=375
  // bonusDamage = round(375*50/100) = 188, totalDamage = 375+188 = 563
  it('200 base, lv5, crit, 50% bonus = 563', () => {
    const r = calculateFinalDamage({ baseDamage: 200, attackerLevel: 5, element: 'neutral', targetElement: 'neutral', critChance: 0, critSeed: 0, targetDefense: 0, bonusDamagePercent: 50 });
    expect(r.totalDamage).toBe(563);
    expect(r.wasCrit).toBe(true);
  });

  // Test 6: baseDamage:80, level:10, neutral, critSeed:1, defense:100, bonusPercent:15, flat:5
  // finalDamage = round(80*1.5*1.0*1.0 * 0.5) = round(60) = 60
  // bonusDamage = round(60*15/100) + 5 = 9 + 5 = 14
  // totalDamage = 60 + 14 = 74
  it('80 base, lv10, def 100, 15% + 5 flat = 74', () => {
    const r = calculateFinalDamage({ baseDamage: 80, attackerLevel: 10, element: 'neutral', targetElement: 'neutral', critChance: 0, critSeed: 1, targetDefense: 100, bonusDamagePercent: 15, flatBonusDamage: 5 });
    expect(r.totalDamage).toBe(74);
  });

  // Test 7: baseDamage:100, level:1, fire vs ice (2.0), critSeed:1, defense:0, bonusPercent:100
  // rawDamage = 100*1.05*2.0 = 210, finalDamage=210
  // bonusDamage = round(210*100/100) = 210, totalDamage=420
  it('100 base, lv1, fire vs ice, 100% bonus = 420', () => {
    const r = calculateFinalDamage({ baseDamage: 100, attackerLevel: 1, element: 'fire', targetElement: 'ice', critChance: 0, critSeed: 1, targetDefense: 0, bonusDamagePercent: 100 });
    expect(r.totalDamage).toBe(420);
  });

  // Test 8: baseDamage:30, level:5, neutral, critSeed:1, defense:50, bonusPercent:0, flat:0
  // rawDamage = 30*1.25 = 37.5, defReduction = 100/150 = 0.6667
  // finalDamage = round(37.5*0.6667) = round(25) = 25
  // totalDamage = 25
  it('30 base, lv5, neutral, def 50, no bonus = 25', () => {
    const r = calculateFinalDamage({ baseDamage: 30, attackerLevel: 5, element: 'neutral', targetElement: 'neutral', critChance: 0, critSeed: 1, targetDefense: 50 });
    expect(r.totalDamage).toBe(25);
  });
});
