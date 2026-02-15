// L5: Secondary - XP calculation depends on battle results
import { XP_PER_LEVEL, MAX_LEVEL } from '../config/globalCombatConfig.js';
import { calculateFinalDamage } from '../damage/calculateFinalDamage.js';

export interface XpGain {
  baseXp: number;
  bonusXp: number;
  totalXp: number;
}

export interface LevelUpResult {
  previousLevel: number;
  newLevel: number;
  currentXp: number;
  xpToNext: number;
  didLevelUp: boolean;
}

export function calculateBattleXp(damageDealt: number, enemyLevel: number, playerLevel: number): XpGain {
  const baseXp = Math.round(damageDealt * 0.1 + enemyLevel * 10);
  const levelDiff = enemyLevel - playerLevel;
  const bonusMultiplier = levelDiff > 0 ? 1 + levelDiff * 0.1 : Math.max(0.1, 1 + levelDiff * 0.05);
  const bonusXp = Math.round(baseXp * (bonusMultiplier - 1));

  return { baseXp, bonusXp, totalXp: baseXp + bonusXp };
}

export function getXpToNextLevel(level: number): number {
  return Math.round(XP_PER_LEVEL * Math.pow(1.15, level - 1));
}

export function applyXp(currentLevel: number, currentXp: number, xpGained: number): LevelUpResult {
  if (currentLevel >= MAX_LEVEL) {
    return { previousLevel: currentLevel, newLevel: currentLevel, currentXp, xpToNext: 0, didLevelUp: false };
  }

  let level = currentLevel;
  let xp = currentXp + xpGained;
  let xpNeeded = getXpToNextLevel(level);

  while (xp >= xpNeeded && level < MAX_LEVEL) {
    xp -= xpNeeded;
    level++;
    xpNeeded = getXpToNextLevel(level);
  }

  return {
    previousLevel: currentLevel,
    newLevel: level,
    currentXp: xp,
    xpToNext: xpNeeded - xp,
    didLevelUp: level > currentLevel,
  };
}

export function calculateDamageBasedXp(
  baseDamage: number,
  attackerLevel: number,
  targetDefense: number
): number {
  const result = calculateFinalDamage({
    baseDamage,
    attackerLevel,
    element: 'neutral',
    targetElement: 'neutral',
    critChance: 0,
    critSeed: 1,
    targetDefense,
  });
  return Math.round(result.totalDamage * 0.15);
}
