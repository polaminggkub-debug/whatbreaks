import { describe, it, expect } from 'vitest';
import { getDefenseReduction, getArmorMitigation } from '../../../src/core/defense/defenseCalculator.js';

describe('defenseCalculator', () => {
  // getDefenseReduction tests
  // 100/(100+0) = 1.0
  it('getDefenseReduction(0) = 1.0', () => expect(getDefenseReduction(0)).toBe(1.0));
  // 100/(100+100) = 0.5
  it('getDefenseReduction(100) = 0.5', () => expect(getDefenseReduction(100)).toBe(0.5));
  // 100/(100+50) = 100/150 = 0.6667
  it('getDefenseReduction(50) ~ 0.6667', () => expect(getDefenseReduction(50)).toBeCloseTo(0.6667, 3));
  // 100/(100+900) = 100/1000 = 0.1 -> capped at 0.1
  it('getDefenseReduction(900) = 0.1', () => expect(getDefenseReduction(900)).toBe(0.1));
  // 100/(100+1000) = 100/1100 = 0.0909 -> capped at 0.1
  it('getDefenseReduction(1000) = 0.1 (capped)', () => expect(getDefenseReduction(1000)).toBe(0.1));

  // getArmorMitigation tests: getDefenseReduction(armor + level*2)
  // armor=80, level=10 -> def=80+20=100 -> 100/200=0.5
  it('getArmorMitigation(80, 10) = 0.5', () => expect(getArmorMitigation(80, 10)).toBe(0.5));
  // armor=0, level=1 -> def=0+2=2 -> 100/102 = 0.9804
  it('getArmorMitigation(0, 1) ~ 0.9804', () => expect(getArmorMitigation(0, 1)).toBeCloseTo(0.9804, 3));
  // armor=40, level=5 -> def=40+10=50 -> 100/150 = 0.6667
  it('getArmorMitigation(40, 5) ~ 0.6667', () => expect(getArmorMitigation(40, 5)).toBeCloseTo(0.6667, 3));
});
