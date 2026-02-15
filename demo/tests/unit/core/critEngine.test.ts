import { describe, it, expect } from 'vitest';
import { getCritChance, calculateCritDamage } from '../../../src/core/crit/critEngine.js';

describe('critEngine', () => {
  // getCritChance tests
  it('getCritChance(0) = 0.05', () => expect(getCritChance(0)).toBe(0.05));
  it('getCritChance(0.1) ~ 0.15', () => expect(getCritChance(0.1)).toBeCloseTo(0.15, 10));
  it('getCritChance(0.95) = 1.0 (capped)', () => expect(getCritChance(0.95)).toBe(1.0));

  // calculateCritDamage tests
  // seed 0 < getCritChance(0.1)=0.15 -> crit
  it('calculateCritDamage(0.1, 0) = 1.5 (crit)', () => expect(calculateCritDamage(0.1, 0)).toBe(1.5));
  // seed 1 > getCritChance(0.1)=0.15 -> no crit
  it('calculateCritDamage(0.1, 1) = 1.0 (no crit)', () => expect(calculateCritDamage(0.1, 1)).toBe(1.0));
  // getCritChance(0)=0.05, seed 0.04 < 0.05 -> crit
  it('calculateCritDamage(0, 0.04) = 1.5 (crit)', () => expect(calculateCritDamage(0, 0.04)).toBe(1.5));
  // getCritChance(0)=0.05, seed 0.06 > 0.05 -> no crit
  it('calculateCritDamage(0, 0.06) = 1.0 (no crit)', () => expect(calculateCritDamage(0, 0.06)).toBe(1.0));
  // getCritChance(0.95)=1.0, any seed < 1.0 -> crit
  it('calculateCritDamage(0.95, 0.5) = 1.5 (always crit)', () => expect(calculateCritDamage(0.95, 0.5)).toBe(1.5));
});
