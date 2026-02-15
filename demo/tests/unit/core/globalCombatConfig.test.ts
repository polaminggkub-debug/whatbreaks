import { describe, it, expect } from 'vitest';
import { GLOBAL_DAMAGE_SCALE, GLOBAL_DEFENSE_SCALE, MAX_LEVEL, XP_PER_LEVEL, BASE_CRIT_CHANCE } from '../../../src/core/config/globalCombatConfig.js';

describe('globalCombatConfig', () => {
  it('has correct damage scale', () => expect(GLOBAL_DAMAGE_SCALE).toBe(1.0));
  it('has correct defense scale', () => expect(GLOBAL_DEFENSE_SCALE).toBe(1.0));
  it('has correct max level', () => expect(MAX_LEVEL).toBe(100));
  it('has correct xp per level', () => expect(XP_PER_LEVEL).toBe(100));
  it('has correct base crit chance', () => expect(BASE_CRIT_CHANCE).toBe(0.05));
});
