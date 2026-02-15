import { describe, it, expect } from 'vitest';
import { executeFrostbolt, getStatusEffect as frostboltStatus } from '../../../src/skills/ice/frostbolt.js';
import { executeBlizzard, getStatusEffect as blizzardStatus } from '../../../src/skills/ice/blizzard.js';
import { executeIceSpear, getStatusEffect as iceSpearStatus } from '../../../src/skills/ice/iceSpear.js';
import { executeGlacialSlash, getStatusEffect as glacialSlashStatus } from '../../../src/skills/ice/glacialSlash.js';
import { executeFreeze, getStatusEffect as freezeStatus } from '../../../src/skills/ice/freeze.js';

describe('ice skills', () => {
  // FROSTBOLT: BASE_DAMAGE=40
  // lv5, neutral, def:0: raw=40*1.25=50, final=50
  it('frostbolt: lv5, neutral, def 0 = 50', () => {
    const r = executeFrostbolt({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(50);
  });
  // lv5, ice vs earth (2.0): raw=40*1.25*2.0=100, final=100
  it('frostbolt: lv5, ice vs earth = 100', () => {
    const r = executeFrostbolt({ attackerLevel: 5, targetElement: 'earth', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(100);
  });
  it('frostbolt: status is freeze', () => {
    const s = frostboltStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('freeze');
  });

  // BLIZZARD: BASE_DAMAGE=85
  // lv5, neutral, def:0: raw=85*1.25=106.25, final=106
  it('blizzard: lv5, neutral, def 0 = 106', () => {
    const r = executeBlizzard({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(106);
  });
  // lv5, ice vs earth: raw=85*1.25*2.0=212.5, final=213
  it('blizzard: lv5, ice vs earth = 213', () => {
    const r = executeBlizzard({ attackerLevel: 5, targetElement: 'earth', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(213);
  });
  it('blizzard: status is freeze', () => {
    const s = blizzardStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('freeze');
  });

  // ICESPEAR: BASE_DAMAGE=60
  // lv5, neutral, def:0: raw=60*1.25=75, final=75
  it('iceSpear: lv5, neutral, def 0 = 75', () => {
    const r = executeIceSpear({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(75);
  });
  // lv5, ice vs earth: raw=60*1.25*2.0=150, final=150
  it('iceSpear: lv5, ice vs earth = 150', () => {
    const r = executeIceSpear({ attackerLevel: 5, targetElement: 'earth', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(150);
  });
  it('iceSpear: status is slow', () => {
    const s = iceSpearStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('slow');
  });

  // GLACIALSLASH: BASE_DAMAGE=50
  // lv5, neutral, def:0: raw=50*1.25=62.5, final=63
  it('glacialSlash: lv5, neutral, def 0 = 63', () => {
    const r = executeGlacialSlash({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(63);
  });
  // lv5, ice vs earth: raw=50*1.25*2.0=125, final=125
  it('glacialSlash: lv5, ice vs earth = 125', () => {
    const r = executeGlacialSlash({ attackerLevel: 5, targetElement: 'earth', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(125);
  });
  it('glacialSlash: status is freeze', () => {
    const s = glacialSlashStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('freeze');
  });

  // FREEZE: BASE_DAMAGE=30
  // lv5, neutral, def:0: raw=30*1.25=37.5, final=38
  it('freeze: lv5, neutral, def 0 = 38', () => {
    const r = executeFreeze({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(38);
  });
  // lv5, ice vs earth: raw=30*1.25*2.0=75, final=75
  it('freeze: lv5, ice vs earth = 75', () => {
    const r = executeFreeze({ attackerLevel: 5, targetElement: 'earth', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(75);
  });
  it('freeze: status is freeze', () => {
    const s = freezeStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('freeze');
  });
});
