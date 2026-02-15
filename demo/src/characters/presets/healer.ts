import { createCharacter } from '../createCharacter.js';
import { CharacterStats } from '../characterTypes.js';

export function createHealer(name: string, level: number = 1): CharacterStats {
  return createCharacter(name, 'healer', level);
}

export const DEFAULT_HEALER = createHealer('DefaultHealer', 1);
