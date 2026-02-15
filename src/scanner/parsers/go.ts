import path from 'node:path';
import fs from 'node:fs';
import type { ParsedFile } from '../importParser.js';
import type { LanguageParser } from './index.js';

/**
 * Read the module name from go.mod in the project root.
 * Returns the module path (e.g., "github.com/user/myproject") or null.
 */
function readGoModule(projectRoot: string): string | null {
  const goModPath = path.join(projectRoot, 'go.mod');
  if (!fs.existsSync(goModPath)) return null;
  const content = fs.readFileSync(goModPath, 'utf-8');
  const match = content.match(/^module\s+(\S+)/m);
  return match ? match[1] : null;
}

/**
 * Check if an import path is a Go standard library package.
 * Standard library imports don't contain a dot in the first path segment.
 * Examples: "fmt", "os", "net/http", "encoding/json" -> standard library
 * Examples: "github.com/user/repo" -> NOT standard library
 */
function isStdLib(importPath: string): boolean {
  const firstSegment = importPath.split('/')[0];
  return !firstSegment.includes('.');
}

/**
 * Find the first non-test .go file in a directory to use as the
 * representative node for a Go package import.
 * Returns the posix-style path relative to projectRoot, or null.
 */
function findRepresentativeGoFile(
  dirPath: string,
  projectRoot: string,
): string | null {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return null;
  }

  const entries = fs.readdirSync(dirPath);
  const goFiles = entries
    .filter((f) => f.endsWith('.go') && !f.endsWith('_test.go'))
    .sort();

  if (goFiles.length === 0) return null;

  const resolved = path.relative(projectRoot, path.join(dirPath, goFiles[0]));
  return resolved.split(path.sep).join('/');
}

/**
 * Parse all import paths from Go source code.
 * Handles:
 *   - Single imports:  import "fmt"
 *   - Named imports:   import m "pkg/auth"
 *   - Dot imports:     import . "pkg/auth"
 *   - Grouped imports: import ( ... )
 */
function parseGoImports(content: string): string[] {
  const imports: string[] = [];

  // Pattern for grouped imports: import ( ... )
  const groupedRe = /import\s*\(\s*([\s\S]*?)\)/g;
  let groupMatch: RegExpExecArray | null;

  while ((groupMatch = groupedRe.exec(content)) !== null) {
    const block = groupMatch[1];
    // Each line in the block can be:
    //   "path"
    //   alias "path"
    //   . "path"
    //   _ "path"
    const lineRe = /(?:\S+\s+)?"([^"]+)"/g;
    let lineMatch: RegExpExecArray | null;
    while ((lineMatch = lineRe.exec(block)) !== null) {
      imports.push(lineMatch[1]);
    }
  }

  // Pattern for single-line imports (not inside a group)
  // Must match `import "path"` and `import alias "path"` but NOT `import (`
  const singleRe = /import\s+(?:\S+\s+)?"([^"]+)"/g;
  let singleMatch: RegExpExecArray | null;

  while ((singleMatch = singleRe.exec(content)) !== null) {
    const importPath = singleMatch[1];
    // Avoid duplicates from grouped imports already captured
    if (!imports.includes(importPath)) {
      imports.push(importPath);
    }
  }

  return imports;
}

/**
 * Extract exported symbols from Go source code.
 * In Go, anything starting with an uppercase letter is exported.
 * Extracts: functions, types (struct/interface), vars, consts.
 */
function parseGoExports(content: string): string[] {
  const exports: string[] = [];
  const seen = new Set<string>();

  function addExport(name: string): void {
    if (name && /^[A-Z]/.test(name) && !seen.has(name)) {
      seen.add(name);
      exports.push(name);
    }
  }

  // Exported functions: func FunctionName(
  const funcRe = /^func\s+(?:\([^)]*\)\s+)?([A-Z]\w*)\s*\(/gm;
  let match: RegExpExecArray | null;
  while ((match = funcRe.exec(content)) !== null) {
    addExport(match[1]);
  }

  // Exported types: type TypeName struct/interface/...
  const typeRe = /^type\s+([A-Z]\w*)\s+/gm;
  while ((match = typeRe.exec(content)) !== null) {
    addExport(match[1]);
  }

  // Exported vars: var VarName or var ( VarName ... )
  // Single var
  const varSingleRe = /^var\s+([A-Z]\w*)\b/gm;
  while ((match = varSingleRe.exec(content)) !== null) {
    addExport(match[1]);
  }
  // Grouped var
  const varGroupRe = /^var\s*\(\s*([\s\S]*?)\)/gm;
  while ((match = varGroupRe.exec(content)) !== null) {
    const block = match[1];
    const nameRe = /^\s*([A-Z]\w*)\b/gm;
    let nameMatch: RegExpExecArray | null;
    while ((nameMatch = nameRe.exec(block)) !== null) {
      addExport(nameMatch[1]);
    }
  }

  // Exported consts: const ConstName or const ( ConstName ... )
  // Single const
  const constSingleRe = /^const\s+([A-Z]\w*)\b/gm;
  while ((match = constSingleRe.exec(content)) !== null) {
    addExport(match[1]);
  }
  // Grouped const
  const constGroupRe = /^const\s*\(\s*([\s\S]*?)\)/gm;
  while ((match = constGroupRe.exec(content)) !== null) {
    const block = match[1];
    const nameRe = /^\s*([A-Z]\w*)\b/gm;
    let nameMatch: RegExpExecArray | null;
    while ((nameMatch = nameRe.exec(block)) !== null) {
      addExport(nameMatch[1]);
    }
  }

  return exports;
}

/**
 * Parse a Go source file and extract imports and exports.
 */
function parseGoFile(filePath: string, projectRoot: string): ParsedFile {
  const absolutePath = path.resolve(projectRoot, filePath);
  const content = fs.readFileSync(absolutePath, 'utf-8');

  const moduleName = readGoModule(projectRoot);
  const rawImports = parseGoImports(content);

  const resolvedImports: string[] = [];

  for (const imp of rawImports) {
    // Skip standard library
    if (isStdLib(imp)) continue;

    // Skip external dependencies (not starting with module name)
    if (!moduleName || !imp.startsWith(moduleName)) continue;

    // Strip module prefix to get the relative directory
    const relDir = imp.slice(moduleName.length + 1); // +1 for the '/'
    if (!relDir) continue;

    const absDirPath = path.join(projectRoot, relDir);
    const representative = findRepresentativeGoFile(absDirPath, projectRoot);

    if (representative) {
      resolvedImports.push(representative);
    }
  }

  const exports = parseGoExports(content);

  return {
    filePath: filePath.split(path.sep).join('/'),
    imports: resolvedImports,
    exports,
  };
}

export const goParser: LanguageParser = {
  extensions: ['.go'],
  parseFile(filePath: string, projectRoot: string): ParsedFile {
    return parseGoFile(filePath, projectRoot);
  },
};
