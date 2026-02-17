import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { isTestFile, mapTestCoverage } from '../../src/scanner/testMapper';
import { parseImports } from '../../src/scanner/importParser';
import type { ParsedFile } from '../../src/scanner/importParser';

const FIXTURES = path.resolve(__dirname, '../fixtures');

describe('testMapper', () => {
  describe('isTestFile', () => {
    it('identifies .test.ts files as test files', () => {
      expect(isTestFile('src/calculator.test.ts')).toBe(true);
      expect(isTestFile('src/helper.test.ts')).toBe(true);
    });

    it('does NOT classify testUtils.ts as a test file', () => {
      // "testUtils.ts" has "test" in the name but is not *.test.ts or *.spec.ts
      expect(isTestFile('src/testUtils.ts')).toBe(false);
    });
  });

  describe('mapTestCoverage', () => {
    it('creates test-covers edge from calculator.test.ts to calculator.ts', () => {
      const projectRoot = path.join(FIXTURES, 'test-mapping');

      // Parse all files in the fixture
      const files = [
        'src/calculator.ts',
        'src/helper.ts',
        'src/calculator.test.ts',
        'src/helper.test.ts',
        'src/testUtils.ts',
      ];
      const parsedFiles = new Map<string, ParsedFile>();
      for (const file of files) {
        const parsed = parseImports(file, projectRoot);
        parsedFiles.set(parsed.filePath, parsed);
      }

      const edges = mapTestCoverage(parsedFiles);

      // calculator.test.ts imports calculator.ts -> test-covers edge
      const calcEdge = edges.find(
        (e) =>
          e.source === 'src/calculator.test.ts' &&
          e.target === 'src/calculator.ts',
      );
      expect(calcEdge).toBeDefined();
      expect(calcEdge!.type).toBe('test-covers');
    });

    it('creates test-covers edge from helper.test.ts to helper.ts (direct import)', () => {
      const projectRoot = path.join(FIXTURES, 'test-mapping');

      const files = [
        'src/calculator.ts',
        'src/helper.ts',
        'src/calculator.test.ts',
        'src/helper.test.ts',
        'src/testUtils.ts',
      ];
      const parsedFiles = new Map<string, ParsedFile>();
      for (const file of files) {
        const parsed = parseImports(file, projectRoot);
        parsedFiles.set(parsed.filePath, parsed);
      }

      const edges = mapTestCoverage(parsedFiles);

      // helper.test.ts imports helper.ts -> test-covers edge
      const helperEdge = edges.find(
        (e) =>
          e.source === 'src/helper.test.ts' &&
          e.target === 'src/helper.ts',
      );
      expect(helperEdge).toBeDefined();
      expect(helperEdge!.type).toBe('test-covers');

      // helper.test.ts does NOT directly import calculator.ts,
      // so no direct test-covers edge to calculator
      const transitiveEdge = edges.find(
        (e) =>
          e.source === 'src/helper.test.ts' &&
          e.target === 'src/calculator.ts',
      );
      expect(transitiveEdge).toBeUndefined();
    });
  });
});
