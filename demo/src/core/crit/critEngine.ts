// L1: Primitive - critical hit calculation
import { BASE_CRIT_CHANCE, BASE_CRIT_MULTIPLIER, GLOBAL_CRIT_SCALE } from '../config/globalCombatConfig.js';

export function getCritChance(baseCrit: number): number {
  return Math.min((BASE_CRIT_CHANCE + baseCrit) * GLOBAL_CRIT_SCALE, 1.0);
}

export function calculateCritDamage(critChance: number, seed?: number): number {
  // Deterministic for testing: use seed if provided
  const roll = seed !== undefined ? seed : Math.random();
  const effectiveChance = getCritChance(critChance);
  if (roll < effectiveChance) {
    return BASE_CRIT_MULTIPLIER;
  }
  return 1.0;
}
