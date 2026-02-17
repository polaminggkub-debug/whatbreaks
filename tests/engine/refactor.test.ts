import { describe, it, expect } from 'vitest';
import { GraphIndex } from '../../src/engine/graph';
import { analyzeRefactorImpact } from '../../src/engine/refactor';
import { buildGraph, buildGraphWithTests } from './helpers';

describe('analyzeRefactorImpact', () => {
  it('refactor B where A->B and C->B: affected includes A and C', () => {
    // A imports B, C imports B. Refactoring B affects A and C (they import it).
    const graph = buildGraph(['A', 'B', 'C'], [
      ['A', 'B'],
      ['C', 'B'],
    ]);
    const index = new GraphIndex(graph);
    const result = analyzeRefactorImpact(index, 'B');

    expect(result.file).toBe('B');
    expect(result.mode).toBe('refactor');
    expect(result.direct_importers).toContain('A');
    expect(result.direct_importers).toContain('C');
    expect(result.direct_importers).toHaveLength(2);
    expect(result.affected_files).toBe(2);
  });

  it('Test1->A->B, refactor B: affected tests includes Test1', () => {
    // Test1 imports A, A imports B. Refactoring B: A is affected (imports B),
    // then Test1 is affected (imports A). Test1 is a test node.
    const graph = buildGraphWithTests(['A', 'B'], ['Test1'], [
      ['Test1', 'A'],
      ['A', 'B'],
    ]);
    const index = new GraphIndex(graph);
    const result = analyzeRefactorImpact(index, 'B');

    expect(result.tests_to_run).toContain('Test1');
    expect(result.affected_tests).toBe(1);
    expect(result.transitive_affected).toContain('A');
    expect(result.transitive_affected).toContain('Test1');
  });

  it('leaf node with no dependents has empty blast radius', () => {
    // A imports B. B is a leaf (no one imports A or B from outside).
    // Actually: A imports B, so B has importer A. A has no importers.
    // Refactoring A: no one imports A -> empty blast radius.
    const graph = buildGraph(['A', 'B'], [['A', 'B']]);
    const index = new GraphIndex(graph);
    const result = analyzeRefactorImpact(index, 'A');

    expect(result.direct_importers).toHaveLength(0);
    expect(result.transitive_affected).toHaveLength(0);
    expect(result.affected_files).toBe(0);
  });

  it('transitive: A->B->C, refactor C: A is in blast radius', () => {
    // A imports B, B imports C. Refactoring C: B imports C (direct), A imports B (transitive).
    const graph = buildGraph(['A', 'B', 'C'], [
      ['A', 'B'],
      ['B', 'C'],
    ]);
    const index = new GraphIndex(graph);
    const result = analyzeRefactorImpact(index, 'C');

    expect(result.direct_importers).toEqual(['B']);
    expect(result.transitive_affected).toContain('A');
    expect(result.transitive_affected).toContain('B');
    expect(result.affected_files).toBe(2);
  });

  it('suggested test command uses vitest for non-e2e tests', () => {
    const graph = buildGraphWithTests(['A'], ['tests/unit/foo.test.ts'], [
      ['tests/unit/foo.test.ts', 'A'],
    ]);
    const index = new GraphIndex(graph);
    const result = analyzeRefactorImpact(index, 'A');

    expect(result.suggested_test_command).toContain('npx vitest');
    expect(result.suggested_test_command).toContain('foo');
  });

  it('multiple tests: Test1->B, Test2->B, Test3->B, refactor B: all 3 tests returned', () => {
    const graph = buildGraphWithTests(['B'], ['Test1', 'Test2', 'Test3'], [
      ['Test1', 'B'],
      ['Test2', 'B'],
      ['Test3', 'B'],
    ]);
    const index = new GraphIndex(graph);
    const result = analyzeRefactorImpact(index, 'B');

    expect(result.tests_to_run).toContain('Test1');
    expect(result.tests_to_run).toContain('Test2');
    expect(result.tests_to_run).toContain('Test3');
    expect(result.affected_tests).toBe(3);
  });

  it('Test->Helper->Source, refactor Source: Test is in affected tests (transitive)', () => {
    // Test imports Helper, Helper imports Source.
    // Refactoring Source: Helper is direct importer, Test is transitive.
    const graph = buildGraphWithTests(['Helper', 'Source'], ['Test'], [
      ['Test', 'Helper'],
      ['Helper', 'Source'],
    ]);
    const index = new GraphIndex(graph);
    const result = analyzeRefactorImpact(index, 'Source');

    expect(result.direct_importers).toEqual(['Helper']);
    expect(result.transitive_affected).toContain('Test');
    expect(result.tests_to_run).toContain('Test');
    expect(result.affected_tests).toBe(1);
  });
});
