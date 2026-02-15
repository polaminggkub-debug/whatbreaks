import { createCharacter } from '../createCharacter.js';
import { CharacterStats } from '../characterTypes.js';

export function createAssassin(name: string, level: number = 1): CharacterStats {
  return createCharacter(name, 'assassin', level);
}

export const DEFAULT_ASSASSIN = createAssassin('DefaultAssassin', 1);
