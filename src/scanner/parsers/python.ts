import path from 'node:path';
import fs from 'node:fs';
import type { ParsedFile } from '../importParser.js';
import type { LanguageParser } from './index.js';

/**
 * Try to resolve a Python module path to an actual file in the project.
 * Checks both {path}.py and {path}/__init__.py under each base directory.
 * Returns a posix-normalized path relative to projectRoot, or null.
 */
function resolvePythonImport(
  modulePath: string,
  fromDir: string,
  projectRoot: string,
): string | null {
  const asPath = modulePath.replace(/\./g, '/');
  const bases = [fromDir, projectRoot];

  for (const base of bases) {
    const asFile = path.join(base, asPath + '.py');
    if (fs.existsSync(asFile)) {
      return path.relative(projectRoot, asFile).split(path.sep).join('/');
    }

    const asPackage = path.join(base, asPath, '__init__.py');
    if (fs.existsSync(asPackage)) {
      return path.relative(projectRoot, asPackage).split(path.sep).join('/');
    }
  }

  return null;
}

/**
 * Resolve a relative Python import (starting with dots) to a project file.
 * Counts leading dots to determine how many directories to ascend.
 */
function resolveRelativePythonImport(
  dotPrefix: string,
  moduleSuffix: string,
  currentFileDir: string,
  projectRoot: string,
): string | null {
  // Count leading dots: . = current dir, .. = parent, ... = grandparent
  const dotCount = dotPrefix.length;
  let baseDir = currentFileDir;
  for (let i = 1; i < dotCount; i++) {
    baseDir = path.dirname(baseDir);
  }

  if (!moduleSuffix) {
    // `from . import foo` — the module itself is the package __init__.py
    const initFile = path.join(baseDir, '__init__.py');
    if (fs.existsSync(initFile)) {
      return path.relative(projectRoot, initFile).split(path.sep).join('/');
    }
    return null;
  }

  // Convert remaining dots in module suffix to path separators
  const asPath = moduleSuffix.replace(/\./g, '/');

  const asFile = path.join(baseDir, asPath + '.py');
  if (fs.existsSync(asFile)) {
    return path.relative(projectRoot, asFile).split(path.sep).join('/');
  }

  const asPackage = path.join(baseDir, asPath, '__init__.py');
  if (fs.existsSync(asPackage)) {
    return path.relative(projectRoot, asPackage).split(path.sep).join('/');
  }

  return null;
}

/**
 * Extract top-level function and class names, plus __all__ entries, as exports.
 */
function extractExports(content: string): string[] {
  const exports: string[] = [];
  const seen = new Set<string>();

  // __all__ = ['foo', 'bar'] or __all__ = ["foo", "bar"]
  const allMatch = content.match(
    /^__all__\s*=\s*\[([^\]]*)\]/m,
  );
  if (allMatch) {
    const items = allMatch[1].matchAll(/['"](\w+)['"]/g);
    for (const m of items) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        exports.push(m[1]);
      }
    }
    return exports;
  }

  // Top-level def function_name(
  const defRegex = /^def\s+(\w+)\s*\(/gm;
  let match: RegExpExecArray | null;
  while ((match = defRegex.exec(content)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      exports.push(match[1]);
    }
  }

  // Top-level class ClassName
  const classRegex = /^class\s+(\w+)/gm;
  while ((match = classRegex.exec(content)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      exports.push(match[1]);
    }
  }

  return exports;
}

export const pythonParser: LanguageParser = {
  extensions: ['.py'],

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

    // Pattern 1: `import foo` or `import foo.bar`
    const importRegex = /^import\s+([\w.]+)/gm;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
      const moduleName = match[1];
      addImport(resolvePythonImport(moduleName, currentFileDir, projectRoot));
    }

    // Pattern 2: `from X import Y` (absolute and relative)
    const fromImportRegex = /^from\s+(\.{0,3}[\w.]*)\s+import/gm;
    while ((match = fromImportRegex.exec(content)) !== null) {
      const source = match[1];

      if (source.startsWith('.')) {
        // Relative import: split into dot prefix and module suffix
        const dotMatch = source.match(/^(\.+)(.*)/);
        if (dotMatch) {
          const dotPrefix = dotMatch[1];
          const moduleSuffix = dotMatch[2];
          addImport(
            resolveRelativePythonImport(
              dotPrefix,
              moduleSuffix,
              currentFileDir,
              projectRoot,
            ),
          );
        }
      } else {
        // Absolute import: try full module path first, then parent package
        const resolved = resolvePythonImport(source, currentFileDir, projectRoot);
        if (resolved) {
          addImport(resolved);
        } else {
          // `from foo.bar import baz` — try foo/bar.py
          const parts = source.split('.');
          if (parts.length > 1) {
            const parentModule = parts.join('.');
            addImport(
              resolvePythonImport(parentModule, currentFileDir, projectRoot),
            );
          }
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
