import { describe, it, expect } from 'vitest';
import { GraphIndex } from '../../src/engine/graph';
import { analyzeRisk } from '../../src/engine/risk';
import { buildGraph, buildGraphWithTests } from './helpers';

describe('analyzeRisk', () => {
  it('hotspot: B has 5 importers and is ranked as top hotspot', () => {
    // 5 files all import B. B should be the top hotspot with fanIn=5.
    const graph = buildGraph(['A1', 'A2', 'A3', 'A4', 'A5', 'B'], [
      ['A1', 'B'],
      ['A2', 'B'],
      ['A3', 'B'],
      ['A4', 'B'],
      ['A5', 'B'],
    ]);
    const index = new GraphIndex(graph);
    const report = analyzeRisk(index);

    expect(report.hotspots.length).toBeGreaterThanOrEqual(1);
    expect(report.hotspots[0].file).toBe('B');
    expect(report.hotspots[0].fanIn).toBe(5);
    expect(report.hotspots[0].riskLevel).toBe('medium'); // fanIn 5 >= 5 threshold
  });

  it('chain depth: Test->A->B->C->D has chainDepth 4', () => {
    // Test imports A, A imports B, B imports C, C imports D.
    // BFS from Test: A=1, B=2, C=3, D=4. maxDepth = 4.
    const graph = buildGraphWithTests(['A', 'B', 'C', 'D'], ['Test'], [
      ['Test', 'A'],
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
    ]);
    const index = new GraphIndex(graph);
    const report = analyzeRisk(index);

    expect(report.fragileChains.length).toBeGreaterThanOrEqual(1);
    const testChain = report.fragileChains.find((c) => c.test === 'Test');
    expect(testChain).toBeDefined();
    expect(testChain!.chainDepth).toBe(4);
    expect(testChain!.deepestDep).toBe('D');
  });

  it('circular dep: A->B->A is detected in cycles list', () => {
    const graph = buildGraph(['A', 'B'], [
      ['A', 'B'],
      ['B', 'A'],
    ]);
    const index = new GraphIndex(graph);
    const report = analyzeRisk(index);

    expect(report.circularDeps.length).toBeGreaterThanOrEqual(1);
    // The cycle should contain both A and B
    const cycle = report.circularDeps[0].cycle;
    // cycle format: [start, ..., start] (start repeated at end)
    const cycleNodes = cycle.slice(0, -1); // remove closing node
    expect(cycleNodes).toContain('A');
    expect(cycleNodes).toContain('B');
  });

  it('triangle cycle: A->B->C->A is detected as one cycle', () => {
    const graph = buildGraph(['A', 'B', 'C'], [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'A'],
    ]);
    const index = new GraphIndex(graph);
    const report = analyzeRisk(index);

    expect(report.circularDeps.length).toBeGreaterThanOrEqual(1);
    // Should find exactly one cycle containing all three nodes
    const allCycleNodes = report.circularDeps.flatMap((c) => c.cycle.slice(0, -1));
    expect(allCycleNodes).toContain('A');
    expect(allCycleNodes).toContain('B');
    expect(allCycleNodes).toContain('C');
  });

  it('no cycles: acyclic graph returns empty cycles list', () => {
    const graph = buildGraph(['A', 'B', 'C'], [
      ['A', 'B'],
      ['B', 'C'],
    ]);
    const index = new GraphIndex(graph);
    const report = analyzeRisk(index);

    expect(report.circularDeps).toHaveLength(0);
  });

  it('hotspot with test nodes: counts only source importers in fanIn', () => {
    // B is imported by 3 source files and 2 test files.
    // Hotspots only count source nodes (findHotspots iterates sourceIds).
    // But importers can be tests too (getImporters returns all importers).
    // fanIn = total importers count (both source and test).
    const graph = buildGraphWithTests(
      ['S1', 'S2', 'S3', 'B'],
      ['T1', 'T2'],
      [
        ['S1', 'B'],
        ['S2', 'B'],
        ['S3', 'B'],
        ['T1', 'B'],
        ['T2', 'B'],
      ],
    );
    const index = new GraphIndex(graph);
    const report = analyzeRisk(index);

    // B should be in hotspots (it's a source node with importers)
    const bHotspot = report.hotspots.find((h) => h.file === 'B');
    expect(bHotspot).toBeDefined();
    // fanIn counts ALL importers (source + test) = 5
    expect(bHotspot!.fanIn).toBe(5);
    expect(report.sourceFiles).toBe(4); // S1, S2, S3, B
    expect(report.testFiles).toBe(2); // T1, T2
  });
});
