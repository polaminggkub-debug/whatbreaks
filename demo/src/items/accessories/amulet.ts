import { calculateFinalDamage } from '../../core/damage/calculateFinalDamage.js';

export const ITEM_NAME = 'Amulet';
export const ITEM_TYPE = 'accessory' as const;
export const BONUS_STAT = 'magicPower' as const;
export const BONUS_VALUE = 20;
export const FLAT_DAMAGE_BONUS = 10;

export interface AccessoryStats {
  bonusStat: string;
  bonusValue: number;
  flatDamageBonus: number;
}

export function getStats(): AccessoryStats {
  return { bonusStat: BONUS_STAT, bonusValue: BONUS_VALUE, flatDamageBonus: FLAT_DAMAGE_BONUS };
}

export function applyAccessoryBonus(baseDamage: number, attackerLevel: number, targetDefense: number) {
  const result = calculateFinalDamage({
    baseDamage,
    attackerLevel,
    element: 'neutral',
    targetElement: 'neutral',
    critChance: 0,
    critSeed: 1,
    targetDefense,
    flatBonusDamage: FLAT_DAMAGE_BONUS,
    bonusDamagePercent: BONUS_VALUE,
  });
  return { itemName: ITEM_NAME, boostedDamage: result.totalDamage };
}
