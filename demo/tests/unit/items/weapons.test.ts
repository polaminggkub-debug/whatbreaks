import { describe, it, expect } from 'vitest';
import { calculateWeaponDamage as swordDmg } from '../../../src/items/weapons/sword.js';
import { calculateWeaponDamage as bowDmg } from '../../../src/items/weapons/bow.js';
import { calculateWeaponDamage as staffDmg } from '../../../src/items/weapons/staff.js';
import { calculateWeaponDamage as axeDmg } from '../../../src/items/weapons/axe.js';
import { calculateWeaponDamage as daggerDmg } from '../../../src/items/weapons/dagger.js';
import { calculateWeaponDamage as hammerDmg } from '../../../src/items/weapons/hammer.js';
import { calculateWeaponDamage as spearDmg } from '../../../src/items/weapons/spear.js';
import { calculateWeaponDamage as wandDmg } from '../../../src/items/weapons/wand.js';

// All weapon tests: lv5, neutral vs neutral, critSeed:1, defense:0
// Formula: calculateFinalDamage with baseDamage=BASE_ATTACK, critChance=CRIT_BONUS, bonusDamagePercent=BONUS_DAMAGE_PERCENT
// critSeed=1 -> getCritChance(CRIT_BONUS) -> crit only if seed < chance (1 never < anything < 1)
// levelBonus = 1.25
// rawDamage = BASE_ATTACK * 1.25 * 1.0 * 1.0 = BASE_ATTACK * 1.25
// finalDamage = round(rawDamage)
// bonusDamage = round(finalDamage * BONUS_DAMAGE_PERCENT / 100)
// totalDamage = finalDamage + bonusDamage

describe('weapons', () => {
  // SWORD: BASE=50, BONUS=10%, CRIT=0.10
  // raw=50*1.25=62.5, final=63, bonus=round(63*10/100)=round(6.3)=6, total=69
  it('sword: lv5, neutral, def 0, no crit = 69', () => {
    const r = swordDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(69);
  });
  // sword with crit: getCritChance(0.10)=0.15, seed=0<0.15 -> crit 1.5
  // raw=50*1.25*1.5=93.75, final=94, bonus=round(94*10/100)=round(9.4)=9, total=103
  it('sword: lv5, neutral, def 0, crit = 103', () => {
    const r = swordDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 0 });
    expect(r.totalDamage).toBe(103);
  });

  // BOW: BASE=40, BONUS=5%, CRIT=0.20
  // raw=40*1.25=50, final=50, bonus=round(50*5/100)=round(2.5)=3, total=53
  it('bow: lv5, neutral, def 0, no crit = 53', () => {
    const r = bowDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(53);
  });
  // bow crit: getCritChance(0.20)=0.25, seed=0 -> crit
  // raw=40*1.25*1.5=75, final=75, bonus=round(75*5/100)=round(3.75)=4, total=79
  it('bow: lv5, neutral, def 0, crit = 79', () => {
    const r = bowDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 0 });
    expect(r.totalDamage).toBe(79);
  });

  // STAFF: BASE=35, BONUS=20%, CRIT=0.05
  // raw=35*1.25=43.75, final=44, bonus=round(44*20/100)=round(8.8)=9, total=53
  it('staff: lv5, neutral, def 0, no crit = 53', () => {
    const r = staffDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(53);
  });
  // staff crit: getCritChance(0.05)=0.10, seed=0 -> crit
  // raw=35*1.25*1.5=65.625, final=66, bonus=round(66*20/100)=round(13.2)=13, total=79
  it('staff: lv5, neutral, def 0, crit = 79', () => {
    const r = staffDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 0 });
    expect(r.totalDamage).toBe(79);
  });

  // AXE: BASE=65, BONUS=5%, CRIT=0.15
  // raw=65*1.25=81.25, final=81, bonus=round(81*5/100)=round(4.05)=4, total=85
  it('axe: lv5, neutral, def 0, no crit = 85', () => {
    const r = axeDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(85);
  });
  // axe crit: getCritChance(0.15)=0.20, seed=0 -> crit
  // raw=65*1.25*1.5=121.875, final=122, bonus=round(122*5/100)=round(6.1)=6, total=128
  it('axe: lv5, neutral, def 0, crit = 128', () => {
    const r = axeDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 0 });
    expect(r.totalDamage).toBe(128);
  });

  // DAGGER: BASE=30, BONUS=0%, CRIT=0.30
  // raw=30*1.25=37.5, final=38, bonus=round(38*0/100)=0, total=38
  it('dagger: lv5, neutral, def 0, no crit = 38', () => {
    const r = daggerDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(38);
  });
  // dagger crit: getCritChance(0.30)=0.35, seed=0 -> crit
  // raw=30*1.25*1.5=56.25, final=56, bonus=0, total=56
  it('dagger: lv5, neutral, def 0, crit = 56', () => {
    const r = daggerDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 0 });
    expect(r.totalDamage).toBe(56);
  });

  // HAMMER: BASE=75, BONUS=15%, CRIT=0.05
  // raw=75*1.25=93.75, final=94, bonus=round(94*15/100)=round(14.1)=14, total=108
  it('hammer: lv5, neutral, def 0, no crit = 108', () => {
    const r = hammerDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(108);
  });
  // hammer crit: getCritChance(0.05)=0.10, seed=0 -> crit
  // raw=75*1.25*1.5=140.625, final=141, bonus=round(141*15/100)=round(21.15)=21, total=162
  it('hammer: lv5, neutral, def 0, crit = 162', () => {
    const r = hammerDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 0 });
    expect(r.totalDamage).toBe(162);
  });

  // SPEAR: BASE=45, BONUS=8%, CRIT=0.12
  // raw=45*1.25=56.25, final=56, bonus=round(56*8/100)=round(4.48)=4, total=60
  it('spear: lv5, neutral, def 0, no crit = 60', () => {
    const r = spearDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(60);
  });
  // spear crit: getCritChance(0.12)=0.17, seed=0 -> crit
  // raw=45*1.25*1.5=84.375, final=84, bonus=round(84*8/100)=round(6.72)=7, total=91
  it('spear: lv5, neutral, def 0, crit = 91', () => {
    const r = spearDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 0 });
    expect(r.totalDamage).toBe(91);
  });

  // WAND: BASE=25, BONUS=25%, CRIT=0.08
  // raw=25*1.25=31.25, final=31, bonus=round(31*25/100)=round(7.75)=8, total=39
  it('wand: lv5, neutral, def 0, no crit = 39', () => {
    const r = wandDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(39);
  });
  // wand crit: getCritChance(0.08)=0.13, seed=0 -> crit
  // raw=25*1.25*1.5=46.875, final=47, bonus=round(47*25/100)=round(11.75)=12, total=59
  it('wand: lv5, neutral, def 0, crit = 59', () => {
    const r = wandDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 0 });
    expect(r.totalDamage).toBe(59);
  });
});
