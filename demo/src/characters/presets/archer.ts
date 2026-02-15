import { createCharacter } from '../createCharacter.js';
import { CharacterStats } from '../characterTypes.js';

export function createArcher(name: string, level: number = 1): CharacterStats {
  return createCharacter(name, 'archer', level);
}

export const DEFAULT_ARCHER = createArcher('DefaultArcher', 1);
