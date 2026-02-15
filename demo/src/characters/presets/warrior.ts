import { createCharacter } from '../createCharacter.js';
import { CharacterStats } from '../characterTypes.js';

export function createWarrior(name: string, level: number = 1): CharacterStats {
  return createCharacter(name, 'warrior', level);
}

export const DEFAULT_WARRIOR = createWarrior('DefaultWarrior', 1);
