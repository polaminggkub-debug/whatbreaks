import { describe, it, expect } from 'vitest';
import { calculateBattleXp, applyXp, getXpToNextLevel, calculateDamageBasedXp } from '../../src/core/xp/xpEngine.js';
import { executeTurn, BattleCharacter, BattleAction } from '../../src/battle/battleEngine.js';

describe('levelUp e2e', () => {
  // Test 1: player battles and gains enough xp to level up
  // player lv1, xp=0. fights enemy lv5.
  // player does 200 damage total in the fight
  // battleXp: baseXp = round(200*0.1+50)=round(70)=70
  // levelDiff = 4, bonusMultiplier = 1+4*0.1 = 1.4
  // bonusXp = round(70*0.4) = 28
  // totalXp = 98
  // applyXp(1, 0, 98): need 100 to level up -> stays at 1, xp=98
  // Another fight: gains another 98 -> applyXp(1, 98, 98) = 196 >= 100 -> level 2, xp=96
  it('two fights to level up', () => {
    const xpGain = calculateBattleXp(200, 5, 1);
    expect(xpGain.totalXp).toBe(98);

    const after1 = applyXp(1, 0, xpGain.totalXp);
    expect(after1.newLevel).toBe(1);
    expect(after1.currentXp).toBe(98);

    const after2 = applyXp(1, 98, xpGain.totalXp);
    expect(after2.newLevel).toBe(2);
    expect(after2.didLevelUp).toBe(true);
    expect(after2.currentXp).toBe(96);
  });

  // Test 2: massive xp gain causes multi-level
  // 500 damage, enemy lv20, player lv1
  // baseXp = round(500*0.1+200) = round(250) = 250
  // levelDiff = 19, bonusMultiplier = 1+19*0.1 = 2.9
  // bonusXp = round(250*1.9) = round(475) = 475
  // totalXp = 725
  // applyXp(1, 0, 725):
  // lv1 needs 100: 725-100=625 -> lv2
  // lv2 needs 115: 625-115=510 -> lv3
  // lv3 needs round(100*1.15^2)=132: 510-132=378 -> lv4
  // lv4 needs round(100*1.15^3)=round(152.09)=152: 378-152=226 -> lv5
  // lv5 needs round(100*1.15^4)=round(174.90)=175: 226-175=51 -> lv6
  // lv6 needs round(100*1.15^5)=round(201.14)=201: 51 < 201 -> stop
  it('massive xp gain: level 1 to 6', () => {
    const xpGain = calculateBattleXp(500, 20, 1);
    expect(xpGain.totalXp).toBe(725);

    const result = applyXp(1, 0, 725);
    expect(result.newLevel).toBe(6);
    expect(result.currentXp).toBe(51);
  });

  // Test 3: damage-based xp from actual combat
  // player attacks: baseDamage=100, lv5, def=50
  // calculateFinalDamage: raw=100*1.25=125, defReduction=100/150=0.6667
  // finalDamage=round(125*0.6667)=round(83.33)=83, totalDamage=83
  // calculateDamageBasedXp = round(83*0.15) = round(12.45) = 12
  //
  // applyXp(5, 0, 12): need round(100*1.15^4)=175. 12<175 -> stays at 5
  it('damage-based xp from combat (12 xp)', () => {
    const xp = calculateDamageBasedXp(100, 5, 50);
    expect(xp).toBe(12);

    const result = applyXp(5, 0, xp);
    expect(result.newLevel).toBe(5);
    expect(result.didLevelUp).toBe(false);
    expect(result.currentXp).toBe(12);
  });
});
