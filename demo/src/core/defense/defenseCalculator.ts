// L1: Primitive - defense reduction calculation
import { GLOBAL_DEFENSE_SCALE } from '../config/globalCombatConfig.js';

export function getDefenseReduction(targetDefense: number): number {
  // Returns multiplier 0.0-1.0 (1.0 = no reduction, 0.1 = 90% reduction)
  const reduction = 100 / (100 + targetDefense * GLOBAL_DEFENSE_SCALE);
  return Math.max(reduction, 0.1);
}

export function getArmorMitigation(armor: number, level: number): number {
  return getDefenseReduction(armor + level * 2);
}
