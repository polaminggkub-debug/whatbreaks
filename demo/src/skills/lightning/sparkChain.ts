import { calculateFinalDamage, FinalDamageInput } from '../../core/damage/calculateFinalDamage.js';
import { StatusEffect } from '../../core/status/types.js';

export const SKILL_NAME = 'SparkChain';
export const SKILL_ELEMENT = 'lightning' as const;
export const BASE_DAMAGE = 35;
export const MANA_COST = 25;
export const COOLDOWN = 2;

export interface SparkChainInput {
  attackerLevel: number;
  targetElement: 'fire' | 'ice' | 'lightning' | 'earth' | 'wind' | 'neutral';
  targetDefense: number;
  critChance: number;
  critSeed?: number;
  bonusDamagePercent?: number;
}

export function executeSparkChain(input: SparkChainInput) {
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
  return { type: 'shock', element: SKILL_ELEMENT, damagePerTurn: 8, duration: 2, stackable: true };
}
