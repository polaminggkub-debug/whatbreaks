import { describe, it, expect } from 'vitest';
import { calculateBattleXp, applyXp, getXpToNextLevel, calculateDamageBasedXp } from '../../src/core/xp/xpEngine.js';

describe('xpProgression integration', () => {
  // INSENSITIVE structural tests
  it('level 1 needs 100 xp', () => {
    expect(getXpToNextLevel(1)).toBe(100);
  });

  it('gaining exact xp for level up', () => {
    const result = applyXp(1, 0, 100);
    expect(result.newLevel).toBe(2);
    expect(result.didLevelUp).toBe(true);
    expect(result.currentXp).toBe(0);
    // xpToNext at level 2: round(100*1.15^1)=round(115)=115
    expect(result.xpToNext).toBe(115);
  });

  it('multi-level up in one gain', () => {
    // level 1 needs 100, level 2 needs 115
    // gain 250: 250-100=150 (lv2), 150-115=35 (lv3)
    // level 3 needs round(100*1.15^2)=round(132.25)=132
    const result = applyXp(1, 0, 250);
    expect(result.newLevel).toBe(3);
    expect(result.currentXp).toBe(35);
    expect(result.xpToNext).toBe(132 - 35);
  });

  it('max level cannot gain more levels', () => {
    const result = applyXp(100, 0, 10000);
    expect(result.newLevel).toBe(100);
    expect(result.didLevelUp).toBe(false);
  });

  // SENSITIVE damage-dependent tests
  it('calculateBattleXp: 150 damage, enemy lv8, player lv5', () => {
    // baseXp = round(150*0.1 + 80) = round(95) = 95
    // levelDiff = 3, bonusMultiplier = 1 + 3*0.1 = 1.3
    // bonusXp = round(95 * 0.3) = round(28.5) = 29
    // totalXp = 95 + 29 = 124
    const r = calculateBattleXp(150, 8, 5);
    expect(r.baseXp).toBe(95);
    expect(r.bonusXp).toBe(29);
    expect(r.totalXp).toBe(124);
  });

  it('calculateBattleXp: player much higher level', () => {
    // 50 damage, enemy lv1, player lv20
    // baseXp = round(50*0.1 + 10) = round(15) = 15
    // levelDiff = -19, bonusMultiplier = max(0.1, 1 + (-19)*0.05) = max(0.1, 0.05) = 0.1
    // bonusXp = round(15 * (0.1-1)) = round(15 * -0.9) = round(-13.5) = -14
    // totalXp = 15 + (-14) = 1
    const r = calculateBattleXp(50, 1, 20);
    expect(r.totalXp).toBe(2);
  });

  it('calculateDamageBasedXp: 200 base, lv10, def 50', () => {
    // calculateFinalDamage: 200*1.5*1.0 = 300, defReduction=100/150=0.6667
    // finalDamage=round(300*0.6667)=round(200)=200, totalDamage=200
    // return round(200 * 0.15) = round(30) = 30
    expect(calculateDamageBasedXp(200, 10, 50)).toBe(30);
  });

  it('battle xp leads to level up', () => {
    // player lv1, xp=50, earns 60 xp from battle
    // level 1 needs 100 xp. 50+60=110 >= 100 -> level up, 110-100=10 remaining
    const result = applyXp(1, 50, 60);
    expect(result.newLevel).toBe(2);
    expect(result.currentXp).toBe(10);
  });
});
