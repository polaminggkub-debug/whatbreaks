// L3: Wrapper - adds global modifiers on top of base calculation
import { DamageInput, DamageResult } from './types.js';
import { calculateDamage } from './damageCalculator.js';
import { GLOBAL_DAMAGE_SCALE } from '../config/globalCombatConfig.js';

export interface FinalDamageInput extends DamageInput {
  bonusDamagePercent?: number;
  flatBonusDamage?: number;
}

export interface FinalDamageResult extends DamageResult {
  bonusDamage: number;
  totalDamage: number;
}

export function calculateFinalDamage(input: FinalDamageInput): FinalDamageResult {
  const baseResult = calculateDamage(input);
  const bonusPercent = input.bonusDamagePercent ?? 0;
  const flatBonus = input.flatBonusDamage ?? 0;

  const bonusDamage = Math.round(baseResult.finalDamage * bonusPercent / 100) + flatBonus;
  const totalDamage = baseResult.finalDamage + bonusDamage;

  return {
    ...baseResult,
    bonusDamage,
    totalDamage,
  };
}
