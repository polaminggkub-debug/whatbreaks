import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { parseImports } from '../../src/scanner/importParser';

const FIXTURES = path.resolve(__dirname, '../fixtures');

describe('importParser', () => {
  describe('basic imports', () => {
    const projectRoot = path.join(FIXTURES, 'basic-imports');

    it('resolves a basic relative import ./b to b.ts', () => {
      const result = parseImports('a.ts', projectRoot);

      expect(result.filePath).toBe('a.ts');
      expect(result.imports).toContain('b.ts');
    });

    it('resolves mixed default + named import to a single edge', () => {
      const result = parseImports('a.ts', projectRoot);

      // a.ts imports from ./utils (default + named)
      expect(result.imports).toContain('utils.ts');
    });

    it('resolves parent directory import ../b from sub/deep.ts', () => {
      const result = parseImports('sub/deep.ts', projectRoot);

      expect(result.imports).toContain('b.ts');
    });

    it('skips non-existent import gracefully without crashing', () => {
      const result = parseImports('missing-import.ts', projectRoot);

      // ./nonexistent does not exist — should return empty imports, not throw
      expect(result.imports).toHaveLength(0);
      expect(result.filePath).toBe('missing-import.ts');
    });

    it('parses re-export file without crashing (re-exports are ExportDeclarations)', () => {
      const result = parseImports('reexport.ts', projectRoot);

      // reexport.ts has: export { someFn } from './b'
      // This is an ExportDeclaration, not an ImportDeclaration.
      // The scanner's extractFromSourceFile only reads getImportDeclarations()
      // and captures exports from functions/classes/variables/interfaces/types/enums.
      // Re-exports are neither, so:
      // - imports array is empty (no ImportDeclaration)
      // - exports array is empty (no function/class/variable declaration)
      expect(result.filePath).toBe('reexport.ts');
      expect(result.imports).toHaveLength(0);
      expect(result.exports).toHaveLength(0);
    });

    it('skips node_modules import (lodash)', () => {
      const result = parseImports('node-modules-import.ts', projectRoot);

      // 'lodash' is not a relative path, so resolveImportPath returns null
      expect(result.imports).toHaveLength(0);
    });
  });

  describe('ESM .js to .ts resolution', () => {
    const projectRoot = path.join(FIXTURES, 'js-to-ts-resolution');

    it('resolves import from ./b.js to b.ts', () => {
      const result = parseImports('a.ts', projectRoot);

      expect(result.imports).toContain('b.ts');
      expect(result.imports).toHaveLength(1);
    });
  });

  describe('type-only imports', () => {
    const projectRoot = path.join(FIXTURES, 'type-only-imports');

    it('creates edge for type-only import', () => {
      const result = parseImports('a.ts', projectRoot);

      expect(result.imports).toContain('types.ts');
      expect(result.imports).toHaveLength(1);
    });
  });

  describe('index/directory resolution', () => {
    const projectRoot = path.join(FIXTURES, 'index-resolution');

    it('resolves directory import ./utils to utils/index.ts', () => {
      const result = parseImports('main.ts', projectRoot);

      expect(result.imports).toContain('utils/index.ts');
      expect(result.imports).toHaveLength(1);
    });

    it('barrel re-export does not create import edge (ExportDeclaration not ImportDeclaration)', () => {
      const result = parseImports('utils/index.ts', projectRoot);

      // index.ts has: export { helper } from './helper'
      // This is an ExportDeclaration, not an ImportDeclaration.
      // The scanner only reads getImportDeclarations(), so no import edge is created.
      // The re-exported name 'helper' is also not captured as an export
      // because it's not a function/class/variable declaration in this file.
      expect(result.imports).toHaveLength(0);
      expect(result.exports).toHaveLength(0);
    });
  });

  describe('circular dependencies', () => {
    const projectRoot = path.join(FIXTURES, 'circular-deps');

    it('parses both files with circular imports without crashing', () => {
      const resultA = parseImports('a.ts', projectRoot);
      const resultB = parseImports('b.ts', projectRoot);

      expect(resultA.imports).toContain('b.ts');
      expect(resultB.imports).toContain('a.ts');
      expect(resultA.exports).toContain('a');
      expect(resultB.exports).toContain('b');
    });
  });
});
