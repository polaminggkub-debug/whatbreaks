import { describe, it, expect } from 'vitest';
import { createActiveStatus, tickStatus, stackStatus, applyStatusDamage } from '../../src/core/status/statusEngine.js';
import { StatusEffect, ActiveStatus } from '../../src/core/status/types.js';
import { executeTurn, BattleCharacter, BattleAction } from '../../src/battle/battleEngine.js';

const burnEffect: StatusEffect = { type: 'burn', element: 'fire', damagePerTurn: 10, duration: 3, stackable: true };
const freezeEffect: StatusEffect = { type: 'freeze', element: 'ice', damagePerTurn: 0, duration: 2, stackable: false };
const shockEffect: StatusEffect = { type: 'shock', element: 'lightning', damagePerTurn: 15, duration: 2, stackable: true };

describe('statusStacking integration', () => {
  // INSENSITIVE structural tests
  it('creates and ticks through status lifecycle', () => {
    let status: ActiveStatus | null = createActiveStatus(burnEffect);
    expect(status.remainingTurns).toBe(3);
    status = tickStatus(status!);
    expect(status!.remainingTurns).toBe(2);
    status = tickStatus(status!);
    expect(status!.remainingTurns).toBe(1);
    status = tickStatus(status!);
    expect(status).toBeNull();
  });

  it('stacks burn 3 times', () => {
    let status = createActiveStatus(burnEffect);
    status = stackStatus(status, burnEffect);
    status = stackStatus(status, burnEffect);
    expect(status.stacks).toBe(3);
    expect(status.remainingTurns).toBe(3);
  });

  it('freeze does not stack', () => {
    let status = createActiveStatus(freezeEffect);
    status = stackStatus(status, freezeEffect);
    expect(status.stacks).toBe(1);
  });

  it('mixed status types coexist', () => {
    const statuses: ActiveStatus[] = [
      createActiveStatus(burnEffect),
      createActiveStatus(freezeEffect),
      createActiveStatus(shockEffect),
    ];
    expect(statuses.length).toBe(3);
    expect(statuses[0].effect.type).toBe('burn');
    expect(statuses[1].effect.type).toBe('freeze');
    expect(statuses[2].effect.type).toBe('shock');
  });

  // SENSITIVE damage tests
  // burn 3 stacks, def=0: baseDamage=10*3=30, lv=1, fire vs neutral (1.0)
  // levelBonus=1.05, rawDamage=30*1.05=31.5, finalDamage=32, totalDamage=32
  it('burn 3 stacks does 32 damage', () => {
    const status: ActiveStatus = { effect: burnEffect, remainingTurns: 3, stacks: 3 };
    expect(applyStatusDamage(status, 0)).toBe(32);
  });

  // shock 2 stacks, def=50: baseDamage=15*2=30, lv=1, lightning vs neutral (1.0)
  // rawDamage=30*1.05=31.5, defReduction=100/150=0.6667
  // finalDamage=round(31.5*0.6667)=round(21)=21
  it('shock 2 stacks with def 50 does 21 damage', () => {
    const status: ActiveStatus = { effect: shockEffect, remainingTurns: 2, stacks: 2 };
    expect(applyStatusDamage(status, 50)).toBe(21);
  });

  // Battle turn with existing status damage
  // defender has burn (1 stack), attacker hits for 100 base, lv5, neutral, def=0
  // status damage: burn 10 base, lv1, fire vs neutral, def=0 -> 11
  // main damage: 100*1.25=125
  // total = 125 + 11 = 136. defenderHp = 500 - 136 = 364
  it('battle turn with existing burn status adds 11 damage', () => {
    const attacker: BattleCharacter = { name: 'A', level: 5, hp: 500, maxHp: 500, element: 'neutral', defense: 0, statuses: [] };
    const defender: BattleCharacter = {
      name: 'D', level: 1, hp: 500, maxHp: 500, element: 'neutral', defense: 0,
      statuses: [createActiveStatus(burnEffect)],
    };
    const action: BattleAction = { type: 'skill', baseDamage: 100, element: 'neutral', critChance: 0, critSeed: 1 };
    const result = executeTurn(attacker, defender, action);
    expect(result.damage).toBe(125);
    expect(result.statusDamage).toBe(11);
    expect(result.defenderHp).toBe(364);
  });

  // Battle turn applying new status + existing status damage
  it('applies new burn and ticks existing burn', () => {
    const attacker: BattleCharacter = { name: 'A', level: 5, hp: 500, maxHp: 500, element: 'neutral', defense: 0, statuses: [] };
    const defender: BattleCharacter = {
      name: 'D', level: 1, hp: 500, maxHp: 500, element: 'neutral', defense: 0,
      statuses: [createActiveStatus(burnEffect)],
    };
    const action: BattleAction = {
      type: 'skill', baseDamage: 50, element: 'neutral', critChance: 0, critSeed: 1,
      statusEffect: burnEffect,
    };
    const result = executeTurn(attacker, defender, action);
    // main damage: 50*1.25=62.5, final=63
    expect(result.damage).toBe(63);
    // status damage: 11 from existing burn
    expect(result.statusDamage).toBe(11);
    expect(result.appliedStatus).toBe('burn');
    // existing burn ticked (remainingTurns 3->2), then stacked (stacks 1->2, remainingTurns=max(2,3)=3)
    expect(defender.statuses.length).toBe(1);
    expect(defender.statuses[0].stacks).toBe(2);
  });
});
