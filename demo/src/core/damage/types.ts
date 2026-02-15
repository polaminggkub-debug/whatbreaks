import { ElementType } from '../element/types.js';

export interface DamageInput {
  baseDamage: number;
  attackerLevel: number;
  element: ElementType;
  targetElement: ElementType;
  critChance: number;
  critSeed?: number; // deterministic crit for testing
  targetDefense: number;
}

export interface DamageResult {
  rawDamage: number;
  finalDamage: number;
  wasCrit: boolean;
  elementMultiplier: number;
  defenseReduction: number;
}
