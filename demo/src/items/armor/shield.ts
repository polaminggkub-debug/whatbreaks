import { getDefenseReduction, getArmorMitigation } from '../../core/defense/defenseCalculator.js';
import { calculateFinalDamage } from '../../core/damage/calculateFinalDamage.js';

export const ITEM_NAME = 'Shield';
export const ITEM_TYPE = 'armor' as const;
export const BASE_DEFENSE = 100;
export const ELEMENT_RESISTANCE = 0.20;
export const RESISTANCE_ELEMENT = 'earth' as const;

export interface ArmorStats {
  defenseBonus: number;
  elementResistance: number;
  resistanceElement: string;
}

export function getStats(): ArmorStats {
  return { defenseBonus: BASE_DEFENSE, elementResistance: ELEMENT_RESISTANCE, resistanceElement: RESISTANCE_ELEMENT };
}

export function calculateMitigation(incomingDamage: number, wearerLevel: number): number {
  const reduction = getArmorMitigation(BASE_DEFENSE, wearerLevel);
  return Math.round(incomingDamage * reduction);
}

export function calculateDamageWithArmor(baseDamage: number, attackerLevel: number, targetLevel: number) {
  const result = calculateFinalDamage({
    baseDamage,
    attackerLevel,
    element: 'neutral',
    targetElement: 'neutral',
    critChance: 0,
    critSeed: 1,
    targetDefense: BASE_DEFENSE + targetLevel * 2,
  });
  return { itemName: ITEM_NAME, mitigated: result.totalDamage };
}
