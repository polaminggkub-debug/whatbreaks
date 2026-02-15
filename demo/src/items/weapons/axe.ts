import { calculateFinalDamage, FinalDamageInput } from '../../core/damage/calculateFinalDamage.js';

export const ITEM_NAME = 'Axe';
export const ITEM_TYPE = 'weapon' as const;
export const BASE_ATTACK = 65;
export const BONUS_DAMAGE_PERCENT = 5;
export const CRIT_BONUS = 0.15;

export interface WeaponStats {
  attackBonus: number;
  critBonus: number;
  bonusDamagePercent: number;
}

export function getStats(): WeaponStats {
  return { attackBonus: BASE_ATTACK, critBonus: CRIT_BONUS, bonusDamagePercent: BONUS_DAMAGE_PERCENT };
}

export function calculateWeaponDamage(input: {
  attackerLevel: number;
  element: 'fire' | 'ice' | 'lightning' | 'earth' | 'wind' | 'neutral';
  targetElement: 'fire' | 'ice' | 'lightning' | 'earth' | 'wind' | 'neutral';
  targetDefense: number;
  critSeed?: number;
}) {
  const damageInput: FinalDamageInput = {
    baseDamage: BASE_ATTACK,
    attackerLevel: input.attackerLevel,
    element: input.element,
    targetElement: input.targetElement,
    critChance: CRIT_BONUS,
    critSeed: input.critSeed,
    targetDefense: input.targetDefense,
    bonusDamagePercent: BONUS_DAMAGE_PERCENT,
  };
  return { itemName: ITEM_NAME, ...calculateFinalDamage(damageInput) };
}
