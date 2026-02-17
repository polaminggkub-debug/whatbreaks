import type { ParsedFile } from '../importParser.js';

export interface LanguageParser {
  extensions: string[];
  parseFile(filePath: string, projectRoot: string): ParsedFile;
}

// Import all parsers
import { typescriptParser } from './typescript.js';
import { pythonParser } from './python.js';
import { goParser } from './go.js';
import { rustParser } from './rust.js';
import { phpParser } from './php.js';
import { rubyParser } from './ruby.js';

const parsers: LanguageParser[] = [
  typescriptParser,
  pythonParser,
  goParser,
  rustParser,
  phpParser,
  rubyParser,
];

// Build extension -> parser map
const extensionMap = new Map<string, LanguageParser>();
for (const parser of parsers) {
  for (const ext of parser.extensions) {
    extensionMap.set(ext, parser);
  }
}

export function getParserForFile(filePath: string): LanguageParser | null {
  const ext = filePath.substring(filePath.lastIndexOf('.'));
  return extensionMap.get(ext) ?? null;
}
