import { glob } from 'glob';
import path from 'node:path';
import type { ScanConfig } from '../types/graph.js';

const DEFAULT_EXCLUDES = [
  'node_modules/**',
  'dist/**',
  '.git/**',
  '.whatbreaks/**',
];

const DEFAULT_INCLUDES = ['**/*.ts', '**/*.vue'];

export async function scanFiles(
  dir: string,
  config?: Partial<ScanConfig>,
): Promise<string[]> {
  const includes = config?.include ?? DEFAULT_INCLUDES;
  const excludes = config?.exclude ?? DEFAULT_EXCLUDES;

  const absoluteDir = path.resolve(dir);

  const allFiles: string[] = [];

  for (const pattern of includes) {
    const matched = await glob(pattern, {
      cwd: absoluteDir,
      ignore: excludes,
      nodir: true,
      posix: true,
    });
    allFiles.push(...matched);
  }

  // Deduplicate and sort for deterministic output
  const unique = [...new Set(allFiles)].sort();
  return unique;
}
