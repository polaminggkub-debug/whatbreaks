import { describe, it, expect } from 'vitest';
import { executeRound, calculateTurnDamagePreview } from '../../../src/battle/turnResolver.js';
import { BattleCharacter, BattleAction } from '../../../src/battle/battleEngine.js';

function makeChar(overrides: Partial<BattleCharacter> = {}): BattleCharacter {
  return { name: 'Fighter1', level: 5, hp: 500, maxHp: 500, element: 'neutral', defense: 0, statuses: [], ...overrides };
}

function makeAction(overrides: Partial<BattleAction> = {}): BattleAction {
  return { type: 'skill', baseDamage: 100, element: 'neutral', critChance: 0, critSeed: 1, ...overrides };
}

describe('turnResolver', () => {
  // Test 1: both survive a round
  // Both do 125 damage (100 base, lv5, neutral, def 0)
  it('both survive a round', () => {
    const c1 = makeChar();
    const c2 = makeChar({ name: 'Fighter2' });
    const result = executeRound(c1, c2, makeAction(), makeAction(), 1);
    expect(result.battleOver).toBe(false);
    expect(result.winner).toBeNull();
    expect(result.turns.length).toBe(2);
    expect(c2.hp).toBe(375);
    expect(c1.hp).toBe(375);
  });

  // Test 2: char1 kills char2 on first hit
  it('char1 kills char2 in round', () => {
    const c1 = makeChar();
    const c2 = makeChar({ name: 'Fighter2', hp: 100, maxHp: 100 });
    const result = executeRound(c1, c2, makeAction(), makeAction(), 1);
    expect(result.battleOver).toBe(true);
    expect(result.winner).toBe('Fighter1');
    expect(result.turns.length).toBe(1); // char2 never attacks
  });

  // Test 3: char2 kills char1 on second hit (c1 survives c2's attack? No, c1 attacks first, then c2)
  // c1 does 125 to c2 (c2 survives: 500-125=375)
  // c2 does 400*1.25=500 damage to c1 (c1 has 500hp -> 0)
  it('char2 kills char1 in round', () => {
    const c1 = makeChar();
    const c2 = makeChar({ name: 'Fighter2' });
    const result = executeRound(c1, c2, makeAction(), makeAction({ baseDamage: 400 }), 1);
    expect(result.battleOver).toBe(true);
    expect(result.winner).toBe('Fighter2');
    expect(result.turns.length).toBe(2);
  });

  // Test 4: round number is preserved
  it('round number is preserved', () => {
    const c1 = makeChar();
    const c2 = makeChar({ name: 'Fighter2' });
    const result = executeRound(c1, c2, makeAction(), makeAction(), 7);
    expect(result.round).toBe(7);
  });

  // Test 5: calculateTurnDamagePreview
  // baseDamage=100, lv5, neutral, defense=0, critSeed=1 (always no crit in preview)
  // finalDamage=125, totalDamage=125
  it('calculateTurnDamagePreview = 125', () => {
    const attacker = makeChar();
    const defender = makeChar({ name: 'Defender' });
    const preview = calculateTurnDamagePreview(attacker, defender, makeAction());
    expect(preview).toBe(125);
  });
});
