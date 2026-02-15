import { describe, it, expect } from 'vitest';
import { getElementMultiplier, isEffective, isResisted } from '../../../src/core/element/elementResolver.js';

describe('elementResolver', () => {
  // SENSITIVE - multiplier value tests
  it('fire vs ice = 2.0', () => expect(getElementMultiplier('fire', 'ice')).toBe(2.0));
  it('ice vs earth = 2.0', () => expect(getElementMultiplier('ice', 'earth')).toBe(2.0));
  it('lightning vs wind = 2.0', () => expect(getElementMultiplier('lightning', 'wind')).toBe(2.0));
  it('earth vs fire = 2.0', () => expect(getElementMultiplier('earth', 'fire')).toBe(2.0));
  it('wind vs ice = 2.0', () => expect(getElementMultiplier('wind', 'ice')).toBe(2.0));

  // INSENSITIVE - boolean type checks
  it('isEffective fire vs ice = true', () => expect(isEffective('fire', 'ice')).toBe(true));
  it('isResisted fire vs fire = true', () => expect(isResisted('fire', 'fire')).toBe(true));
  it('isEffective neutral vs neutral = false', () => expect(isEffective('neutral', 'neutral')).toBe(false));
  it('isResisted neutral vs fire = false', () => expect(isResisted('neutral', 'fire')).toBe(false));
  it('isEffective earth vs lightning = true', () => expect(isEffective('earth', 'lightning')).toBe(true));
});
