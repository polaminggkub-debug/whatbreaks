import path from 'node:path';
import fs from 'node:fs';
import type { ParsedFile } from '../importParser.js';
import type { LanguageParser } from './index.js';

interface Psr4Mapping {
  prefix: string;
  directory: string;
}

/**
 * Read PSR-4 autoload mappings from composer.json.
 * Falls back to Laravel convention (App\ -> app/) if no composer.json found.
 */
function loadPsr4Mappings(projectRoot: string): Psr4Mapping[] {
  const composerPath = path.join(projectRoot, 'composer.json');

  if (fs.existsSync(composerPath)) {
    try {
      const composerJson = JSON.parse(fs.readFileSync(composerPath, 'utf-8'));
      const psr4 = composerJson?.autoload?.['psr-4'];

      if (psr4 && typeof psr4 === 'object') {
        const mappings: Psr4Mapping[] = [];
        for (const [prefix, dir] of Object.entries(psr4)) {
          const directory = typeof dir === 'string'
            ? dir.replace(/\/$/, '')
            : Array.isArray(dir) && dir.length > 0
              ? (dir[0] as string).replace(/\/$/, '')
              : null;
          if (directory) {
            mappings.push({ prefix: prefix.replace(/\\$/, ''), directory });
          }
        }
        return mappings;
      }
    } catch {
      // Invalid composer.json, fall through to default
    }
  }

  // Default Laravel convention
  return [{ prefix: 'App', directory: 'app' }];
}

/**
 * Resolve a PHP namespace use statement to a file path using PSR-4 mappings.
 */
function resolveNamespacePath(
  namespace: string,
  mappings: Psr4Mapping[],
  projectRoot: string,
): string | null {
  // Sort mappings by prefix length (longest first) for best match
  const sorted = [...mappings].sort(
    (a, b) => b.prefix.length - a.prefix.length,
  );

  for (const mapping of sorted) {
    const nsPrefix = mapping.prefix.replace(/\\/g, '\\');
    const nsCheck = namespace.replace(/\\/g, '\\');

    if (nsCheck === nsPrefix || nsCheck.startsWith(nsPrefix + '\\')) {
      const relative = nsCheck.substring(nsPrefix.length).replace(/\\/g, '/');
      const filePath = path.join(
        projectRoot,
        mapping.directory,
        relative + '.php',
      );

      if (fs.existsSync(filePath)) {
        return path.relative(projectRoot, filePath).split(path.sep).join('/');
      }
    }
  }

  return null;
}

/**
 * Resolve a require/include path relative to the current file.
 */
function resolveIncludePath(
  includePath: string,
  currentFileDir: string,
  projectRoot: string,
): string | null {
  // Handle __DIR__ constant
  const cleaned = includePath
    .replace(/__DIR__\s*\.\s*['"]/, '')
    .replace(/^['"]/, '')
    .replace(/['"]$/, '');

  const candidates = [
    path.resolve(currentFileDir, cleaned),
    path.resolve(projectRoot, cleaned),
  ];

  // Also try with .php extension if not present
  if (!cleaned.endsWith('.php')) {
    candidates.push(path.resolve(currentFileDir, cleaned + '.php'));
    candidates.push(path.resolve(projectRoot, cleaned + '.php'));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const rel = path.relative(projectRoot, candidate);
      // Skip vendor/ packages
      if (rel.startsWith('vendor' + path.sep) || rel.startsWith('vendor/')) {
        continue;
      }
      return rel.split(path.sep).join('/');
    }
  }

  return null;
}

/**
 * Extract class, function, trait, and interface declarations as exports.
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

  // class ClassName (including abstract class)
  const classRegex = /(?:abstract\s+)?class\s+(\w+)/gm;
  while ((match = classRegex.exec(content)) !== null) {
    add(match[1]);
  }

  // function functionName(
  const fnRegex = /\bfunction\s+(\w+)\s*\(/gm;
  while ((match = fnRegex.exec(content)) !== null) {
    add(match[1]);
  }

  // trait TraitName
  const traitRegex = /\btrait\s+(\w+)/gm;
  while ((match = traitRegex.exec(content)) !== null) {
    add(match[1]);
  }

  // interface InterfaceName
  const ifaceRegex = /\binterface\s+(\w+)/gm;
  while ((match = ifaceRegex.exec(content)) !== null) {
    add(match[1]);
  }

  return exports;
}

export const phpParser: LanguageParser = {
  extensions: ['.php'],

  parseFile(filePath: string, projectRoot: string): ParsedFile {
    const absolutePath = path.resolve(projectRoot, filePath);
    const currentFileDir = path.dirname(absolutePath);
    const content = fs.readFileSync(absolutePath, 'utf-8');

    const imports: string[] = [];
    const seen = new Set<string>();
    const psr4Mappings = loadPsr4Mappings(projectRoot);

    function addImport(resolved: string | null): void {
      if (resolved && !seen.has(resolved)) {
        seen.add(resolved);
        imports.push(resolved);
      }
    }

    // Pattern 1: `use Namespace\Class;`
    const useRegex = /^\s*use\s+([A-Z][\w\\]+)\s*;/gm;
    let match: RegExpExecArray | null;
    while ((match = useRegex.exec(content)) !== null) {
      const namespace = match[1];
      addImport(resolveNamespacePath(namespace, psr4Mappings, projectRoot));
    }

    // Pattern 2: Grouped use `use Namespace\{Class1, Class2};`
    const groupUseRegex = /^\s*use\s+([A-Z][\w\\]+)\\\{([^}]+)\}\s*;/gm;
    while ((match = groupUseRegex.exec(content)) !== null) {
      const baseNamespace = match[1];
      const items = match[2].split(',').map((s) => s.trim());
      for (const item of items) {
        if (item) {
          const fullNamespace = baseNamespace + '\\' + item;
          addImport(
            resolveNamespacePath(fullNamespace, psr4Mappings, projectRoot),
          );
        }
      }
    }

    // Pattern 3: require/require_once/include/include_once
    const includeRegex =
      /\b(?:require|require_once|include|include_once)\s*\(?\s*['"]([^'"]+)['"]\s*\)?/gm;
    while ((match = includeRegex.exec(content)) !== null) {
      const includePath = match[1];
      addImport(resolveIncludePath(includePath, currentFileDir, projectRoot));
    }

    // Pattern 4: require/include with __DIR__ concatenation
    const dirIncludeRegex =
      /\b(?:require|require_once|include|include_once)\s*\(?\s*__DIR__\s*\.\s*['"]([^'"]+)['"]\s*\)?/gm;
    while ((match = dirIncludeRegex.exec(content)) !== null) {
      const relativePath = match[1].replace(/^\//, '');
      const resolved = path.resolve(currentFileDir, relativePath);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        const rel = path.relative(projectRoot, resolved);
        if (!rel.startsWith('vendor' + path.sep) && !rel.startsWith('vendor/')) {
          addImport(rel.split(path.sep).join('/'));
        }
      }
    }

    const exports = extractExports(content);

    return {
      filePath: filePath.split(path.sep).join('/'),
      imports,
      exports,
    };
  },
};
