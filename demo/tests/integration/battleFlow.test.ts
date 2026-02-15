import { describe, it, expect } from 'vitest';
import { executeTurn, BattleCharacter, BattleAction } from '../../src/battle/battleEngine.js';
import { executeRound } from '../../src/battle/turnResolver.js';
import { createCharacter } from '../../src/characters/createCharacter.js';

function toBattleChar(stats: ReturnType<typeof createCharacter>): BattleCharacter {
  return { name: stats.name, level: stats.level, hp: stats.hp, maxHp: stats.maxHp, element: stats.element, defense: stats.defense, statuses: [] };
}

describe('battleFlow integration', () => {
  // Test 1: warrior vs mage, single turn
  // warrior lv5: attack=25+4*3=37 (irrelevant for damage), def=30+4*4=46, element=earth, hp=200+4*20=280
  // mage lv5: def=10+4*1=14, element=fire, hp=120+4*10=160
  // warrior attacks mage with baseDamage=50, earth vs fire (2.0), lv5, def=14
  // levelBonus=1.25, elementMult=2.0, rawDamage=50*1.25*2.0=125
  // defReduction=100/(100+14)=100/114=0.8772
  // finalDamage=round(125*0.8772)=round(109.65)=110
  it('warrior attacks mage: earth vs fire = 110 damage', () => {
    const warrior = toBattleChar(createCharacter('Warrior', 'warrior', 5));
    const mage = toBattleChar(createCharacter('Mage', 'mage', 5));
    const action: BattleAction = { type: 'skill', baseDamage: 50, element: 'earth', critChance: 0, critSeed: 1 };
    const result = executeTurn(warrior, mage, action);
    expect(result.damage).toBe(110);
    expect(mage.hp).toBe(50);
  });

  // Test 2: mage attacks warrior: fire vs earth (0.5 resisted)
  // mage lv5, baseDamage=80, fire vs earth (0.5), warrior def=46
  // levelBonus=1.25, elementMult=0.5, rawDamage=80*1.25*0.5=50
  // defReduction=100/(100+46)=100/146=0.6849
  // finalDamage=round(50*0.6849)=round(34.25)=34
  it('mage attacks warrior: fire vs earth (resisted) = 34 damage', () => {
    const warrior = toBattleChar(createCharacter('Warrior', 'warrior', 5));
    const mage = toBattleChar(createCharacter('Mage', 'mage', 5));
    const action: BattleAction = { type: 'skill', baseDamage: 80, element: 'fire', critChance: 0, critSeed: 1 };
    const result = executeTurn(mage, warrior, action);
    expect(result.damage).toBe(34);
    expect(warrior.hp).toBe(246);
  });

  // Test 3: full round - both characters attack
  // warrior attacks mage: 50 base, earth vs fire (2.0), def=14 -> 110 damage
  // mage attacks warrior: 80 base, fire vs earth (0.5), def=46 -> 34 damage
  it('full round: warrior vs mage', () => {
    const warrior = toBattleChar(createCharacter('Warrior', 'warrior', 5));
    const mage = toBattleChar(createCharacter('Mage', 'mage', 5));
    const wAction: BattleAction = { type: 'skill', baseDamage: 50, element: 'earth', critChance: 0, critSeed: 1 };
    const mAction: BattleAction = { type: 'skill', baseDamage: 80, element: 'fire', critChance: 0, critSeed: 1 };
    const result = executeRound(warrior, mage, wAction, mAction, 1);
    expect(result.battleOver).toBe(false);
    expect(mage.hp).toBe(50);
    expect(warrior.hp).toBe(246);
  });

  // Test 4: two rounds, mage dies in round 2
  it('warrior kills mage in round 2', () => {
    const warrior = toBattleChar(createCharacter('Warrior', 'warrior', 5));
    const mage = toBattleChar(createCharacter('Mage', 'mage', 5));
    const wAction: BattleAction = { type: 'skill', baseDamage: 50, element: 'earth', critChance: 0, critSeed: 1 };
    const mAction: BattleAction = { type: 'skill', baseDamage: 80, element: 'fire', critChance: 0, critSeed: 1 };

    const r1 = executeRound(warrior, mage, wAction, mAction, 1);
    expect(r1.battleOver).toBe(false);

    const r2 = executeRound(warrior, mage, wAction, mAction, 2);
    expect(r2.battleOver).toBe(true);
    expect(r2.winner).toBe('Warrior');
  });

  // Test 5: neutral vs neutral fight
  // Both lv1, 100 base, neutral, def=0
  // damage = round(100*1.05) = 105 each
  it('neutral vs neutral: both take 105', () => {
    const c1 = toBattleChar(createCharacter('A', 'warrior', 1));
    const c2 = toBattleChar(createCharacter('B', 'warrior', 1));
    c1.element = 'neutral'; c2.element = 'neutral';
    c1.defense = 0; c2.defense = 0;
    const action: BattleAction = { type: 'skill', baseDamage: 100, element: 'neutral', critChance: 0, critSeed: 1 };
    const result = executeRound(c1, c2, action, action, 1);
    expect(result.turns[0].damage).toBe(105);
    expect(result.turns[1].damage).toBe(105);
  });

  // Test 6: assassin crit attack
  // assassin lv1: element=lightning, def=8, critChance=0.35
  // baseDamage=60, lightning vs neutral(1.0), lv1, def=0
  // getCritChance(0.35) = 0.40, seed=0 < 0.40 -> crit 1.5
  // rawDamage=60*1.05*1.5=94.5, finalDamage=95
  it('assassin crits for 95', () => {
    const assassin = toBattleChar(createCharacter('Shadow', 'assassin', 1));
    const target: BattleCharacter = { name: 'Target', level: 1, hp: 500, maxHp: 500, element: 'neutral', defense: 0, statuses: [] };
    const action: BattleAction = { type: 'skill', baseDamage: 60, element: 'lightning', critChance: 0.35, critSeed: 0 };
    const result = executeTurn(assassin, target, action);
    expect(result.damage).toBe(95);
  });

  // Test 7: high defense reduces damage significantly
  // baseDamage=100, lv1, neutral, def=900
  // defReduction = 100/(100+900) = 0.1 (capped)
  // rawDamage=105, finalDamage=round(105*0.1)=round(10.5)=11
  it('high defense caps at 90% reduction', () => {
    const attacker: BattleCharacter = { name: 'A', level: 1, hp: 500, maxHp: 500, element: 'neutral', defense: 0, statuses: [] };
    const defender: BattleCharacter = { name: 'D', level: 1, hp: 500, maxHp: 500, element: 'neutral', defense: 900, statuses: [] };
    const action: BattleAction = { type: 'skill', baseDamage: 100, element: 'neutral', critChance: 0, critSeed: 1 };
    const result = executeTurn(attacker, defender, action);
    expect(result.damage).toBe(11);
  });

  // Test 8: high level attacker does lots of damage
  // lv100, baseDamage=10, neutral, def=0
  // levelBonus=6.0, rawDamage=60, finalDamage=60
  it('lv100 attacker with 10 base does 60', () => {
    const attacker: BattleCharacter = { name: 'A', level: 100, hp: 500, maxHp: 500, element: 'neutral', defense: 0, statuses: [] };
    const defender: BattleCharacter = { name: 'D', level: 1, hp: 500, maxHp: 500, element: 'neutral', defense: 0, statuses: [] };
    const action: BattleAction = { type: 'skill', baseDamage: 10, element: 'neutral', critChance: 0, critSeed: 1 };
    const result = executeTurn(attacker, defender, action);
    expect(result.damage).toBe(60);
  });

  // Test 9: overkill - damage is more than HP
  it('overkill clamps hp to 0', () => {
    const attacker: BattleCharacter = { name: 'A', level: 10, hp: 500, maxHp: 500, element: 'neutral', defense: 0, statuses: [] };
    const defender: BattleCharacter = { name: 'D', level: 1, hp: 50, maxHp: 50, element: 'neutral', defense: 0, statuses: [] };
    const action: BattleAction = { type: 'skill', baseDamage: 200, element: 'neutral', critChance: 0, critSeed: 1 };
    const result = executeTurn(attacker, defender, action);
    expect(result.defenderHp).toBe(0);
    expect(result.defenderDown).toBe(true);
    // rawDamage = 200*1.5 = 300
    expect(result.damage).toBe(300);
  });

  // Test 10: element advantage chain (ice vs earth)
  // baseDamage=60, lv5, ice vs earth (2.0), def=30
  // levelBonus=1.25, rawDamage=60*1.25*2.0=150
  // defReduction=100/130=0.7692, finalDamage=round(150*0.7692)=round(115.38)=115
  it('ice vs earth with defense = 115', () => {
    const attacker: BattleCharacter = { name: 'A', level: 5, hp: 500, maxHp: 500, element: 'ice', defense: 0, statuses: [] };
    const defender: BattleCharacter = { name: 'D', level: 1, hp: 500, maxHp: 500, element: 'earth', defense: 30, statuses: [] };
    const action: BattleAction = { type: 'skill', baseDamage: 60, element: 'ice', critChance: 0, critSeed: 1 };
    const result = executeTurn(attacker, defender, action);
    expect(result.damage).toBe(115);
  });
});
