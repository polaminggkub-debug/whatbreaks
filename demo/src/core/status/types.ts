import { ElementType } from '../element/types.js';

export type StatusEffectType = 'burn' | 'freeze' | 'shock' | 'poison' | 'bleed' | 'stun' | 'slow' | 'weaken' | 'blind' | 'silence';

export interface StatusEffect {
  type: StatusEffectType;
  element: ElementType;
  damagePerTurn: number;
  duration: number;
  stackable: boolean;
}

export interface ActiveStatus {
  effect: StatusEffect;
  remainingTurns: number;
  stacks: number;
}
