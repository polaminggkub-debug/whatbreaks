import { ElementType } from '../core/element/types.js';

export interface CharacterStats {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  critChance: number;
  element: ElementType;
  xp: number;
}

export type CharacterClass = 'warrior' | 'mage' | 'archer' | 'healer' | 'assassin';

export interface CharacterPreset {
  class: CharacterClass;
  baseStats: Omit<CharacterStats, 'name' | 'level' | 'xp'>;
  growthRates: { hp: number; attack: number; defense: number; speed: number };
}
