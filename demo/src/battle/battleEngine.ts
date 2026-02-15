import { calculateFinalDamage } from '../core/damage/calculateFinalDamage.js';
import { applyStatusDamage, tickStatus, createActiveStatus, stackStatus } from '../core/status/statusEngine.js';
import { ActiveStatus, StatusEffect } from '../core/status/types.js';
import { ElementType } from '../core/element/types.js';

export interface BattleCharacter {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  element: ElementType;
  defense: number;
  statuses: ActiveStatus[];
}

export interface BattleAction {
  type: 'skill' | 'item';
  baseDamage: number;
  element: ElementType;
  critChance: number;
  critSeed?: number;
  bonusDamagePercent?: number;
  statusEffect?: StatusEffect | null;
}

export interface TurnResult {
  attacker: string;
  defender: string;
  damage: number;
  statusDamage: number;
  appliedStatus: string | null;
  defenderHp: number;
  defenderDown: boolean;
}

export function executeTurn(
  attacker: BattleCharacter,
  defender: BattleCharacter,
  action: BattleAction
): TurnResult {
  // Calculate main damage
  const result = calculateFinalDamage({
    baseDamage: action.baseDamage,
    attackerLevel: attacker.level,
    element: action.element,
    targetElement: defender.element,
    critChance: action.critChance,
    critSeed: action.critSeed,
    targetDefense: defender.defense,
    bonusDamagePercent: action.bonusDamagePercent,
  });

  // Apply status damage from existing statuses
  let statusDamage = 0;
  const newStatuses: ActiveStatus[] = [];
  for (const status of defender.statuses) {
    statusDamage += applyStatusDamage(status, defender.defense);
    const ticked = tickStatus(status);
    if (ticked) newStatuses.push(ticked);
  }

  // Apply new status effect
  let appliedStatus: string | null = null;
  if (action.statusEffect) {
    const existing = newStatuses.find(s => s.effect.type === action.statusEffect!.type);
    if (existing) {
      const idx = newStatuses.indexOf(existing);
      newStatuses[idx] = stackStatus(existing, action.statusEffect);
    } else {
      newStatuses.push(createActiveStatus(action.statusEffect));
    }
    appliedStatus = action.statusEffect.type;
  }

  const totalDamage = result.totalDamage + statusDamage;
  defender.hp = Math.max(0, defender.hp - totalDamage);
  defender.statuses = newStatuses;

  return {
    attacker: attacker.name,
    defender: defender.name,
    damage: result.totalDamage,
    statusDamage,
    appliedStatus,
    defenderHp: defender.hp,
    defenderDown: defender.hp <= 0,
  };
}
