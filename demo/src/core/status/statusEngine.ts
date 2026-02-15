// L4: Consumer - status effect processing uses damage calculation
import { ActiveStatus, StatusEffect } from './types.js';
import { calculateFinalDamage } from '../damage/calculateFinalDamage.js';

export function applyStatusDamage(status: ActiveStatus, targetDefense: number): number {
  if (status.effect.damagePerTurn <= 0) return 0;

  const result = calculateFinalDamage({
    baseDamage: status.effect.damagePerTurn * status.stacks,
    attackerLevel: 1,
    element: status.effect.element,
    targetElement: 'neutral',
    critChance: 0,
    critSeed: 1, // never crit on DoT
    targetDefense,
  });

  return result.totalDamage;
}

export function tickStatus(status: ActiveStatus): ActiveStatus | null {
  const remaining = status.remainingTurns - 1;
  if (remaining <= 0) return null;
  return { ...status, remainingTurns: remaining };
}

export function stackStatus(existing: ActiveStatus, newEffect: StatusEffect): ActiveStatus {
  if (!existing.effect.stackable) return existing;
  return {
    ...existing,
    stacks: existing.stacks + 1,
    remainingTurns: Math.max(existing.remainingTurns, newEffect.duration),
  };
}

export function createActiveStatus(effect: StatusEffect): ActiveStatus {
  return { effect, remainingTurns: effect.duration, stacks: 1 };
}
