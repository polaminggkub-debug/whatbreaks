import { describe, it, expect } from 'vitest';
import { executeTurn, BattleCharacter, BattleAction } from '../../../src/battle/battleEngine.js';

function makeChar(overrides: Partial<BattleCharacter> = {}): BattleCharacter {
  return { name: 'Attacker', level: 5, hp: 500, maxHp: 500, element: 'neutral', defense: 0, statuses: [], ...overrides };
}

function makeAction(overrides: Partial<BattleAction> = {}): BattleAction {
  return { type: 'skill', baseDamage: 100, element: 'neutral', critChance: 0, critSeed: 1, ...overrides };
}

describe('battleEngine', () => {
  // Test 1: basic attack, lv5 attacker, 100 base, neutral, def 0
  // levelBonus=1.25, rawDamage=125, finalDamage=125, totalDamage=125
  // defenderHp = 500 - 125 = 375
  it('basic neutral attack does 125 damage', () => {
    const attacker = makeChar();
    const defender = makeChar({ name: 'Defender' });
    const result = executeTurn(attacker, defender, makeAction());
    expect(result.damage).toBe(125);
    expect(result.defenderHp).toBe(375);
    expect(result.defenderDown).toBe(false);
  });

  // Test 2: fire vs ice attack, 100 base, lv5, def 50
  // levelBonus=1.25, elementMult=2.0, rawDamage=250
  // defReduction=100/150=0.6667, finalDamage=round(250*0.6667)=round(166.67)=167
  // defenderHp = 500 - 167 = 333
  it('fire vs ice with defense does 167 damage', () => {
    const attacker = makeChar();
    const defender = makeChar({ name: 'Defender', element: 'ice', defense: 50 });
    const result = executeTurn(attacker, defender, makeAction({ element: 'fire' }));
    expect(result.damage).toBe(167);
    expect(result.defenderHp).toBe(333);
  });

  // Test 3: kills the defender
  // baseDamage=400, lv5, neutral, def 0
  // rawDamage=400*1.25=500, totalDamage=500
  // defenderHp = 500 - 500 = 0
  it('lethal attack sets defenderDown = true', () => {
    const attacker = makeChar();
    const defender = makeChar({ name: 'Defender' });
    const result = executeTurn(attacker, defender, makeAction({ baseDamage: 400 }));
    expect(result.damage).toBe(500);
    expect(result.defenderHp).toBe(0);
    expect(result.defenderDown).toBe(true);
  });

  // Test 4: with bonus damage percent
  // baseDamage=100, lv5, neutral, def 0, bonusPercent=20
  // finalDamage=125, bonusDamage=round(125*20/100)=25, totalDamage=150
  it('attack with 20% bonus does 150 damage', () => {
    const attacker = makeChar();
    const defender = makeChar({ name: 'Defender' });
    const result = executeTurn(attacker, defender, makeAction({ bonusDamagePercent: 20 }));
    expect(result.damage).toBe(150);
    expect(result.defenderHp).toBe(350);
  });

  // Test 5: attack with status effect applied
  it('attack applies status effect', () => {
    const attacker = makeChar();
    const defender = makeChar({ name: 'Defender' });
    const burnEffect = { type: 'burn' as const, element: 'fire' as const, damagePerTurn: 10, duration: 3, stackable: true };
    const result = executeTurn(attacker, defender, makeAction({ statusEffect: burnEffect }));
    expect(result.appliedStatus).toBe('burn');
    expect(defender.statuses.length).toBe(1);
    expect(defender.statuses[0].effect.type).toBe('burn');
  });
});
