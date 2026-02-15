import { describe, it, expect } from 'vitest';
import { executeTurn, BattleCharacter, BattleAction } from '../../src/battle/battleEngine.js';
import { createCharacter } from '../../src/characters/createCharacter.js';

function toBattleChar(stats: ReturnType<typeof createCharacter>): BattleCharacter {
  return { name: stats.name, level: stats.level, hp: stats.hp, maxHp: stats.maxHp, element: stats.element, defense: stats.defense, statuses: [] };
}

describe('partyBattle e2e', () => {
  // Test 1: 2v2 battle, each character attacks once per round
  // warrior(earth) lv5 + mage(fire) lv5 vs 2 enemies (ice, neutral)
  // warrior lv5: def=46, hp=280
  // mage lv5: def=14, hp=160
  // enemy1 ice: lv5, hp=300, def=20
  // enemy2 neutral: lv5, hp=300, def=30
  //
  // Round 1:
  // warrior attacks enemy1 (ice): 80 base, earth vs ice (0.5), def=20
  //   raw=80*1.25*0.5=50, defReduction=100/120=0.8333, final=round(50*0.8333)=round(41.67)=42
  //   enemy1 hp=300-42=258
  // mage attacks enemy1 (ice): 60 base, fire vs ice (2.0), def=20
  //   raw=60*1.25*2.0=150, defReduction=100/120=0.8333, final=round(150*0.8333)=round(125)=125
  //   enemy1 hp=258-125=133
  // enemy1 attacks warrior: 40 base, ice vs earth (2.0), def=46
  //   raw=40*1.25*2.0=100, defReduction=100/146=0.6849, final=round(100*0.6849)=round(68.49)=68
  //   warrior hp=280-68=212
  // enemy2 attacks mage: 50 base, neutral vs fire (1.0), def=14
  //   raw=50*1.25*1.0=62.5, defReduction=100/114=0.8772, final=round(62.5*0.8772)=round(54.82)=55
  //   mage hp=160-55=105
  it('round 1 of 2v2: correct hp values', () => {
    const warrior = toBattleChar(createCharacter('Warrior', 'warrior', 5));
    const mage = toBattleChar(createCharacter('Mage', 'mage', 5));
    const enemy1: BattleCharacter = { name: 'IceFiend', level: 5, hp: 300, maxHp: 300, element: 'ice', defense: 20, statuses: [] };
    const enemy2: BattleCharacter = { name: 'Grunt', level: 5, hp: 300, maxHp: 300, element: 'neutral', defense: 30, statuses: [] };

    // warrior attacks enemy1
    executeTurn(warrior, enemy1, { type: 'skill', baseDamage: 80, element: 'earth', critChance: 0, critSeed: 1 });
    expect(enemy1.hp).toBe(258);

    // mage attacks enemy1
    executeTurn(mage, enemy1, { type: 'skill', baseDamage: 60, element: 'fire', critChance: 0, critSeed: 1 });
    expect(enemy1.hp).toBe(133);

    // enemy1 attacks warrior
    executeTurn(enemy1, warrior, { type: 'skill', baseDamage: 40, element: 'ice', critChance: 0, critSeed: 1 });
    expect(warrior.hp).toBe(212);

    // enemy2 attacks mage
    executeTurn(enemy2, mage, { type: 'skill', baseDamage: 50, element: 'neutral', critChance: 0, critSeed: 1 });
    expect(mage.hp).toBe(105);
  });

  // Test 2: party kills all enemies
  // 2 attackers vs 1 weak enemy, each does 125 damage, enemy has 200 hp
  it('two attackers kill one enemy in 1 round', () => {
    const a1: BattleCharacter = { name: 'A1', level: 5, hp: 500, maxHp: 500, element: 'neutral', defense: 0, statuses: [] };
    const a2: BattleCharacter = { name: 'A2', level: 5, hp: 500, maxHp: 500, element: 'neutral', defense: 0, statuses: [] };
    const enemy: BattleCharacter = { name: 'Enemy', level: 1, hp: 200, maxHp: 200, element: 'neutral', defense: 0, statuses: [] };
    const action: BattleAction = { type: 'skill', baseDamage: 100, element: 'neutral', critChance: 0, critSeed: 1 };

    const r1 = executeTurn(a1, enemy, action);
    expect(r1.damage).toBe(125);
    expect(enemy.hp).toBe(75);

    const r2 = executeTurn(a2, enemy, action);
    expect(r2.damage).toBe(125);
    expect(enemy.hp).toBe(0);
    expect(r2.defenderDown).toBe(true);
  });

  // Test 3: party of 3 vs 2 enemies, track total turns to win
  // 3 attackers (lv5, neutral, 80 base) vs 2 enemies (hp=300 each, def=0)
  // each attacker does 80*1.25=100 per turn
  // Round: a1->e1, a2->e1, a3->e2 (if e1 dead, attack e2)
  it('party of 3 clears 2 enemies', () => {
    const party = [
      { name: 'P1', level: 5, hp: 500, maxHp: 500, element: 'neutral' as const, defense: 0, statuses: [] },
      { name: 'P2', level: 5, hp: 500, maxHp: 500, element: 'neutral' as const, defense: 0, statuses: [] },
      { name: 'P3', level: 5, hp: 500, maxHp: 500, element: 'neutral' as const, defense: 0, statuses: [] },
    ];
    const enemies = [
      { name: 'E1', level: 5, hp: 300, maxHp: 300, element: 'neutral' as const, defense: 0, statuses: [] },
      { name: 'E2', level: 5, hp: 300, maxHp: 300, element: 'neutral' as const, defense: 0, statuses: [] },
    ];
    const action: BattleAction = { type: 'skill', baseDamage: 80, element: 'neutral', critChance: 0, critSeed: 1 };

    let turnCount = 0;
    // each does 80*1.25=100 damage per attack
    while (enemies.some(e => e.hp > 0)) {
      for (const member of party) {
        const target = enemies.find(e => e.hp > 0);
        if (!target) break;
        executeTurn(member, target, action);
        turnCount++;
        if (!enemies.some(e => e.hp > 0)) break;
      }
    }
    // E1: 300hp, needs 3 hits (100*3=300), E2: 300hp, needs 3 hits
    // Turn sequence: P1->E1(200), P2->E1(100), P3->E1(0), P1->E2(200), P2->E2(100), P3->E2(0)
    expect(turnCount).toBe(6);
    expect(enemies[0].hp).toBe(0);
    expect(enemies[1].hp).toBe(0);
  });

  // Test 4: party wipe - all party members die
  // 1 attacker (hp=100) vs 1 strong enemy (lv20, 200 base)
  // enemy does: 200*2.0=400. Overkill.
  it('party wipe: enemy one-shots party member', () => {
    const player: BattleCharacter = { name: 'P1', level: 1, hp: 100, maxHp: 100, element: 'neutral', defense: 0, statuses: [] };
    const enemy: BattleCharacter = { name: 'Boss', level: 20, hp: 5000, maxHp: 5000, element: 'neutral', defense: 0, statuses: [] };

    // player attacks boss: 50*1.05=52.5, final=53
    const pAction: BattleAction = { type: 'skill', baseDamage: 50, element: 'neutral', critChance: 0, critSeed: 1 };
    const r1 = executeTurn(player, enemy, pAction);
    expect(r1.damage).toBe(53);

    // boss attacks player: 200*2.0=400, player has 100 hp -> dies
    const bAction: BattleAction = { type: 'skill', baseDamage: 200, element: 'neutral', critChance: 0, critSeed: 1 };
    const r2 = executeTurn(enemy, player, bAction);
    expect(r2.defenderDown).toBe(true);
    expect(player.hp).toBe(0);
    // boss damage: 200 * (1+20*0.05) = 200*2.0 = 400
    expect(r2.damage).toBe(400);
  });
});
