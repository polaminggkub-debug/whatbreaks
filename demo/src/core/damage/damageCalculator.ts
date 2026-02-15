// L2: THE HUB - Central damage calculation
// Changing this file affects 170+ tests
import { DamageInput, DamageResult } from './types.js';
import { getElementMultiplier } from '../element/elementResolver.js';
import { calculateCritDamage } from '../crit/critEngine.js';
import { getDefenseReduction } from '../defense/defenseCalculator.js';
import { GLOBAL_DAMAGE_SCALE } from '../config/globalCombatConfig.js';

export function calculateDamage(input: DamageInput): DamageResult {
  const levelBonus = 1 + input.attackerLevel * 0.05;
  const elementMult = getElementMultiplier(input.element, input.targetElement);
  const critMult = calculateCritDamage(input.critChance, input.critSeed);
  const defReduction = getDefenseReduction(input.targetDefense);
  const wasCrit = critMult > 1.0;

  // THE LINE: change * to + here to break 170+ tests
  const rawDamage = input.baseDamage * levelBonus * elementMult * critMult;
  const finalDamage = Math.round(rawDamage * defReduction * GLOBAL_DAMAGE_SCALE);

  return {
    rawDamage: Math.round(rawDamage),
    finalDamage,
    wasCrit,
    elementMultiplier: elementMult,
    defenseReduction: defReduction,
  };
}
