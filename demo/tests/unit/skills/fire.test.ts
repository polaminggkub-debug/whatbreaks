import { describe, it, expect } from 'vitest';
import { executeFireball, getStatusEffect as fireballStatus } from '../../../src/skills/fire/fireball.js';
import { executeFlameWave, getStatusEffect as flameWaveStatus } from '../../../src/skills/fire/flameWave.js';
import { executeBlazeStrike, getStatusEffect as blazeStrikeStatus } from '../../../src/skills/fire/blazeStrike.js';
import { executeEmber, getStatusEffect as emberStatus } from '../../../src/skills/fire/ember.js';
import { executeInferno, getStatusEffect as infernoStatus } from '../../../src/skills/fire/inferno.js';

describe('fire skills', () => {
  // FIREBALL: BASE_DAMAGE=45
  // lv5, neutral, critSeed:1, def:0: levelBonus=1.25, raw=45*1.25=56.25, final=56, total=56
  it('fireball: lv5, neutral, def 0 = 56', () => {
    const r = executeFireball({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(56);
  });
  // lv5, fire vs ice (2.0): raw=45*1.25*2.0=112.5, final=round(112.5)=113, total=113
  it('fireball: lv5, fire vs ice = 113', () => {
    const r = executeFireball({ attackerLevel: 5, targetElement: 'ice', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(113);
  });
  it('fireball: status is burn', () => {
    const s = fireballStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('burn');
    expect(s!.damagePerTurn).toBe(10);
  });

  // FLAMEWAVE: BASE_DAMAGE=55
  // lv5, neutral, def:0: raw=55*1.25=68.75, final=69, total=69
  it('flameWave: lv5, neutral, def 0 = 69', () => {
    const r = executeFlameWave({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(69);
  });
  // lv5, fire vs ice: raw=55*1.25*2.0=137.5, final=138
  it('flameWave: lv5, fire vs ice = 138', () => {
    const r = executeFlameWave({ attackerLevel: 5, targetElement: 'ice', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(138);
  });
  it('flameWave: status is burn', () => {
    const s = flameWaveStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('burn');
  });

  // BLAZESTRIKE: BASE_DAMAGE=70
  // lv5, neutral, def:0: raw=70*1.25=87.5, final=88
  it('blazeStrike: lv5, neutral, def 0 = 88', () => {
    const r = executeBlazeStrike({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(88);
  });
  // lv5, fire vs ice: raw=70*1.25*2.0=175, final=175
  it('blazeStrike: lv5, fire vs ice = 175', () => {
    const r = executeBlazeStrike({ attackerLevel: 5, targetElement: 'ice', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(175);
  });
  it('blazeStrike: no status effect', () => {
    expect(blazeStrikeStatus()).toBeNull();
  });

  // EMBER: BASE_DAMAGE=20
  // lv5, neutral, def:0: raw=20*1.25=25, final=25
  it('ember: lv5, neutral, def 0 = 25', () => {
    const r = executeEmber({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(25);
  });
  // lv5, fire vs ice: raw=20*1.25*2.0=50, final=50
  it('ember: lv5, fire vs ice = 50', () => {
    const r = executeEmber({ attackerLevel: 5, targetElement: 'ice', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(50);
  });
  it('ember: status is burn', () => {
    const s = emberStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('burn');
  });

  // INFERNO: BASE_DAMAGE=90
  // lv5, neutral, def:0: raw=90*1.25=112.5, final=113
  it('inferno: lv5, neutral, def 0 = 113', () => {
    const r = executeInferno({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(113);
  });
  // lv5, fire vs ice: raw=90*1.25*2.0=225, final=225
  it('inferno: lv5, fire vs ice = 225', () => {
    const r = executeInferno({ attackerLevel: 5, targetElement: 'ice', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(225);
  });
  it('inferno: status is burn (not stackable)', () => {
    const s = infernoStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('burn');
    expect(s!.stackable).toBe(false);
  });
});
