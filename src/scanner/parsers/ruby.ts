import path from 'node:path';
import fs from 'node:fs';
import type { ParsedFile } from '../importParser.js';
import type { LanguageParser } from './index.js';

/**
 * Resolve a `require_relative` path from the current file's directory.
 * Adds .rb extension if not already present.
 */
function resolveRequireRelative(
  requirePath: string,
  currentFileDir: string,
  projectRoot: string,
): string | null {
  const withExt = requirePath.endsWith('.rb')
    ? requirePath
    : requirePath + '.rb';

  const absolutePath = path.resolve(currentFileDir, withExt);

  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
    return path.relative(projectRoot, absolutePath).split(path.sep).join('/');
  }

  return null;
}

/**
 * Resolve a `require` path by searching common project directories.
 * Tries: project root, lib/, app/, and their subdirectories.
 */
function resolveRequire(
  requirePath: string,
  projectRoot: string,
): string | null {
  const withExt = requirePath.endsWith('.rb')
    ? requirePath
    : requirePath + '.rb';

  const searchBases = [
    projectRoot,
    path.join(projectRoot, 'lib'),
    path.join(projectRoot, 'app'),
  ];

  for (const base of searchBases) {
    const candidate = path.join(base, withExt);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path
        .relative(projectRoot, candidate)
        .split(path.sep)
        .join('/');
    }
  }

  return null;
}

/**
 * Extract top-level and module-level declarations as exports.
 */
function extractExports(content: string): string[] {
  const exports: string[] = [];
  const seen = new Set<string>();

  function add(name: string): void {
    if (!seen.has(name)) {
      seen.add(name);
      exports.push(name);
    }
  }

  let match: RegExpExecArray | null;

  // class ClassName
  const classRegex = /^\s*class\s+([A-Z]\w*)/gm;
  while ((match = classRegex.exec(content)) !== null) {
    add(match[1]);
  }

  // module ModuleName
  const moduleRegex = /^\s*module\s+([A-Z]\w*)/gm;
  while ((match = moduleRegex.exec(content)) !== null) {
    add(match[1]);
  }

  // def method_name (top-level and module-level, not deeply nested)
  // Match lines where def is at most 2 levels of indentation (4 spaces or 1 tab)
  const defRegex = /^(?:\s{0,4}|\t{0,1})def\s+(?:self\.)?(\w+[?!=]?)/gm;
  while ((match = defRegex.exec(content)) !== null) {
    add(match[1]);
  }

  // CONSTANT_NAME = value (all-caps with underscores)
  const constRegex = /^\s*([A-Z][A-Z0-9_]+)\s*=/gm;
  while ((match = constRegex.exec(content)) !== null) {
    add(match[1]);
  }

  return exports;
}

export const rubyParser: LanguageParser = {
  extensions: ['.rb'],

  parseFile(filePath: string, projectRoot: string): ParsedFile {
    const absolutePath = path.resolve(projectRoot, filePath);
    const currentFileDir = path.dirname(absolutePath);
    const content = fs.readFileSync(absolutePath, 'utf-8');

    const imports: string[] = [];
    const seen = new Set<string>();

    function addImport(resolved: string | null): void {
      if (resolved && !seen.has(resolved)) {
        seen.add(resolved);
        imports.push(resolved);
      }
    }

    let match: RegExpExecArray | null;

    // Pattern 1: `require_relative 'path'` or `require_relative "path"`
    const requireRelativeRegex =
      /\brequire_relative\s+['"]([^'"]+)['"]/gm;
    while ((match = requireRelativeRegex.exec(content)) !== null) {
      const requirePath = match[1];
      addImport(
        resolveRequireRelative(requirePath, currentFileDir, projectRoot),
      );
    }

    // Pattern 2: `require 'path'` or `require "path"`
    const requireRegex = /\brequire\s+['"]([^'"]+)['"]/gm;
    while ((match = requireRegex.exec(content)) !== null) {
      const requirePath = match[1];
      // Skip gem requires — only resolve project-local files
      addImport(resolveRequire(requirePath, projectRoot));
    }

    // Pattern 3: `load 'path.rb'` or `load "path.rb"`
    const loadRegex = /\bload\s+['"]([^'"]+)['"]/gm;
    while ((match = loadRegex.exec(content)) !== null) {
      const loadPath = match[1];
      // load behaves like require but typically includes the extension
      addImport(resolveRequire(loadPath, projectRoot));
    }

    const exports = extractExports(content);

    return {
      filePath: filePath.split(path.sep).join('/'),
      imports,
      exports,
    };
  },
};
