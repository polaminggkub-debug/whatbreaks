import { calculateFinalDamage, FinalDamageInput } from '../../core/damage/calculateFinalDamage.js';
import { StatusEffect } from '../../core/status/types.js';

export const SKILL_NAME = 'AirSlash';
export const SKILL_ELEMENT = 'wind' as const;
export const BASE_DAMAGE = 50;
export const MANA_COST = 30;
export const COOLDOWN = 2;

export interface AirSlashInput {
  attackerLevel: number;
  targetElement: 'fire' | 'ice' | 'lightning' | 'earth' | 'wind' | 'neutral';
  targetDefense: number;
  critChance: number;
  critSeed?: number;
  bonusDamagePercent?: number;
}

export function executeAirSlash(input: AirSlashInput) {
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
  return { type: 'bleed', element: SKILL_ELEMENT, damagePerTurn: 7, duration: 3, stackable: true };
}
