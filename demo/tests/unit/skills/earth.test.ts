import { describe, it, expect } from 'vitest';
import { executeRockSlam, getStatusEffect as rockSlamStatus } from '../../../src/skills/earth/rockSlam.js';
import { executeEarthquake, getStatusEffect as earthquakeStatus } from '../../../src/skills/earth/earthquake.js';
import { executeStoneWall, getStatusEffect as stoneWallStatus } from '../../../src/skills/earth/stoneWall.js';
import { executeMudSlide, getStatusEffect as mudSlideStatus } from '../../../src/skills/earth/mudSlide.js';
import { executeBoulderToss, getStatusEffect as boulderTossStatus } from '../../../src/skills/earth/boulderToss.js';

describe('earth skills', () => {
  // ROCKSLAM: BASE_DAMAGE=55
  // lv5, neutral, def:0: raw=55*1.25=68.75, final=69
  it('rockSlam: lv5, neutral, def 0 = 69', () => {
    const r = executeRockSlam({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(69);
  });
  // lv5, earth vs fire (2.0): raw=55*1.25*2.0=137.5, final=138
  it('rockSlam: lv5, earth vs fire = 138', () => {
    const r = executeRockSlam({ attackerLevel: 5, targetElement: 'fire', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(138);
  });
  it('rockSlam: status is slow', () => {
    const s = rockSlamStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('slow');
  });

  // EARTHQUAKE: BASE_DAMAGE=80
  // lv5, neutral, def:0: raw=80*1.25=100, final=100
  it('earthquake: lv5, neutral, def 0 = 100', () => {
    const r = executeEarthquake({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(100);
  });
  // lv5, earth vs fire: raw=80*1.25*2.0=200, final=200
  it('earthquake: lv5, earth vs fire = 200', () => {
    const r = executeEarthquake({ attackerLevel: 5, targetElement: 'fire', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(200);
  });
  it('earthquake: status is stun', () => {
    const s = earthquakeStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('stun');
  });

  // STONEWALL: BASE_DAMAGE=25
  // lv5, neutral, def:0: raw=25*1.25=31.25, final=31
  it('stoneWall: lv5, neutral, def 0 = 31', () => {
    const r = executeStoneWall({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(31);
  });
  // lv5, earth vs fire: raw=25*1.25*2.0=62.5, final=63
  it('stoneWall: lv5, earth vs fire = 63', () => {
    const r = executeStoneWall({ attackerLevel: 5, targetElement: 'fire', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(63);
  });
  it('stoneWall: status is weaken', () => {
    const s = stoneWallStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('weaken');
  });

  // MUDSLIDE: BASE_DAMAGE=45
  // lv5, neutral, def:0: raw=45*1.25=56.25, final=56
  it('mudSlide: lv5, neutral, def 0 = 56', () => {
    const r = executeMudSlide({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(56);
  });
  // lv5, earth vs fire: raw=45*1.25*2.0=112.5, final=113
  it('mudSlide: lv5, earth vs fire = 113', () => {
    const r = executeMudSlide({ attackerLevel: 5, targetElement: 'fire', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(113);
  });
  it('mudSlide: status is slow', () => {
    const s = mudSlideStatus();
    expect(s).not.toBeNull();
    expect(s!.type).toBe('slow');
  });

  // BOULDERTOSS: BASE_DAMAGE=70
  // lv5, neutral, def:0: raw=70*1.25=87.5, final=88
  it('boulderToss: lv5, neutral, def 0 = 88', () => {
    const r = executeBoulderToss({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(88);
  });
  // lv5, earth vs fire: raw=70*1.25*2.0=175, final=175
  it('boulderToss: lv5, earth vs fire = 175', () => {
    const r = executeBoulderToss({ attackerLevel: 5, targetElement: 'fire', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(175);
  });
  it('boulderToss: no status effect', () => {
    expect(boulderTossStatus()).toBeNull();
  });
});
