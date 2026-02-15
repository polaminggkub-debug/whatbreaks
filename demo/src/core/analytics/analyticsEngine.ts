// L6: Observer - analytics depends on battle engine
import { calculateFinalDamage } from '../damage/calculateFinalDamage.js';

export interface BattleStats {
  totalDamageDealt: number;
  totalDamageReceived: number;
  turnsPlayed: number;
  criticalHits: number;
  statusEffectsApplied: number;
}

export interface DamageAnalysis {
  averageDamage: number;
  peakDamage: number;
  dps: number;
  efficiency: number;
}

export function analyzeDamageOutput(
  baseDamage: number,
  attackerLevel: number,
  targetDefense: number,
  turnsPlayed: number
): DamageAnalysis {
  // Simulate damage over multiple scenarios
  const noCritResult = calculateFinalDamage({
    baseDamage,
    attackerLevel,
    element: 'neutral',
    targetElement: 'neutral',
    critChance: 0,
    critSeed: 1,
    targetDefense,
  });

  const critResult = calculateFinalDamage({
    baseDamage,
    attackerLevel,
    element: 'neutral',
    targetElement: 'neutral',
    critChance: 1.0,
    critSeed: 0,
    targetDefense,
  });

  const avgDmg = Math.round((noCritResult.totalDamage + critResult.totalDamage) / 2);

  return {
    averageDamage: avgDmg,
    peakDamage: critResult.totalDamage,
    dps: turnsPlayed > 0 ? Math.round(avgDmg / turnsPlayed) : 0,
    efficiency: noCritResult.totalDamage / baseDamage,
  };
}

export function calculateBattleScore(stats: BattleStats): number {
  const damageScore = stats.totalDamageDealt * 2;
  const survivalScore = Math.max(0, 1000 - stats.totalDamageReceived);
  const efficiencyScore = stats.turnsPlayed > 0 ? Math.round(stats.totalDamageDealt / stats.turnsPlayed) * 10 : 0;
  const critBonus = stats.criticalHits * 50;
  const statusBonus = stats.statusEffectsApplied * 25;

  return damageScore + survivalScore + efficiencyScore + critBonus + statusBonus;
}

export function generateBattleSummary(stats: BattleStats): string {
  const score = calculateBattleScore(stats);
  const rating = score > 5000 ? 'S' : score > 3000 ? 'A' : score > 1500 ? 'B' : score > 500 ? 'C' : 'D';
  return `Battle Score: ${score} (${rating}) | DMG: ${stats.totalDamageDealt} | Turns: ${stats.turnsPlayed}`;
}
