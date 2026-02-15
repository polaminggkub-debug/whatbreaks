import { describe, it, expect } from 'vitest';
import { executeCombo } from '../../../src/battle/comboResolver.js';

describe('comboResolver', () => {
  // Test 1: single hit combo
  // baseDamage=100, lv5, neutral, def=0, comboMultiplier starts at 1.0
  // bonusDamagePercent = (1.0 - 1) * 100 = 0
  // levelBonus=1.25, rawDamage=125, finalDamage=125, bonusDamage=0, totalDamage=125
  // comboMultiplier ends at 1.1
  it('single hit combo = 125 total', () => {
    const result = executeCombo([{ baseDamage: 100, element: 'neutral' }], 5, 'neutral', 0);
    expect(result.totalDamage).toBe(125);
    expect(result.hitCount).toBe(1);
    expect(result.hits[0]).toBe(125);
  });

  // Test 2: two hit combo
  // Hit 1: baseDamage=50, lv5, neutral, def=0, comboMult=1.0, bonusPercent=0
  //   raw=50*1.25=62.5, final=63, bonus=0, total=63
  // Hit 2: baseDamage=50, lv5, neutral, def=0, comboMult=1.1, bonusPercent=10
  //   raw=50*1.25=62.5, final=63, bonus=round(63*10/100)=round(6.3)=6, total=69
  // total=63+69=132
  it('two hit combo = 132 total', () => {
    const result = executeCombo([
      { baseDamage: 50, element: 'neutral' },
      { baseDamage: 50, element: 'neutral' },
    ], 5, 'neutral', 0);
    expect(result.totalDamage).toBe(132);
    expect(result.hitCount).toBe(2);
    expect(result.hits[0]).toBe(63);
    expect(result.hits[1]).toBe(69);
  });

  // Test 3: three hit combo with element advantage
  // Hit 1: baseDamage=40, fire, lv5, vs ice (2.0), def=0, comboMult=1.0, bonus=0
  //   raw=40*1.25*2.0=100, final=100, total=100
  // Hit 2: baseDamage=40, fire, lv5, vs ice, comboMult=1.1, bonus=10%
  //   raw=100, final=100, bonus=round(100*10/100)=10, total=110
  // Hit 3: baseDamage=40, fire, lv5, vs ice, comboMult=1.2, bonus=20%
  //   raw=100, final=100, bonus=round(100*20/100)=20, total=120
  // total=100+110+120=330
  it('three hit fire vs ice combo = 330 total', () => {
    const result = executeCombo([
      { baseDamage: 40, element: 'fire' },
      { baseDamage: 40, element: 'fire' },
      { baseDamage: 40, element: 'fire' },
    ], 5, 'ice', 0);
    expect(result.totalDamage).toBe(330);
    expect(result.hitCount).toBe(3);
  });

  // Test 4: combo with defense
  // Hit 1: baseDamage=100, lv5, neutral, def=100, comboMult=1.0, bonus=0
  //   defReduction=100/200=0.5
  //   raw=125, final=round(125*0.5)=63, bonus=0, total=63
  // Hit 2: baseDamage=100, lv5, neutral, def=100, comboMult=1.1, bonus=10%
  //   raw=125, final=63, bonus=round(63*10/100)=round(6.3)=6, total=69
  // total=63+69=132
  it('two hit combo with defense = 132', () => {
    const result = executeCombo([
      { baseDamage: 100, element: 'neutral' },
      { baseDamage: 100, element: 'neutral' },
    ], 5, 'neutral', 100);
    expect(result.totalDamage).toBe(132);
  });

  // Test 5: combo multiplier grows correctly
  it('combo multiplier after 4 hits = 1.4', () => {
    const result = executeCombo([
      { baseDamage: 10, element: 'neutral' },
      { baseDamage: 10, element: 'neutral' },
      { baseDamage: 10, element: 'neutral' },
      { baseDamage: 10, element: 'neutral' },
    ], 1, 'neutral', 0);
    expect(result.comboMultiplier).toBeCloseTo(1.4, 5);
    expect(result.hitCount).toBe(4);
  });
});
