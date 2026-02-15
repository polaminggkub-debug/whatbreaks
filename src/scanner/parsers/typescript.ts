import type { LanguageParser } from './index.js';
import { parseImports } from '../importParser.js';
import { parseVueFile } from '../vueParser.js';

export const typescriptParser: LanguageParser = {
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.vue'],
  parseFile(filePath: string, projectRoot: string) {
    if (filePath.endsWith('.vue')) {
      return parseVueFile(filePath, projectRoot);
    }
    return parseImports(filePath, projectRoot);
  },
};
