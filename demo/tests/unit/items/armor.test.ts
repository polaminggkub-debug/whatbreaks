import { describe, it, expect } from 'vitest';
import { calculateDamageWithArmor as plateDmg } from '../../../src/items/armor/plate.js';
import { calculateDamageWithArmor as chainDmg } from '../../../src/items/armor/chain.js';
import { calculateDamageWithArmor as leatherDmg } from '../../../src/items/armor/leather.js';
import { calculateDamageWithArmor as robeDmg } from '../../../src/items/armor/robe.js';
import { calculateDamageWithArmor as shieldDmg } from '../../../src/items/armor/shield.js';
import { calculateDamageWithArmor as helmDmg } from '../../../src/items/armor/helm.js';

// calculateDamageWithArmor(baseDamage, attackerLevel, targetLevel)
// -> calculateFinalDamage with defense = BASE_DEFENSE + targetLevel*2, neutral, critSeed=1, no bonus
// levelBonus = 1 + attackerLevel*0.05
// defReduction = 100 / (100 + (BASE_DEFENSE + targetLevel*2))
// rawDamage = baseDamage * levelBonus
// finalDamage = round(rawDamage * defReduction)

describe('armor', () => {
  // PLATE: DEF=80. baseDamage=100, attackerLv=5, targetLv=5
  // defense = 80 + 10 = 90, defReduction = 100/190 = 0.5263
  // levelBonus=1.25, rawDamage=125, finalDamage=round(125*0.5263)=round(65.79)=66
  it('plate: 100 base, lv5 attacker, lv5 target = 66', () => {
    const r = plateDmg(100, 5, 5);
    expect(r.mitigated).toBe(66);
  });

  // CHAIN: DEF=60. baseDamage=100, attackerLv=5, targetLv=5
  // defense = 60+10=70, defReduction = 100/170 = 0.5882
  // rawDamage=125, finalDamage=round(125*0.5882)=round(73.53)=74
  it('chain: 100 base, lv5 attacker, lv5 target = 74', () => {
    const r = chainDmg(100, 5, 5);
    expect(r.mitigated).toBe(74);
  });

  // LEATHER: DEF=40. baseDamage=100, attackerLv=5, targetLv=5
  // defense=40+10=50, defReduction=100/150=0.6667
  // rawDamage=125, finalDamage=round(125*0.6667)=round(83.33)=83
  it('leather: 100 base, lv5 attacker, lv5 target = 83', () => {
    const r = leatherDmg(100, 5, 5);
    expect(r.mitigated).toBe(83);
  });

  // ROBE: DEF=20. baseDamage=100, attackerLv=5, targetLv=5
  // defense=20+10=30, defReduction=100/130=0.7692
  // rawDamage=125, finalDamage=round(125*0.7692)=round(96.15)=96
  it('robe: 100 base, lv5 attacker, lv5 target = 96', () => {
    const r = robeDmg(100, 5, 5);
    expect(r.mitigated).toBe(96);
  });

  // SHIELD: DEF=100. baseDamage=100, attackerLv=5, targetLv=5
  // defense=100+10=110, defReduction=100/210=0.4762
  // rawDamage=125, finalDamage=round(125*0.4762)=round(59.52)=60
  it('shield: 100 base, lv5 attacker, lv5 target = 60', () => {
    const r = shieldDmg(100, 5, 5);
    expect(r.mitigated).toBe(60);
  });

  // HELM: DEF=50. baseDamage=100, attackerLv=5, targetLv=5
  // defense=50+10=60, defReduction=100/160=0.625
  // rawDamage=125, finalDamage=round(125*0.625)=round(78.125)=78
  it('helm: 100 base, lv5 attacker, lv5 target = 78', () => {
    const r = helmDmg(100, 5, 5);
    expect(r.mitigated).toBe(78);
  });
});
