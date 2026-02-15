import { Project, SyntaxKind, type SourceFile } from 'ts-morph';
import path from 'node:path';
import fs from 'node:fs';

export interface ParsedFile {
  filePath: string;
  imports: string[];
  exports: string[];
}

/**
 * Resolve a relative import specifier to an actual file path on disk.
 * Handles: ./foo -> ./foo.ts, ./utils -> ./utils/index.ts
 * Returns the resolved path relative to projectRoot, or null if unresolvable.
 */
function resolveImportPath(
  importSpecifier: string,
  currentFileDir: string,
  projectRoot: string,
): string | null {
  // Skip external (node_modules) imports
  if (!importSpecifier.startsWith('.') && !importSpecifier.startsWith('/')) {
    return null;
  }

  const absoluteBase = path.resolve(currentFileDir, importSpecifier);

  // Try exact match first (e.g., already has extension)
  if (fs.existsSync(absoluteBase) && fs.statSync(absoluteBase).isFile()) {
    return path.relative(projectRoot, absoluteBase);
  }

  // Try with .ts extension
  const withTs = absoluteBase + '.ts';
  if (fs.existsSync(withTs)) {
    return path.relative(projectRoot, withTs);
  }

  // Try with .vue extension
  const withVue = absoluteBase + '.vue';
  if (fs.existsSync(withVue)) {
    return path.relative(projectRoot, withVue);
  }

  // Try as directory with index.ts
  const indexTs = path.join(absoluteBase, 'index.ts');
  if (fs.existsSync(indexTs)) {
    return path.relative(projectRoot, indexTs);
  }

  // Try with .js extension (ESM compat — may map to .ts at build time)
  const withJs = absoluteBase + '.js';
  if (fs.existsSync(withJs)) {
    return path.relative(projectRoot, withJs);
  }

  // Could not resolve — return null
  return null;
}

/**
 * Extract imports and exports from a ts-morph SourceFile.
 */
export function extractFromSourceFile(
  sourceFile: SourceFile,
  currentFileDir: string,
  projectRoot: string,
): { imports: string[]; exports: string[] } {
  const imports: string[] = [];
  const exports: string[] = [];

  // --- Extract imports ---
  for (const decl of sourceFile.getImportDeclarations()) {
    // Skip type-only imports
    if (decl.isTypeOnly()) continue;

    const specifier = decl.getModuleSpecifierValue();
    const resolved = resolveImportPath(specifier, currentFileDir, projectRoot);
    if (resolved) {
      // Normalize to posix separators for consistency
      imports.push(resolved.split(path.sep).join('/'));
    }
  }

  // --- Extract exports ---

  // Exported functions
  for (const fn of sourceFile.getFunctions()) {
    if (fn.isExported()) {
      const name = fn.getName();
      if (name) exports.push(name);
    }
  }

  // Exported classes
  for (const cls of sourceFile.getClasses()) {
    if (cls.isExported()) {
      const name = cls.getName();
      if (name) exports.push(name);
    }
  }

  // Exported variables (const, let, var)
  for (const stmt of sourceFile.getVariableStatements()) {
    if (stmt.isExported()) {
      for (const decl of stmt.getDeclarations()) {
        exports.push(decl.getName());
      }
    }
  }

  // Exported interfaces and type aliases (informational, still useful)
  for (const iface of sourceFile.getInterfaces()) {
    if (iface.isExported()) {
      const name = iface.getName();
      if (name) exports.push(name);
    }
  }

  for (const ta of sourceFile.getTypeAliases()) {
    if (ta.isExported()) {
      exports.push(ta.getName());
    }
  }

  // Exported enums
  for (const en of sourceFile.getEnums()) {
    if (en.isExported()) {
      exports.push(en.getName());
    }
  }

  return { imports, exports };
}

/**
 * Parse a TypeScript file and extract import/export information.
 */
export function parseImports(
  filePath: string,
  projectRoot: string,
): ParsedFile {
  const absolutePath = path.resolve(projectRoot, filePath);
  const currentFileDir = path.dirname(absolutePath);

  const project = new Project({
    compilerOptions: { allowJs: true },
    skipAddingFilesFromTsConfig: true,
  });

  const sourceFile = project.addSourceFileAtPath(absolutePath);

  const { imports, exports } = extractFromSourceFile(
    sourceFile,
    currentFileDir,
    projectRoot,
  );

  return {
    filePath: filePath.split(path.sep).join('/'),
    imports,
    exports,
  };
}
