import { BattleCharacter, BattleAction, TurnResult, executeTurn } from './battleEngine.js';
import { calculateFinalDamage } from '../core/damage/calculateFinalDamage.js';

export interface RoundResult {
  round: number;
  turns: TurnResult[];
  battleOver: boolean;
  winner: string | null;
}

export function executeRound(
  char1: BattleCharacter,
  char2: BattleCharacter,
  action1: BattleAction,
  action2: BattleAction,
  roundNumber: number
): RoundResult {
  const turns: TurnResult[] = [];

  // Char1 attacks first
  const turn1 = executeTurn(char1, char2, action1);
  turns.push(turn1);

  if (turn1.defenderDown) {
    return { round: roundNumber, turns, battleOver: true, winner: char1.name };
  }

  // Char2 attacks
  const turn2 = executeTurn(char2, char1, action2);
  turns.push(turn2);

  if (turn2.defenderDown) {
    return { round: roundNumber, turns, battleOver: true, winner: char2.name };
  }

  return { round: roundNumber, turns, battleOver: false, winner: null };
}

export function calculateTurnDamagePreview(
  attacker: BattleCharacter,
  defender: BattleCharacter,
  action: BattleAction
): number {
  const result = calculateFinalDamage({
    baseDamage: action.baseDamage,
    attackerLevel: attacker.level,
    element: action.element,
    targetElement: defender.element,
    critChance: action.critChance,
    critSeed: 1, // no crit for preview
    targetDefense: defender.defense,
    bonusDamagePercent: action.bonusDamagePercent,
  });
  return result.totalDamage;
}
