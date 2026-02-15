import { describe, it, expect } from 'vitest';
import { executeCombo } from '../../src/battle/comboResolver.js';
import { executeFireball } from '../../src/skills/fire/fireball.js';
import { executeThunderbolt } from '../../src/skills/lightning/thunderbolt.js';
import { calculateWeaponDamage as swordDmg } from '../../src/items/weapons/sword.js';
import { calculateWeaponDamage as daggerDmg } from '../../src/items/weapons/dagger.js';

describe('comboSynergy integration', () => {
  // Test 1: fire combo vs ice target (2.0 multiplier)
  // 3 fire hits of 45 base each, lv5, vs ice, def=0
  // Hit 1: 45*1.25*2.0=112.5, final=113, bonus=0, total=113
  // Hit 2: same raw, final=113, bonus=round(113*10/100)=round(11.3)=11, total=124
  // Hit 3: same raw, final=113, bonus=round(113*20/100)=round(22.6)=23, total=136
  // total=113+124+136=373
  it('3-hit fire combo vs ice = 373', () => {
    const result = executeCombo([
      { baseDamage: 45, element: 'fire' },
      { baseDamage: 45, element: 'fire' },
      { baseDamage: 45, element: 'fire' },
    ], 5, 'ice', 0);
    expect(result.totalDamage).toBe(373);
  });

  // Test 2: mixed element combo
  // Hit 1: fire(45) vs neutral(1.0), lv5, def=0, bonus=0%
  //   raw=45*1.25=56.25, final=56, total=56
  // Hit 2: lightning(65) vs neutral(1.0), lv5, def=0, bonus=10%
  //   raw=65*1.25=81.25, final=81, bonus=round(81*10/100)=round(8.1)=8, total=89
  // total=56+89=145
  it('mixed fire+lightning combo vs neutral = 145', () => {
    const result = executeCombo([
      { baseDamage: 45, element: 'fire' },
      { baseDamage: 65, element: 'lightning' },
    ], 5, 'neutral', 0);
    expect(result.totalDamage).toBe(145);
  });

  // Test 3: combo with high defense
  // 2 hits of 100 neutral, lv10, def=200
  // defReduction=100/300=0.3333
  // Hit 1: raw=100*1.5=150, final=round(150*0.3333)=round(50)=50, bonus=0, total=50
  // Hit 2: same raw, final=50, bonus=round(50*10/100)=round(5)=5, total=55
  // total=50+55=105
  it('combo with high defense = 105', () => {
    const result = executeCombo([
      { baseDamage: 100, element: 'neutral' },
      { baseDamage: 100, element: 'neutral' },
    ], 10, 'neutral', 200);
    expect(result.totalDamage).toBe(105);
  });

  // Test 4: sword damage (weapon + skill synergy concept)
  // sword: baseDamage=50, lv5, neutral vs neutral, def=0, critSeed=1, bonusPercent=10
  // raw=50*1.25=62.5, final=63, bonus=round(63*10/100)=6, total=69
  it('sword baseline damage = 69', () => {
    const r = swordDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(69);
  });

  // Test 5: fireball skill baseline
  // fireball: baseDamage=45, lv5, fire vs neutral (1.0), def=0
  // raw=56.25, final=56
  it('fireball baseline = 56', () => {
    const r = executeFireball({ attackerLevel: 5, targetElement: 'neutral', targetDefense: 0, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(56);
  });

  // Test 6: dagger crit combo
  // dagger: base=30, lv5, neutral, def=0, critSeed=0 -> getCritChance(0.30)=0.35, 0<0.35 -> crit
  // raw=30*1.25*1.5=56.25, final=56, bonus=0, total=56
  it('dagger crit = 56', () => {
    const r = daggerDmg({ attackerLevel: 5, element: 'neutral', targetElement: 'neutral', targetDefense: 0, critSeed: 0 });
    expect(r.totalDamage).toBe(56);
  });

  // Test 7: thunderbolt vs wind (2.0)
  // base=65, lv5, lightning vs wind (2.0), def=50
  // raw=65*1.25*2.0=162.5, defReduction=100/150=0.6667
  // final=round(162.5*0.6667)=round(108.33)=108
  it('thunderbolt vs wind with def = 108', () => {
    const r = executeThunderbolt({ attackerLevel: 5, targetElement: 'wind', targetDefense: 50, critChance: 0, critSeed: 1 });
    expect(r.totalDamage).toBe(108);
  });

  // Test 8: 4-hit combo escalation
  // 4 hits of 30 base, lv5, neutral, def=0
  // Hit 1: raw=37.5, final=38, bonus=round(38*0/100)=0, total=38
  // Hit 2: raw=37.5, final=38, bonus=round(38*10/100)=round(3.8)=4, total=42
  // Hit 3: raw=37.5, final=38, bonus=round(38*20/100)=round(7.6)=8, total=46
  // Hit 4: raw=37.5, final=38, bonus=round(38*30/100)=round(11.4)=11, total=49
  // total=38+42+46+49=175
  it('4-hit combo escalation = 175', () => {
    const result = executeCombo([
      { baseDamage: 30, element: 'neutral' },
      { baseDamage: 30, element: 'neutral' },
      { baseDamage: 30, element: 'neutral' },
      { baseDamage: 30, element: 'neutral' },
    ], 5, 'neutral', 0);
    expect(result.totalDamage).toBe(175);
  });
});
