import { describe, it, expect } from 'vitest';
import { analyzeDamageOutput, calculateBattleScore, generateBattleSummary } from '../../../src/core/analytics/analyticsEngine.js';

describe('analyticsEngine', () => {
  // analyzeDamageOutput: baseDamage=100, level=1, defense=0, turns=5
  // noCrit: baseDmg=100, lv=1, neutral, critSeed=1, def=0 -> finalDamage=105, totalDamage=105
  // crit: baseDmg=100, lv=1, neutral, critChance=1.0 (getCritChance(1.0)=1.0), critSeed=0 -> crit 1.5
  //   rawDamage = 100 * 1.05 * 1.0 * 1.5 = 157.5 -> round=158, finalDamage=158, totalDamage=158
  // avgDmg = round((105 + 158) / 2) = round(131.5) = 132
  // peakDamage = 158
  // dps = round(132 / 5) = 26
  // efficiency = 105 / 100 = 1.05
  it('analyzeDamageOutput: 100 base, lv1, def 0, 5 turns', () => {
    const r = analyzeDamageOutput(100, 1, 0, 5);
    expect(r.averageDamage).toBe(132);
    expect(r.peakDamage).toBe(158);
    expect(r.dps).toBe(26);
    expect(r.efficiency).toBe(1.05);
  });

  // analyzeDamageOutput: baseDamage=50, level=10, defense=100, turns=3
  // noCrit: 50*1.5*1.0*1.0=75, defReduction=0.5, finalDamage=round(75*0.5)=38, totalDamage=38
  // crit: getCritChance(1.0)=1.0, seed=0<1.0 -> crit=1.5
  //   rawDamage=50*1.5*1.0*1.5=112.5, finalDamage=round(112.5*0.5)=56, totalDamage=56
  // avgDmg = round((38+56)/2) = round(47) = 47
  // peakDamage = 56, dps = round(47/3) = 16
  // efficiency = 38/50 = 0.76
  it('analyzeDamageOutput: 50 base, lv10, def 100, 3 turns', () => {
    const r = analyzeDamageOutput(50, 10, 100, 3);
    expect(r.averageDamage).toBe(47);
    expect(r.peakDamage).toBe(56);
    expect(r.dps).toBe(16);
    expect(r.efficiency).toBe(0.76);
  });

  // analyzeDamageOutput with 0 turns -> dps=0
  it('analyzeDamageOutput: 0 turns -> dps = 0', () => {
    const r = analyzeDamageOutput(100, 1, 0, 0);
    expect(r.dps).toBe(0);
  });

  // calculateBattleScore
  // stats: dealt=500, received=200, turns=5, crits=2, statuses=3
  // damageScore = 500*2 = 1000
  // survivalScore = max(0, 1000-200) = 800
  // efficiencyScore = round(500/5)*10 = 100*10 = 1000
  // critBonus = 2*50 = 100
  // statusBonus = 3*25 = 75
  // total = 1000 + 800 + 1000 + 100 + 75 = 2975
  it('calculateBattleScore: standard scenario = 2975', () => {
    const score = calculateBattleScore({ totalDamageDealt: 500, totalDamageReceived: 200, turnsPlayed: 5, criticalHits: 2, statusEffectsApplied: 3 });
    expect(score).toBe(2975);
  });

  // calculateBattleScore: high damage
  // dealt=2000, received=100, turns=3, crits=5, statuses=2
  // 4000 + 900 + round(2000/3)*10=667*10=6670 + 250 + 50 = 11870
  it('calculateBattleScore: high damage = 11870', () => {
    const score = calculateBattleScore({ totalDamageDealt: 2000, totalDamageReceived: 100, turnsPlayed: 3, criticalHits: 5, statusEffectsApplied: 2 });
    expect(score).toBe(11870);
  });

  // generateBattleSummary
  // score from above = 2975 -> 1500 < 2975 < 3000 -> rating 'B'
  it('generateBattleSummary: B rating', () => {
    const summary = generateBattleSummary({ totalDamageDealt: 500, totalDamageReceived: 200, turnsPlayed: 5, criticalHits: 2, statusEffectsApplied: 3 });
    expect(summary).toBe('Battle Score: 2975 (B) | DMG: 500 | Turns: 5');
  });

  // score = 11870 -> > 5000 -> 'S'
  it('generateBattleSummary: S rating', () => {
    const summary = generateBattleSummary({ totalDamageDealt: 2000, totalDamageReceived: 100, turnsPlayed: 3, criticalHits: 5, statusEffectsApplied: 2 });
    expect(summary).toBe('Battle Score: 11870 (S) | DMG: 2000 | Turns: 3');
  });

  // 0 damage scenario: dealt=0, received=500, turns=1, crits=0, statuses=0
  // 0 + max(0,500) + 0 + 0 + 0 = 500 -> rating 'C'... wait: 500 is not > 500, so 'D'
  it('generateBattleSummary: D rating', () => {
    const summary = generateBattleSummary({ totalDamageDealt: 0, totalDamageReceived: 500, turnsPlayed: 1, criticalHits: 0, statusEffectsApplied: 0 });
    expect(summary).toBe('Battle Score: 500 (D) | DMG: 0 | Turns: 1');
  });
});
