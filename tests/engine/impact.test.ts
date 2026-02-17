import { describe, it, expect } from 'vitest';
import { GraphIndex } from '../../src/engine/graph';
import { computeForwardImpact, computeBackwardImpact } from '../../src/engine/impact';
import { buildGraph, buildGraphWithTests } from './helpers';

describe('computeForwardImpact', () => {
  it('forward: A->B->C, impact from A includes B and C', () => {
    // Edge: A imports B, B imports C  =>  A->B means A depends on B
    // Forward impact from C: who imports C? B. Who imports B? A.
    // So changing C affects B and A.
    const graph = buildGraph(['A', 'B', 'C'], [
      ['A', 'B'], // A imports B
      ['B', 'C'], // B imports C
    ]);
    const index = new GraphIndex(graph);
    const result = computeForwardImpact(index, 'C');

    const affectedIds = result.nodes.map((n) => n.nodeId);
    expect(affectedIds).toContain('C'); // includes self at depth 0
    expect(affectedIds).toContain('B'); // B imports C
    expect(affectedIds).toContain('A'); // A imports B
    expect(result.nodes.find((n) => n.nodeId === 'C')!.depth).toBe(0);
    expect(result.nodes.find((n) => n.nodeId === 'B')!.depth).toBe(1);
    expect(result.nodes.find((n) => n.nodeId === 'A')!.depth).toBe(2);
  });

  it('fan-out: A->B, A->C, A->D from target B includes only A (single importer)', () => {
    // A imports B, A imports C, A imports D
    // Forward from B: who imports B? Only A.
    // Forward from A: no one imports A.
    // To test fan-out affecting multiple nodes, we should impact from a shared dep.
    // Let's make B, C, D all import E: forward from E hits B, C, D, then A.
    const graph = buildGraph(['A', 'B', 'C', 'D', 'E'], [
      ['A', 'B'],
      ['A', 'C'],
      ['A', 'D'],
      ['B', 'E'],
      ['C', 'E'],
      ['D', 'E'],
    ]);
    const index = new GraphIndex(graph);
    const result = computeForwardImpact(index, 'E');

    const affectedIds = result.nodes.map((n) => n.nodeId);
    expect(affectedIds).toContain('E');
    expect(affectedIds).toContain('B');
    expect(affectedIds).toContain('C');
    expect(affectedIds).toContain('D');
    expect(affectedIds).toContain('A');
    expect(result.nodes).toHaveLength(5);
  });

  it('cycle: A->B->C->A from A does not infinite loop', () => {
    const graph = buildGraph(['A', 'B', 'C'], [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'A'],
    ]);
    const index = new GraphIndex(graph);
    const result = computeForwardImpact(index, 'A');

    const affectedIds = result.nodes.map((n) => n.nodeId);
    expect(affectedIds).toContain('A');
    expect(affectedIds).toContain('B');
    expect(affectedIds).toContain('C');
    expect(result.nodes).toHaveLength(3);
  });

  it('isolated node with no edges returns only self', () => {
    const graph = buildGraph(['A', 'B', 'C'], []);
    const index = new GraphIndex(graph);
    const result = computeForwardImpact(index, 'A');

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].nodeId).toBe('A');
    expect(result.nodes[0].depth).toBe(0);
    expect(result.affectedTests).toHaveLength(0);
  });

  it('deep chain: A->B->C->D->E gives correct depth ordering', () => {
    // E is the deepest dependency. Forward from E goes up to D, C, B, A.
    const graph = buildGraph(['A', 'B', 'C', 'D', 'E'], [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
      ['D', 'E'],
    ]);
    const index = new GraphIndex(graph);
    const result = computeForwardImpact(index, 'E');

    expect(result.nodes.find((n) => n.nodeId === 'E')!.depth).toBe(0);
    expect(result.nodes.find((n) => n.nodeId === 'D')!.depth).toBe(1);
    expect(result.nodes.find((n) => n.nodeId === 'C')!.depth).toBe(2);
    expect(result.nodes.find((n) => n.nodeId === 'B')!.depth).toBe(3);
    expect(result.nodes.find((n) => n.nodeId === 'A')!.depth).toBe(4);
  });

  it('self-import: A->A handles gracefully', () => {
    const graph = buildGraph(['A'], [['A', 'A']]);
    const index = new GraphIndex(graph);
    const result = computeForwardImpact(index, 'A');

    // A is visited at depth 0, self-import should be skipped (already visited)
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].nodeId).toBe('A');
    expect(result.nodes[0].depth).toBe(0);
  });

  it('forward impact collects affected test nodes', () => {
    // Test1 imports A, A imports B. Forward from B: A (depth 1), Test1 (depth 2).
    const graph = buildGraphWithTests(['A', 'B'], ['Test1'], [
      ['Test1', 'A'],
      ['A', 'B'],
    ]);
    const index = new GraphIndex(graph);
    const result = computeForwardImpact(index, 'B');

    expect(result.affectedTests).toContain('Test1');
  });
});

describe('computeBackwardImpact', () => {
  it('backward: A->B->C, backward from A includes B and C', () => {
    // A imports B, B imports C. Backward from A: what does A import? B. What does B import? C.
    const graph = buildGraph(['A', 'B', 'C'], [
      ['A', 'B'],
      ['B', 'C'],
    ]);
    const index = new GraphIndex(graph);
    const result = computeBackwardImpact(index, 'A');

    const affectedIds = result.nodes.map((n) => n.nodeId);
    expect(affectedIds).toContain('A'); // self at depth 0
    expect(affectedIds).toContain('B'); // A imports B
    expect(affectedIds).toContain('C'); // B imports C
    expect(result.nodes.find((n) => n.nodeId === 'A')!.depth).toBe(0);
    expect(result.nodes.find((n) => n.nodeId === 'B')!.depth).toBe(1);
    expect(result.nodes.find((n) => n.nodeId === 'C')!.depth).toBe(2);
  });
});
