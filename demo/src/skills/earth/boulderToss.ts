import { calculateFinalDamage, FinalDamageInput } from '../../core/damage/calculateFinalDamage.js';
import { StatusEffect } from '../../core/status/types.js';

export const SKILL_NAME = 'BoulderToss';
export const SKILL_ELEMENT = 'earth' as const;
export const BASE_DAMAGE = 70;
export const MANA_COST = 45;
export const COOLDOWN = 3;

export interface BoulderTossInput {
  attackerLevel: number;
  targetElement: 'fire' | 'ice' | 'lightning' | 'earth' | 'wind' | 'neutral';
  targetDefense: number;
  critChance: number;
  critSeed?: number;
  bonusDamagePercent?: number;
}

export function executeBoulderToss(input: BoulderTossInput) {
  const damageInput: FinalDamageInput = {
    baseDamage: BASE_DAMAGE,
    attackerLevel: input.attackerLevel,
    element: SKILL_ELEMENT,
    targetElement: input.targetElement,
    critChance: input.critChance,
    critSeed: input.critSeed,
    targetDefense: input.targetDefense,
    bonusDamagePercent: input.bonusDamagePercent,
  };
  return { skillName: SKILL_NAME, manaCost: MANA_COST, cooldown: COOLDOWN, ...calculateFinalDamage(damageInput) };
}

export function getStatusEffect(): StatusEffect | null {
  return null;
}
