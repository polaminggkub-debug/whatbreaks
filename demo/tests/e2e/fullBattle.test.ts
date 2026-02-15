import { describe, it, expect } from 'vitest';
import { executeRound } from '../../src/battle/turnResolver.js';
import { BattleCharacter, BattleAction } from '../../src/battle/battleEngine.js';
import { createCharacter } from '../../src/characters/createCharacter.js';

function toBattleChar(stats: ReturnType<typeof createCharacter>): BattleCharacter {
  return { name: stats.name, level: stats.level, hp: stats.hp, maxHp: stats.maxHp, element: stats.element, defense: stats.defense, statuses: [] };
}

describe('fullBattle e2e', () => {
  // Test 1: 3-round battle, warrior (earth) vs mage (fire)
  // warrior lv5: hp=280, def=46, element=earth
  // mage lv5: hp=160, def=14, element=fire
  // warrior action: 60 base, earth, vs fire (2.0)
  // mage action: 50 base, fire, vs earth (0.5)
  //
  // R1: warrior hits mage: 60*1.25*2.0=150, def=100/114=0.8772, final=round(150*0.8772)=round(131.58)=132
  //     mage hp: 160-132=28
  //     mage hits warrior: 50*1.25*0.5=31.25, def=100/146=0.6849, final=round(31.25*0.6849)=round(21.40)=21
  //     warrior hp: 280-21=259
  // R2: warrior hits mage: 132 > 28 -> mage dies
  it('warrior kills mage in 2 rounds', () => {
    const warrior = toBattleChar(createCharacter('Warrior', 'warrior', 5));
    const mage = toBattleChar(createCharacter('Mage', 'mage', 5));
    const wAction: BattleAction = { type: 'skill', baseDamage: 60, element: 'earth', critChance: 0, critSeed: 1 };
    const mAction: BattleAction = { type: 'skill', baseDamage: 50, element: 'fire', critChance: 0, critSeed: 1 };

    const r1 = executeRound(warrior, mage, wAction, mAction, 1);
    expect(r1.battleOver).toBe(false);
    expect(mage.hp).toBe(28);
    expect(warrior.hp).toBe(259);

    const r2 = executeRound(warrior, mage, wAction, mAction, 2);
    expect(r2.battleOver).toBe(true);
    expect(r2.winner).toBe('Warrior');
  });

  // Test 2: mirror match (both neutral, same stats)
  // Both: lv5, hp=500, def=0, neutral
  // Both attack with baseDamage=100, neutral
  // Each does: 100*1.25=125 per round
  // After 3 rounds: 500 - 125*3 = 500 - 375 = 125 each
  it('mirror match: 3 rounds, both at 125 hp', () => {
    const c1: BattleCharacter = { name: 'A', level: 5, hp: 500, maxHp: 500, element: 'neutral', defense: 0, statuses: [] };
    const c2: BattleCharacter = { name: 'B', level: 5, hp: 500, maxHp: 500, element: 'neutral', defense: 0, statuses: [] };
    const action: BattleAction = { type: 'skill', baseDamage: 100, element: 'neutral', critChance: 0, critSeed: 1 };

    for (let i = 1; i <= 3; i++) {
      executeRound(c1, c2, action, action, i);
    }
    expect(c1.hp).toBe(125);
    expect(c2.hp).toBe(125);
  });

  // Test 3: assassin vs healer
  // assassin lv5: hp=110+4*8=142, def=8+4*1=12, element=lightning
  // healer lv5: hp=130+4*15=190, def=20+4*3=32, element=ice
  // assassin attacks: 80 base, lightning vs ice (1.0), def=32
  //   raw=80*1.25*1.0=100, defReduction=100/132=0.7576, final=round(100*0.7576)=round(75.76)=76
  // healer attacks: 30 base, ice vs lightning (1.0), def=12
  //   raw=30*1.25*1.0=37.5, defReduction=100/112=0.8929, final=round(37.5*0.8929)=round(33.48)=33
  //
  // R1: healer hp=190-76=114, assassin hp=142-33=109
  // R2: healer hp=114-76=38, assassin hp=109-33=76
  // R3: healer hp=38-76 -> 0 dead
  it('assassin kills healer in 3 rounds', () => {
    const assassin = toBattleChar(createCharacter('Shadow', 'assassin', 5));
    const healer = toBattleChar(createCharacter('Priest', 'healer', 5));
    const aAction: BattleAction = { type: 'skill', baseDamage: 80, element: 'lightning', critChance: 0, critSeed: 1 };
    const hAction: BattleAction = { type: 'skill', baseDamage: 30, element: 'ice', critChance: 0, critSeed: 1 };

    let result;
    for (let i = 1; i <= 3; i++) {
      result = executeRound(assassin, healer, aAction, hAction, i);
      if (result.battleOver) break;
    }
    expect(result!.battleOver).toBe(true);
    expect(result!.winner).toBe('Shadow');
    expect(result!.round).toBe(3);
  });

  // Test 4: high defense stalemate (3 rounds, no one dies)
  // Both: lv1, hp=1000, def=200, neutral
  // Each does: 100*1.05=105, defReduction=100/300=0.3333, final=round(105*0.3333)=round(35)=35
  // After 3 rounds: 1000-105=895 each (3*35=105 total)
  it('3 rounds with high defense, both survive', () => {
    const c1: BattleCharacter = { name: 'Tank1', level: 1, hp: 1000, maxHp: 1000, element: 'neutral', defense: 200, statuses: [] };
    const c2: BattleCharacter = { name: 'Tank2', level: 1, hp: 1000, maxHp: 1000, element: 'neutral', defense: 200, statuses: [] };
    const action: BattleAction = { type: 'skill', baseDamage: 100, element: 'neutral', critChance: 0, critSeed: 1 };

    let lastResult;
    for (let i = 1; i <= 3; i++) {
      lastResult = executeRound(c1, c2, action, action, i);
    }
    expect(lastResult!.battleOver).toBe(false);
    expect(c1.hp).toBe(895);
    expect(c2.hp).toBe(895);
  });

  // Test 5: one-shot kill
  // attacker: lv100, 500 base, neutral, def=0
  // defender: hp=100, def=0
  // damage: 500*6.0=3000 -> overkill
  it('one-shot kill', () => {
    const attacker: BattleCharacter = { name: 'God', level: 100, hp: 9999, maxHp: 9999, element: 'neutral', defense: 0, statuses: [] };
    const defender: BattleCharacter = { name: 'Weakling', level: 1, hp: 100, maxHp: 100, element: 'neutral', defense: 0, statuses: [] };
    const action: BattleAction = { type: 'skill', baseDamage: 500, element: 'neutral', critChance: 0, critSeed: 1 };

    const result = executeRound(attacker, defender, action, action, 1);
    expect(result.battleOver).toBe(true);
    expect(result.winner).toBe('God');
    expect(result.turns.length).toBe(1);
    // damage = 500 * 6.0 = 3000
    expect(result.turns[0].damage).toBe(3000);
  });
});
