// L1: Primitive - element matchup resolution
import { ElementType } from './types.js';
import { GLOBAL_DAMAGE_SCALE } from '../config/globalCombatConfig.js';

const MATCHUP_TABLE: Record<ElementType, Record<ElementType, number>> = {
  fire:      { fire: 0.5, ice: 2.0, lightning: 1.0, earth: 0.5, wind: 1.5, neutral: 1.0 },
  ice:       { fire: 0.5, ice: 0.5, lightning: 1.0, earth: 2.0, wind: 0.5, neutral: 1.0 },
  lightning: { fire: 1.0, ice: 1.0, lightning: 0.5, earth: 0.5, wind: 2.0, neutral: 1.0 },
  earth:     { fire: 2.0, ice: 0.5, lightning: 2.0, earth: 0.5, wind: 0.5, neutral: 1.0 },
  wind:      { fire: 0.5, ice: 2.0, lightning: 0.5, earth: 2.0, wind: 0.5, neutral: 1.0 },
  neutral:   { fire: 1.0, ice: 1.0, lightning: 1.0, earth: 1.0, wind: 1.0, neutral: 1.0 },
};

export function getElementMultiplier(attacker: ElementType, defender: ElementType): number {
  return MATCHUP_TABLE[attacker][defender] * GLOBAL_DAMAGE_SCALE;
}

export function isEffective(attacker: ElementType, defender: ElementType): boolean {
  return getElementMultiplier(attacker, defender) > 1.0;
}

export function isResisted(attacker: ElementType, defender: ElementType): boolean {
  return getElementMultiplier(attacker, defender) < 1.0;
}
