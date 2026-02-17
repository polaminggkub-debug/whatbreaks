import { describe, it, expect } from 'vitest';
import { GraphIndex } from '../../src/engine/graph';
import { analyzeFailingTest } from '../../src/engine/failing';
import { buildGraphWithTests } from './helpers';

describe('analyzeFailingTest', () => {
  it('Test->A->B->C: deepest-first returns C before B before A', () => {
    // Test imports A, A imports B, B imports C.
    // Chain depths: Test=0, A=1, B=2, C=3
    // filesToInvestigate (deepest-first): C, B, A
    const graph = buildGraphWithTests(['A', 'B', 'C'], ['Test'], [
      ['Test', 'A'],
      ['A', 'B'],
      ['B', 'C'],
    ]);
    const index = new GraphIndex(graph);
    const result = analyzeFailingTest(index, 'Test');

    expect(result.test).toBe('Test');
    expect(result.mode).toBe('failing');
    expect(result.filesToInvestigate[0]).toBe('C'); // deepest first
    expect(result.filesToInvestigate[1]).toBe('B');
    expect(result.filesToInvestigate[2]).toBe('A');
    expect(result.directlyTests).toEqual(['A']); // direct import of the test
  });

  it('diamond: Test->A->C, Test->B->C: C appears once, ranked deepest', () => {
    // Test imports A and B. A imports C. B imports C.
    // Chain: Test=0, A=1, B=1, C=2
    // filesToInvestigate deepest-first: C, then A and B (both depth 1)
    const graph = buildGraphWithTests(['A', 'B', 'C'], ['Test'], [
      ['Test', 'A'],
      ['Test', 'B'],
      ['A', 'C'],
      ['B', 'C'],
    ]);
    const index = new GraphIndex(graph);
    const result = analyzeFailingTest(index, 'Test');

    // C should appear exactly once
    const cCount = result.filesToInvestigate.filter((f) => f === 'C').length;
    expect(cCount).toBe(1);

    // C should be first (deepest)
    expect(result.filesToInvestigate[0]).toBe('C');

    // A and B should both be present
    expect(result.filesToInvestigate).toContain('A');
    expect(result.filesToInvestigate).toContain('B');
    expect(result.filesToInvestigate).toHaveLength(3);
  });

  it('test with no imports returns empty chain of dependencies', () => {
    const graph = buildGraphWithTests([], ['Test'], []);
    const index = new GraphIndex(graph);
    const result = analyzeFailingTest(index, 'Test');

    expect(result.test).toBe('Test');
    // chain includes the test itself at depth 0
    expect(result.chain).toHaveLength(1);
    expect(result.chain[0].nodeId).toBe('Test');
    expect(result.directlyTests).toHaveLength(0);
    expect(result.deepDependencies).toHaveLength(0);
    expect(result.filesToInvestigate).toHaveLength(0);
  });

  it('two independent chains: Test->A->B, Test->C returns all nodes', () => {
    const graph = buildGraphWithTests(['A', 'B', 'C'], ['Test'], [
      ['Test', 'A'],
      ['Test', 'C'],
      ['A', 'B'],
    ]);
    const index = new GraphIndex(graph);
    const result = analyzeFailingTest(index, 'Test');

    expect(result.filesToInvestigate).toContain('A');
    expect(result.filesToInvestigate).toContain('B');
    expect(result.filesToInvestigate).toContain('C');
    // B is deepest (depth 2), should be first
    expect(result.filesToInvestigate[0]).toBe('B');
    // A and C are depth 1
    expect(result.directlyTests).toContain('A');
    expect(result.directlyTests).toContain('C');
  });

  it('circular in chain: Test->A->B->A returns both A and B, no hang', () => {
    const graph = buildGraphWithTests(['A', 'B'], ['Test'], [
      ['Test', 'A'],
      ['A', 'B'],
      ['B', 'A'],
    ]);
    const index = new GraphIndex(graph);
    const result = analyzeFailingTest(index, 'Test');

    expect(result.filesToInvestigate).toContain('A');
    expect(result.filesToInvestigate).toContain('B');
    // Should not hang and should have exactly 2 source files
    expect(result.filesToInvestigate).toHaveLength(2);
  });
});
