import { createCharacter } from '../createCharacter.js';
import { CharacterStats } from '../characterTypes.js';

export function createMage(name: string, level: number = 1): CharacterStats {
  return createCharacter(name, 'mage', level);
}

export const DEFAULT_MAGE = createMage('DefaultMage', 1);
