import { calculateFinalDamage, FinalDamageInput } from '../../core/damage/calculateFinalDamage.js';
import { StatusEffect } from '../../core/status/types.js';

export const SKILL_NAME = 'FlameWave';
export const SKILL_ELEMENT = 'fire' as const;
export const BASE_DAMAGE = 55;
export const MANA_COST = 40;
export const COOLDOWN = 3;

export interface FlameWaveInput {
  attackerLevel: number;
  targetElement: 'fire' | 'ice' | 'lightning' | 'earth' | 'wind' | 'neutral';
  targetDefense: number;
  critChance: number;
  critSeed?: number;
  bonusDamagePercent?: number;
}

export function executeFlameWave(input: FlameWaveInput) {
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
  return { type: 'burn', element: SKILL_ELEMENT, damagePerTurn: 8, duration: 3, stackable: true };
}
