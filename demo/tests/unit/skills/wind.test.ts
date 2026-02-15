import { describe, it, expect } from 'vitest';
import { executeGust, getStatusEffect as gustStatus } from '../../../src/skills/wind/gust.js';
import { executeTornado, getStatusEffect as tornadoStatus } from '../../../src/skills/wind/tornado.js';
import { executeAirSlash, getStatusEffect as airSlashStatus } from '../../../src/skills/wind/airSlash.js';
import { executeCyclone, getStatusEffect as cycloneStatus } from '../../../src/skills/wind/cyclone.js';
import { executeWindBlade, getStatusEffect as windBladeStatus } from '../../../src/skills/wind/windBlade.js';

describe('wind skills', () => {
  // GUST: BASE_DAMAGE=30
  // lv5, neutral, def:0: raw=30*1.25=37.5, final=38
  it('gust: lv5, neutral, def 0 = 38', () => {
    const r = executeGust({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(38);
  });
  // lv5, wind vs ice (2.0): raw=30*1.25*2.0=75, final=75
  it('gust: lv5, wind vs ice = 75', () => {
    const r = executeGust({ attackerLevel: 5, targetElement: 'ice', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(75);
  });
  it('gust: no status effect', () => {
    expect(gustStatus()).toBeNull();
  });

  // TORNADO: BASE_DAMAGE=75
  // lv5, neutral, def:0: raw=75*1.25=93.75, final=94
  it('tornado: lv5, neutral, def 0 = 94', () => {
    const r = executeTornado({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(94);
  });
  // lv5, wind vs ice: raw=75*1.25*2.0=187.5, final=188
  it('tornado: lv5, wind vs ice = 188', () => {
    const r = executeTornado({ attackerLevel: 5, targetElement: 'ice', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(188);
  });
  it('tornado: status is blind', () => {
    const s = tornadoStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('blind');
  });

  // AIRSLASH: BASE_DAMAGE=50
  // lv5, neutral, def:0: raw=50*1.25=62.5, final=63
  it('airSlash: lv5, neutral, def 0 = 63', () => {
    const r = executeAirSlash({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(63);
  });
  // lv5, wind vs ice: raw=50*1.25*2.0=125, final=125
  it('airSlash: lv5, wind vs ice = 125', () => {
    const r = executeAirSlash({ attackerLevel: 5, targetElement: 'ice', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(125);
  });
  it('airSlash: status is bleed', () => {
    const s = airSlashStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('bleed');
  });

  // CYCLONE: BASE_DAMAGE=85
  // lv5, neutral, def:0: raw=85*1.25=106.25, final=106
  it('cyclone: lv5, neutral, def 0 = 106', () => {
    const r = executeCyclone({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(106);
  });
  // lv5, wind vs ice: raw=85*1.25*2.0=212.5, final=213
  it('cyclone: lv5, wind vs ice = 213', () => {
    const r = executeCyclone({ attackerLevel: 5, targetElement: 'ice', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(213);
  });
  it('cyclone: status is blind', () => {
    const s = cycloneStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('blind');
  });

  // WINDBLADE: BASE_DAMAGE=60
  // lv5, neutral, def:0: raw=60*1.25=75, final=75
  it('windBlade: lv5, neutral, def 0 = 75', () => {
    const r = executeWindBlade({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(75);
  });
  // lv5, wind vs ice: raw=60*1.25*2.0=150, final=150
  it('windBlade: lv5, wind vs ice = 150', () => {
    const r = executeWindBlade({ attackerLevel: 5, targetElement: 'ice', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(150);
  });
  it('windBlade: status is bleed', () => {
    const s = windBladeStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('bleed');
  });
});
