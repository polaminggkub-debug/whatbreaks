import path from 'node:path';
import fs from 'node:fs';
import type { ParsedFile } from '../importParser.js';
import type { LanguageParser } from './index.js';

/**
 * Try to resolve a Rust module path to an actual file.
 * Checks both {modulePath}.rs and {modulePath}/mod.rs under the given base.
 * Returns a posix-normalized path relative to projectRoot, or null.
 */
function resolveRustModule(
  modulePath: string,
  baseDir: string,
  projectRoot: string,
): string | null {
  const asFile = path.join(baseDir, modulePath + '.rs');
  if (fs.existsSync(asFile)) {
    return path.relative(projectRoot, asFile).split(path.sep).join('/');
  }

  const asDir = path.join(baseDir, modulePath, 'mod.rs');
  if (fs.existsSync(asDir)) {
    return path.relative(projectRoot, asDir).split(path.sep).join('/');
  }

  return null;
}

/**
 * Resolve a `crate::` path to a project file.
 * `crate::foo::bar` -> try `src/foo/bar.rs` then `src/foo/bar/mod.rs`
 */
function resolveCratePath(
  segments: string[],
  projectRoot: string,
): string | null {
  const srcDir = path.join(projectRoot, 'src');
  const modulePath = segments.join('/');
  return resolveRustModule(modulePath, srcDir, projectRoot);
}

/**
 * Resolve a `super::` path relative to the current file's parent directory.
 */
function resolveSuperPath(
  segments: string[],
  currentFileDir: string,
  projectRoot: string,
): string | null {
  const parentDir = path.dirname(currentFileDir);
  const modulePath = segments.join('/');
  return resolveRustModule(modulePath, parentDir, projectRoot);
}

/**
 * Resolve a `self::` path relative to the current file's directory.
 */
function resolveSelfPath(
  segments: string[],
  currentFileDir: string,
  projectRoot: string,
): string | null {
  const modulePath = segments.join('/');
  return resolveRustModule(modulePath, currentFileDir, projectRoot);
}

/**
 * Resolve a `mod name;` declaration to a sibling file or subdirectory.
 */
function resolveModDecl(
  moduleName: string,
  currentFileDir: string,
  projectRoot: string,
): string | null {
  return resolveRustModule(moduleName, currentFileDir, projectRoot);
}

/**
 * Extract the module path segments from a use path, stripping the final
 * item (which is the imported symbol, not a module directory).
 * For grouped imports like `use crate::module::{A, B}`, we only need the module path.
 */
function extractModulePath(usePath: string): string[] {
  // Remove any grouped import suffix: `{item1, item2}`
  const braceIdx = usePath.indexOf('{');
  const cleanPath = braceIdx >= 0
    ? usePath.substring(0, braceIdx).replace(/::\s*$/, '')
    : usePath;

  const segments = cleanPath.split('::');

  // If there was no brace group, the last segment is the imported item, not a module
  if (braceIdx < 0 && segments.length > 1) {
    segments.pop();
  }

  return segments;
}

/**
 * Extract pub items as exports from Rust source.
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

  // pub fn function_name(
  const fnRegex = /\bpub\s+(?:async\s+)?fn\s+(\w+)\s*[(<]/gm;
  let match: RegExpExecArray | null;
  while ((match = fnRegex.exec(content)) !== null) {
    add(match[1]);
  }

  // pub struct StructName
  const structRegex = /\bpub\s+struct\s+(\w+)/gm;
  while ((match = structRegex.exec(content)) !== null) {
    add(match[1]);
  }

  // pub enum EnumName
  const enumRegex = /\bpub\s+enum\s+(\w+)/gm;
  while ((match = enumRegex.exec(content)) !== null) {
    add(match[1]);
  }

  // pub trait TraitName
  const traitRegex = /\bpub\s+trait\s+(\w+)/gm;
  while ((match = traitRegex.exec(content)) !== null) {
    add(match[1]);
  }

  // pub type TypeName
  const typeRegex = /\bpub\s+type\s+(\w+)/gm;
  while ((match = typeRegex.exec(content)) !== null) {
    add(match[1]);
  }

  return exports;
}

export const rustParser: LanguageParser = {
  extensions: ['.rs'],

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

    // Pattern: `use crate::...`, `use super::...`, `use self::...`
    // Also handles grouped imports: `use crate::module::{A, B};`
    const useRegex = /^\s*use\s+((?:crate|super|self)::[\w:{}*,\s]+)\s*;/gm;
    let match: RegExpExecArray | null;
    while ((match = useRegex.exec(content)) !== null) {
      const usePath = match[1].replace(/\s+/g, '');
      const segments = extractModulePath(usePath);

      if (segments.length === 0) continue;

      const prefix = segments[0];
      const rest = segments.slice(1);

      if (prefix === 'crate' && rest.length > 0) {
        addImport(resolveCratePath(rest, projectRoot));
      } else if (prefix === 'super' && rest.length > 0) {
        addImport(resolveSuperPath(rest, currentFileDir, projectRoot));
      } else if (prefix === 'self' && rest.length > 0) {
        addImport(resolveSelfPath(rest, currentFileDir, projectRoot));
      }
    }

    // Pattern: `mod module_name;` (not `mod module_name {` which is an inline module)
    const modRegex = /^\s*(?:pub\s+)?mod\s+(\w+)\s*;/gm;
    while ((match = modRegex.exec(content)) !== null) {
      const moduleName = match[1];
      addImport(resolveModDecl(moduleName, currentFileDir, projectRoot));
    }

    const exports = extractExports(content);

    return {
      filePath: filePath.split(path.sep).join('/'),
      imports,
      exports,
    };
  },
};
