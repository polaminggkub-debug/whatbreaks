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

    it('creates import edge for re-export (export { X } from "./Y")', () => {
      const result = parseImports('reexport.ts', projectRoot);

      // reexport.ts has: export { someFn } from './b'
      // Re-exports should create an import edge to the source module
      // and capture the re-exported name as an export.
      expect(result.filePath).toBe('reexport.ts');
      expect(result.imports).toContain('b.ts');
      expect(result.imports).toHaveLength(1);
      expect(result.exports).toContain('someFn');
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

    it('barrel re-export creates import edge and captures exported name', () => {
      const result = parseImports('utils/index.ts', projectRoot);

      // index.ts has: export { helper } from './helper'
      // Re-exports should create an import edge to the source module
      // and capture the re-exported name as an export.
      expect(result.imports).toContain('utils/helper.ts');
      expect(result.imports).toHaveLength(1);
      expect(result.exports).toContain('helper');
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

  describe('re-export patterns', () => {
    const projectRoot = path.join(FIXTURES, 'reexport-patterns');

    it('named re-export creates import edge and captures export name', () => {
      const result = parseImports('barrel.ts', projectRoot);
      expect(result.imports).toContain('helper.ts');
      expect(result.imports).toContain('formatter.ts');
      expect(result.imports).toHaveLength(2);
      expect(result.exports).toContain('helper');
      expect(result.exports).toContain('formatter');
    });

    it('star re-export (export * from) creates import edge', () => {
      const result = parseImports('star-reexport.ts', projectRoot);
      expect(result.imports).toContain('helper.ts');
      expect(result.imports).toHaveLength(1);
    });

    it('aliased re-export captures the alias name', () => {
      const result = parseImports('alias-reexport.ts', projectRoot);
      expect(result.imports).toContain('helper.ts');
      expect(result.imports).toHaveLength(1);
      expect(result.exports).toContain('myHelper');
    });

    it('type re-export creates import edge', () => {
      const result = parseImports('type-reexport.ts', projectRoot);
      expect(result.imports).toContain('helper.ts');
      expect(result.imports).toHaveLength(1);
      expect(result.exports).toContain('SomeType');
    });

    it('chained barrel re-export resolves to intermediate barrel', () => {
      const result = parseImports('chained-barrel.ts', projectRoot);
      expect(result.imports).toContain('barrel.ts');
      expect(result.imports).toHaveLength(1);
      expect(result.exports).toContain('helper');
    });

    it('consumer imports from barrel file normally', () => {
      const result = parseImports('consumer.ts', projectRoot);
      expect(result.imports).toContain('barrel.ts');
      expect(result.imports).toHaveLength(1);
    });
  });
});
