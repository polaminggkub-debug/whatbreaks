import { describe, it, expect } from 'vitest';
import { getXpToNextLevel, applyXp, calculateBattleXp, calculateDamageBasedXp } from '../../../src/core/xp/xpEngine.js';

describe('xpEngine', () => {
  // getXpToNextLevel: round(100 * 1.15^(level-1))
  it('getXpToNextLevel(1) = 100', () => expect(getXpToNextLevel(1)).toBe(100));
  // 100 * 1.15^9 = 100 * 3.5179 = 351.79 -> round = 352... Let me recalculate
  // 1.15^1=1.15, ^2=1.3225, ^3=1.5209, ^4=1.7490, ^5=2.0114, ^6=2.3131, ^7=2.6600, ^8=3.0590, ^9=3.5179
  // 100 * 3.5179 = 351.79 -> 352
  it('getXpToNextLevel(10) = 352', () => expect(getXpToNextLevel(10)).toBe(352));

  // applyXp INSENSITIVE tests
  it('applyXp: level 1, xp 0, gain 100 -> level up to 2', () => {
    const r = applyXp(1, 0, 100);
    expect(r.newLevel).toBe(2);
    expect(r.didLevelUp).toBe(true);
    expect(r.currentXp).toBe(0);
  });

  it('applyXp: level 1, xp 0, gain 50 -> still level 1', () => {
    const r = applyXp(1, 0, 50);
    expect(r.newLevel).toBe(1);
    expect(r.didLevelUp).toBe(false);
    expect(r.currentXp).toBe(50);
  });

  // calculateBattleXp: baseXp = round(damage*0.1 + enemyLevel*10)
  // 100 damage, enemy 5, player 5: baseXp = round(100*0.1 + 50) = round(60) = 60
  // levelDiff = 0, bonusMultiplier = max(0.1, 1 + 0*0.05) = 1.0
  // bonusXp = round(60 * (1.0 - 1)) = 0
  it('calculateBattleXp: 100 dmg, enemy 5, player 5 -> base 60, total 60', () => {
    const r = calculateBattleXp(100, 5, 5);
    expect(r.baseXp).toBe(60);
    expect(r.totalXp).toBe(60);
  });

  // calculateBattleXp: 200 damage, enemy 10, player 5
  // baseXp = round(200*0.1 + 100) = round(120) = 120
  // levelDiff = 5, bonusMultiplier = 1 + 5*0.1 = 1.5
  // bonusXp = round(120 * 0.5) = 60
  it('calculateBattleXp: 200 dmg, enemy 10, player 5 -> total 180', () => {
    const r = calculateBattleXp(200, 10, 5);
    expect(r.baseXp).toBe(120);
    expect(r.bonusXp).toBe(60);
    expect(r.totalXp).toBe(180);
  });

  // calculateBattleXp: player higher level
  // 50 damage, enemy 1, player 10: baseXp = round(50*0.1 + 10) = round(15) = 15
  // levelDiff = -9, bonusMultiplier = max(0.1, 1 + (-9)*0.05) = max(0.1, 0.55) = 0.55
  // bonusXp = round(15 * (0.55-1)) = round(15 * -0.45) = round(-6.75) = -7
  it('calculateBattleXp: 50 dmg, enemy 1, player 10 -> total 8', () => {
    const r = calculateBattleXp(50, 1, 10);
    expect(r.baseXp).toBe(15);
    expect(r.bonusXp).toBe(-7);
    expect(r.totalXp).toBe(8);
  });

  // SENSITIVE: calculateDamageBasedXp calls calculateFinalDamage
  // baseDamage=100, level=1, defense=0, neutral vs neutral
  // finalDamage = round(100*1.05) = 105, totalDamage = 105
  // return round(105 * 0.15) = round(15.75) = 16
  it('calculateDamageBasedXp: 100 base, lv1, def 0 = 16', () => {
    expect(calculateDamageBasedXp(100, 1, 0)).toBe(16);
  });
});
