import { calculateFinalDamage } from '../core/damage/calculateFinalDamage.js';
import { getElementMultiplier } from '../core/element/elementResolver.js';
import { ElementType } from '../core/element/types.js';

export interface ComboHit {
  baseDamage: number;
  element: ElementType;
}

export interface ComboResult {
  totalDamage: number;
  hitCount: number;
  comboMultiplier: number;
  hits: number[];
}

export function executeCombo(
  hits: ComboHit[],
  attackerLevel: number,
  targetElement: ElementType,
  targetDefense: number
): ComboResult {
  const hitDamages: number[] = [];
  let comboMultiplier = 1.0;

  for (const hit of hits) {
    const result = calculateFinalDamage({
      baseDamage: hit.baseDamage,
      attackerLevel,
      element: hit.element,
      targetElement,
      critChance: 0,
      critSeed: 1,
      targetDefense,
      bonusDamagePercent: (comboMultiplier - 1) * 100,
    });
    hitDamages.push(result.totalDamage);
    comboMultiplier += 0.1; // each hit increases combo
  }

  return {
    totalDamage: hitDamages.reduce((a, b) => a + b, 0),
    hitCount: hits.length,
    comboMultiplier,
    hits: hitDamages,
  };
}
