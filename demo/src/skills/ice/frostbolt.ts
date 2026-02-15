import { calculateFinalDamage, FinalDamageInput } from '../../core/damage/calculateFinalDamage.js';
import { StatusEffect } from '../../core/status/types.js';

export const SKILL_NAME = 'Frostbolt';
export const SKILL_ELEMENT = 'ice' as const;
export const BASE_DAMAGE = 40;
export const MANA_COST = 25;
export const COOLDOWN = 2;

export interface FrostboltInput {
  attackerLevel: number;
  targetElement: 'fire' | 'ice' | 'lightning' | 'earth' | 'wind' | 'neutral';
  targetDefense: number;
  critChance: number;
  critSeed?: number;
  bonusDamagePercent?: number;
}

export function executeFrostbolt(input: FrostboltInput) {
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
  return { type: 'freeze', element: SKILL_ELEMENT, damagePerTurn: 0, duration: 2, stackable: false };
}
