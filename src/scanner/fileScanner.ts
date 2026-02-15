import fs from 'node:fs';
import path from 'node:path';
import type { ScanConfig } from '../types/graph.js';

const DEFAULT_EXCLUDE_DIRS = new Set([
  'node_modules', 'dist', '.git', '.whatbreaks', '.nuxt', '.output', 'coverage',
]);

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.vue']);

export async function scanFiles(
  dir: string,
  config?: Partial<ScanConfig>,
): Promise<string[]> {
  const absoluteDir = path.resolve(dir);
  const files: string[] = [];

  function walk(currentDir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || DEFAULT_EXCLUDE_DIRS.has(entry.name)) {
          continue;
        }
        walk(path.join(currentDir, entry.name));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (SUPPORTED_EXTENSIONS.has(ext)) {
          const rel = path.relative(absoluteDir, path.join(currentDir, entry.name));
          files.push(rel.split(path.sep).join('/'));
        }
      }
    }
  }

  walk(absoluteDir);
  files.sort();
  return files;
}
