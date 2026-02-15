import { describe, it, expect } from 'vitest';
import { executeRound } from '../../src/battle/turnResolver.js';
import { BattleCharacter, BattleAction } from '../../src/battle/battleEngine.js';
import { createCharacter } from '../../src/characters/createCharacter.js';

function toBattleChar(stats: ReturnType<typeof createCharacter>): BattleCharacter {
  return { name: stats.name, level: stats.level, hp: stats.hp, maxHp: stats.maxHp, element: stats.element, defense: stats.defense, statuses: [] };
}

describe('bossFight e2e', () => {
  // Test 1: warrior vs fire boss
  // warrior lv10: hp=200+9*20=380, def=30+9*4=66, element=earth
  // boss: lv15, hp=2000, def=100, element=fire
  // warrior attacks: 80 base, earth vs fire (2.0), lv10
  //   levelBonus=1.5, raw=80*1.5*2.0=240, defReduction=100/200=0.5
  //   finalDamage=round(240*0.5)=120
  // boss attacks: 60 base, fire vs earth (0.5), lv15
  //   levelBonus=1.75, raw=60*1.75*0.5=52.5, defReduction=100/166=0.6024
  //   finalDamage=round(52.5*0.6024)=round(31.63)=32
  //
  // boss dies when: 2000 / 120 = 16.67 rounds -> 17 rounds
  // warrior takes: 32 * 17 = 544 damage > 380 hp -> warrior dies first
  // warrior dies after: 380 / 32 = 11.875 rounds -> 12 rounds
  // But warrior attacks first each round. After 11 rounds: boss hp=2000-11*120=680, warrior hp=380-11*32=28
  // Round 12: warrior hits boss -> 680-120=560, boss hits warrior -> 28-32 -> dies
  it('warrior dies to fire boss after 12 rounds', () => {
    const warrior = toBattleChar(createCharacter('Warrior', 'warrior', 10));
    const boss: BattleCharacter = { name: 'FireBoss', level: 15, hp: 2000, maxHp: 2000, element: 'fire', defense: 100, statuses: [] };
    const wAction: BattleAction = { type: 'skill', baseDamage: 80, element: 'earth', critChance: 0, critSeed: 1 };
    const bAction: BattleAction = { type: 'skill', baseDamage: 60, element: 'fire', critChance: 0, critSeed: 1 };

    let roundCount = 0;
    let result;
    for (let i = 1; i <= 30; i++) {
      result = executeRound(warrior, boss, wAction, bAction, i);
      roundCount = i;
      if (result.battleOver) break;
    }
    expect(result!.battleOver).toBe(true);
    expect(result!.winner).toBe('FireBoss');
    expect(roundCount).toBe(12);
  });

  // Test 2: mage vs ice boss (mage fire vs ice = 2.0)
  // mage lv10: hp=120+9*10=210, def=10+9*1=19, element=fire
  // boss: lv10, hp=1500, def=80, element=ice
  // mage attacks: 100 base, fire vs ice (2.0), lv10
  //   levelBonus=1.5, raw=100*1.5*2.0=300, defReduction=100/180=0.5556
  //   finalDamage=round(300*0.5556)=round(166.67)=167
  // boss attacks: 70 base, ice vs fire (0.5), lv10
  //   levelBonus=1.5, raw=70*1.5*0.5=52.5, defReduction=100/119=0.8403
  //   finalDamage=round(52.5*0.8403)=round(44.12)=44
  //
  // boss dies after: 1500/167 = 8.98 -> 9 rounds
  // mage takes: 44*9 = 396 > 210 -> mage dies first at round 210/44=4.77 -> round 5
  // Round 4: boss hp=1500-4*167=832, mage hp=210-4*44=34
  // Round 5: mage hits -> 832-167=665. boss hits -> 34-44 -> mage dies
  it('mage dies to ice boss at round 5', () => {
    const mage = toBattleChar(createCharacter('Mage', 'mage', 10));
    const boss: BattleCharacter = { name: 'IceBoss', level: 10, hp: 1500, maxHp: 1500, element: 'ice', defense: 80, statuses: [] };
    const mAction: BattleAction = { type: 'skill', baseDamage: 100, element: 'fire', critChance: 0, critSeed: 1 };
    const bAction: BattleAction = { type: 'skill', baseDamage: 70, element: 'ice', critChance: 0, critSeed: 1 };

    let roundCount = 0;
    let result;
    for (let i = 1; i <= 30; i++) {
      result = executeRound(mage, boss, mAction, bAction, i);
      roundCount = i;
      if (result.battleOver) break;
    }
    expect(result!.battleOver).toBe(true);
    expect(result!.winner).toBe('IceBoss');
    expect(roundCount).toBe(5);
  });

  // Test 3: strong warrior kills weak boss
  // warrior lv20: hp=200+19*20=580, def=30+19*4=106, element=earth
  // boss: lv5, hp=500, def=30, element=fire
  // warrior attacks: 100 base, earth vs fire (2.0), lv20
  //   levelBonus=2.0, raw=100*2.0*2.0=400, defReduction=100/130=0.7692
  //   finalDamage=round(400*0.7692)=round(307.69)=308
  // boss attacks: 50 base, fire vs earth (0.5), lv5
  //   levelBonus=1.25, raw=50*1.25*0.5=31.25, defReduction=100/206=0.4854
  //   finalDamage=round(31.25*0.4854)=round(15.17)=15
  //
  // boss dies after: 500/308 = 1.62 -> 2 rounds
  // R1: boss hp=500-308=192, warrior hp=580-15=565
  // R2: boss hp=192-308 -> dies
  it('strong warrior kills weak boss in 2 rounds', () => {
    const warrior = toBattleChar(createCharacter('Warrior', 'warrior', 20));
    const boss: BattleCharacter = { name: 'WeakBoss', level: 5, hp: 500, maxHp: 500, element: 'fire', defense: 30, statuses: [] };
    const wAction: BattleAction = { type: 'skill', baseDamage: 100, element: 'earth', critChance: 0, critSeed: 1 };
    const bAction: BattleAction = { type: 'skill', baseDamage: 50, element: 'fire', critChance: 0, critSeed: 1 };

    let roundCount = 0;
    let result;
    for (let i = 1; i <= 30; i++) {
      result = executeRound(warrior, boss, wAction, bAction, i);
      roundCount = i;
      if (result.battleOver) break;
    }
    expect(result!.battleOver).toBe(true);
    expect(result!.winner).toBe('Warrior');
    expect(roundCount).toBe(2);
  });
});
