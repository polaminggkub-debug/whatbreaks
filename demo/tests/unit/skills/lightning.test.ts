import { describe, it, expect } from 'vitest';
import { executeThunderbolt, getStatusEffect as thunderboltStatus } from '../../../src/skills/lightning/thunderbolt.js';
import { executeSparkChain, getStatusEffect as sparkChainStatus } from '../../../src/skills/lightning/sparkChain.js';
import { executeStormCall, getStatusEffect as stormCallStatus } from '../../../src/skills/lightning/stormCall.js';
import { executeShockwave, getStatusEffect as shockwaveStatus } from '../../../src/skills/lightning/shockwave.js';
import { executeVoltStrike, getStatusEffect as voltStrikeStatus } from '../../../src/skills/lightning/voltStrike.js';

describe('lightning skills', () => {
  // THUNDERBOLT: BASE_DAMAGE=65
  // lv5, neutral, def:0: raw=65*1.25=81.25, final=81
  it('thunderbolt: lv5, neutral, def 0 = 81', () => {
    const r = executeThunderbolt({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(81);
  });
  // lv5, lightning vs wind (2.0): raw=65*1.25*2.0=162.5, final=163
  it('thunderbolt: lv5, lightning vs wind = 163', () => {
    const r = executeThunderbolt({ attackerLevel: 5, targetElement: 'wind', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(163);
  });
  it('thunderbolt: status is shock', () => {
    const s = thunderboltStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('shock');
  });

  // SPARKCHAIN: BASE_DAMAGE=35
  // lv5, neutral, def:0: raw=35*1.25=43.75, final=44
  it('sparkChain: lv5, neutral, def 0 = 44', () => {
    const r = executeSparkChain({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(44);
  });
  // lv5, lightning vs wind: raw=35*1.25*2.0=87.5, final=88
  it('sparkChain: lv5, lightning vs wind = 88', () => {
    const r = executeSparkChain({ attackerLevel: 5, targetElement: 'wind', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(88);
  });
  it('sparkChain: status is shock', () => {
    const s = sparkChainStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('shock');
  });

  // STORMCALL: BASE_DAMAGE=95
  // lv5, neutral, def:0: raw=95*1.25=118.75, final=119
  it('stormCall: lv5, neutral, def 0 = 119', () => {
    const r = executeStormCall({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(119);
  });
  // lv5, lightning vs wind: raw=95*1.25*2.0=237.5, final=238
  it('stormCall: lv5, lightning vs wind = 238', () => {
    const r = executeStormCall({ attackerLevel: 5, targetElement: 'wind', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(238);
  });
  it('stormCall: status is shock (not stackable)', () => {
    const s = stormCallStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('shock');
    expect(s!.stackable).toBe(false);
  });

  // SHOCKWAVE: BASE_DAMAGE=50
  // lv5, neutral, def:0: raw=50*1.25=62.5, final=63
  it('shockwave: lv5, neutral, def 0 = 63', () => {
    const r = executeShockwave({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(63);
  });
  // lv5, lightning vs wind: raw=50*1.25*2.0=125, final=125
  it('shockwave: lv5, lightning vs wind = 125', () => {
    const r = executeShockwave({ attackerLevel: 5, targetElement: 'wind', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(125);
  });
  it('shockwave: status is stun', () => {
    const s = shockwaveStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('stun');
  });

  // VOLTSTRIKE: BASE_DAMAGE=75
  // lv5, neutral, def:0: raw=75*1.25=93.75, final=94
  it('voltStrike: lv5, neutral, def 0 = 94', () => {
    const r = executeVoltStrike({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(94);
  });
  // lv5, lightning vs wind: raw=75*1.25*2.0=187.5, final=188
  it('voltStrike: lv5, lightning vs wind = 188', () => {
    const r = executeVoltStrike({ attackerLevel: 5, targetElement: 'wind', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(188);
  });
  it('voltStrike: status is shock', () => {
    const s = voltStrikeStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('shock');
  });
});
