import { describe, it, expect } from 'vitest';
import { createActiveStatus, tickStatus, stackStatus, applyStatusDamage } from '../../../src/core/status/statusEngine.js';
import { StatusEffect, ActiveStatus } from '../../../src/core/status/types.js';

describe('statusEngine', () => {
  const burnEffect: StatusEffect = { type: 'burn', element: 'fire', damagePerTurn: 10, duration: 3, stackable: true };
  const freezeEffect: StatusEffect = { type: 'freeze', element: 'ice', damagePerTurn: 0, duration: 2, stackable: false };

  // INSENSITIVE tests
  it('createActiveStatus creates correct object', () => {
    const status = createActiveStatus(burnEffect);
    expect(status.effect).toBe(burnEffect);
    expect(status.remainingTurns).toBe(3);
    expect(status.stacks).toBe(1);
  });

  it('tickStatus reduces remaining turns', () => {
    const status = createActiveStatus(burnEffect);
    const ticked = tickStatus(status);
    expect(ticked).not.toBeNull();
    expect(ticked!.remainingTurns).toBe(2);
  });

  it('tickStatus returns null when expired', () => {
    const status: ActiveStatus = { effect: burnEffect, remainingTurns: 1, stacks: 1 };
    const ticked = tickStatus(status);
    expect(ticked).toBeNull();
  });

  it('stackStatus increases stacks when stackable', () => {
    const status = createActiveStatus(burnEffect);
    const stacked = stackStatus(status, burnEffect);
    expect(stacked.stacks).toBe(2);
  });

  it('stackStatus does not increase stacks when not stackable', () => {
    const status = createActiveStatus(freezeEffect);
    const stacked = stackStatus(status, freezeEffect);
    expect(stacked.stacks).toBe(1);
  });

  it('stackStatus takes max remainingTurns', () => {
    const status: ActiveStatus = { effect: burnEffect, remainingTurns: 1, stacks: 1 };
    const stacked = stackStatus(status, burnEffect);
    expect(stacked.remainingTurns).toBe(3);
  });

  // SENSITIVE tests - applyStatusDamage calls calculateFinalDamage
  // burn: damagePerTurn=10, stacks=1 -> baseDamage=10, level=1, fire vs neutral (1.0), critSeed=1, defense=0
  // levelBonus=1.05, rawDamage=10*1.05=10.5, finalDamage=round(10.5)=11, totalDamage=11
  it('applyStatusDamage burn 1 stack defense 0 = 11', () => {
    const status = createActiveStatus(burnEffect);
    const dmg = applyStatusDamage(status, 0);
    expect(dmg).toBe(11);
  });

  // burn: stacks=2 -> baseDamage=20, level=1, fire vs neutral (1.0)
  // rawDamage=20*1.05=21, finalDamage=21, totalDamage=21
  it('applyStatusDamage burn 2 stacks defense 0 = 21', () => {
    const status: ActiveStatus = { effect: burnEffect, remainingTurns: 3, stacks: 2 };
    const dmg = applyStatusDamage(status, 0);
    expect(dmg).toBe(21);
  });

  // burn: stacks=1, defense=100 -> baseDamage=10, defReduction=0.5
  // rawDamage=10.5, finalDamage=round(10.5*0.5)=round(5.25)=5, totalDamage=5
  it('applyStatusDamage burn 1 stack defense 100 = 5', () => {
    const status = createActiveStatus(burnEffect);
    const dmg = applyStatusDamage(status, 100);
    expect(dmg).toBe(5);
  });

  // freeze: damagePerTurn=0 -> returns 0
  it('applyStatusDamage freeze (no damage) = 0', () => {
    const status = createActiveStatus(freezeEffect);
    const dmg = applyStatusDamage(status, 0);
    expect(dmg).toBe(0);
  });
});
