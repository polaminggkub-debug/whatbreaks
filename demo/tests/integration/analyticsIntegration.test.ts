import { describe, it, expect } from 'vitest';
import { analyzeDamageOutput, calculateBattleScore, generateBattleSummary, BattleStats } from '../../src/core/analytics/analyticsEngine.js';

describe('analyticsIntegration', () => {
  // Test 1: analyze low-level, no-defense scenario
  // baseDamage=50, level=1, defense=0, turns=10
  // noCrit: 50*1.05=52.5, final=53, total=53
  // crit: getCritChance(1.0)=1.0, seed=0 -> crit 1.5. raw=50*1.05*1.5=78.75, final=79, total=79
  // avg = round((53+79)/2) = round(66) = 66
  // peak = 79, dps = round(66/10) = 7
  // efficiency = 53/50 = 1.06
  it('analyze low damage output', () => {
    const r = analyzeDamageOutput(50, 1, 0, 10);
    expect(r.averageDamage).toBe(66);
    expect(r.peakDamage).toBe(79);
    expect(r.dps).toBe(7);
    expect(r.efficiency).toBe(1.06);
  });

  // Test 2: analyze with defense
  // baseDamage=100, level=10, defense=200, turns=5
  // noCrit: raw=100*1.5=150, defReduction=100/300=0.3333, final=round(150*0.3333)=round(50)=50, total=50
  // crit: getCritChance(1.0)=1.0, seed=0 -> crit 1.5. raw=100*1.5*1.5=225
  //   final=round(225*0.3333)=round(75)=75, total=75
  // avg = round((50+75)/2) = round(62.5) = 63
  // peak = 75, dps = round(63/5) = 13
  // efficiency = 50/100 = 0.5
  it('analyze with defense', () => {
    const r = analyzeDamageOutput(100, 10, 200, 5);
    expect(r.averageDamage).toBe(63);
    expect(r.peakDamage).toBe(75);
    expect(r.dps).toBe(13);
    expect(r.efficiency).toBe(0.5);
  });

  // Test 3: battle score calculation - minimal fight
  // dealt=100, received=0, turns=1, crits=0, statuses=0
  // damage=200, survival=1000, efficiency=round(100/1)*10=1000, crit=0, status=0
  // total=2200
  it('battle score: minimal fight = 2200', () => {
    const stats: BattleStats = { totalDamageDealt: 100, totalDamageReceived: 0, turnsPlayed: 1, criticalHits: 0, statusEffectsApplied: 0 };
    expect(calculateBattleScore(stats)).toBe(2200);
  });

  // Test 4: battle score - heavy fight
  // dealt=1000, received=800, turns=10, crits=3, statuses=5
  // damage=2000, survival=max(0,200)=200, efficiency=round(1000/10)*10=100*10=1000
  // crit=150, status=125
  // total=3475
  it('battle score: heavy fight = 3475', () => {
    const stats: BattleStats = { totalDamageDealt: 1000, totalDamageReceived: 800, turnsPlayed: 10, criticalHits: 3, statusEffectsApplied: 5 };
    expect(calculateBattleScore(stats)).toBe(3475);
  });

  // Test 5: summary rating A
  // score=3475 -> 3000 < 3475 < 5000 -> 'A'
  it('summary: A rating for 3475', () => {
    const stats: BattleStats = { totalDamageDealt: 1000, totalDamageReceived: 800, turnsPlayed: 10, criticalHits: 3, statusEffectsApplied: 5 };
    const summary = generateBattleSummary(stats);
    expect(summary).toContain('(A)');
    expect(summary).toContain('3475');
  });

  // Test 6: summary rating C
  // dealt=50, received=400, turns=2, crits=0, statuses=0
  // damage=100, survival=600, efficiency=round(50/2)*10=25*10=250, crit=0, status=0
  // total=950 -> 500 < 950 < 1500 -> 'C'
  it('summary: C rating for 950', () => {
    const stats: BattleStats = { totalDamageDealt: 50, totalDamageReceived: 400, turnsPlayed: 2, criticalHits: 0, statusEffectsApplied: 0 };
    const summary = generateBattleSummary(stats);
    expect(summary).toContain('(C)');
    expect(summary).toContain('950');
  });
});
