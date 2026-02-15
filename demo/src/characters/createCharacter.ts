import { CharacterStats, CharacterClass, CharacterPreset } from './characterTypes.js';
import { applyXp, getXpToNextLevel } from '../core/xp/xpEngine.js';

const PRESETS: Record<CharacterClass, CharacterPreset> = {
  warrior: {
    class: 'warrior',
    baseStats: { hp: 200, maxHp: 200, attack: 25, defense: 30, speed: 10, critChance: 0.10, element: 'earth' },
    growthRates: { hp: 20, attack: 3, defense: 4, speed: 1 },
  },
  mage: {
    class: 'mage',
    baseStats: { hp: 120, maxHp: 120, attack: 40, defense: 10, speed: 15, critChance: 0.15, element: 'fire' },
    growthRates: { hp: 10, attack: 5, defense: 1, speed: 2 },
  },
  archer: {
    class: 'archer',
    baseStats: { hp: 150, maxHp: 150, attack: 35, defense: 15, speed: 25, critChance: 0.25, element: 'wind' },
    growthRates: { hp: 12, attack: 4, defense: 2, speed: 3 },
  },
  healer: {
    class: 'healer',
    baseStats: { hp: 130, maxHp: 130, attack: 15, defense: 20, speed: 12, critChance: 0.05, element: 'ice' },
    growthRates: { hp: 15, attack: 2, defense: 3, speed: 1 },
  },
  assassin: {
    class: 'assassin',
    baseStats: { hp: 110, maxHp: 110, attack: 45, defense: 8, speed: 30, critChance: 0.35, element: 'lightning' },
    growthRates: { hp: 8, attack: 5, defense: 1, speed: 4 },
  },
};

export function createCharacter(name: string, charClass: CharacterClass, level: number = 1): CharacterStats {
  const preset = PRESETS[charClass];
  const stats = { ...preset.baseStats };

  // Apply level growth
  for (let i = 1; i < level; i++) {
    stats.hp += preset.growthRates.hp;
    stats.maxHp += preset.growthRates.hp;
    stats.attack += preset.growthRates.attack;
    stats.defense += preset.growthRates.defense;
    stats.speed += preset.growthRates.speed;
  }

  return { ...stats, name, level, xp: 0 };
}

export function getPreset(charClass: CharacterClass): CharacterPreset {
  return PRESETS[charClass];
}
