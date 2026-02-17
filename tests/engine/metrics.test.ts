import { describe, it, expect } from 'vitest';
import { computeVisualMetrics } from '../../src/engine/metrics.js';
import { buildGraph, buildGraphWithTests } from './helpers.js';

describe('computeVisualMetrics', () => {
  it('computes correct fanIn for each node', () => {
    // A imports B, C imports B  =>  B has fanIn=2, A has fanIn=0, C has fanIn=0
    const graph = buildGraph(['A', 'B', 'C'], [
      ['A', 'B'],
      ['C', 'B'],
    ]);
    computeVisualMetrics(graph);

    const nodeB = graph.nodes.find((n) => n.id === 'B')!;
    const nodeA = graph.nodes.find((n) => n.id === 'A')!;
    const nodeC = graph.nodes.find((n) => n.id === 'C')!;

    expect(nodeB.fanIn).toBe(2);
    expect(nodeA.fanIn).toBe(0);
    expect(nodeC.fanIn).toBe(0);
  });

  it('computes depth based on longest import path', () => {
    // A imports B, B imports C  =>  C is a leaf (depth 0), B depends on C (depth 1), A depends on B (depth 2)
    const graph = buildGraph(['A', 'B', 'C'], [
      ['A', 'B'],
      ['B', 'C'],
    ]);
    computeVisualMetrics(graph);

    const nodeA = graph.nodes.find((n) => n.id === 'A')!;
    const nodeB = graph.nodes.find((n) => n.id === 'B')!;
    const nodeC = graph.nodes.find((n) => n.id === 'C')!;

    expect(nodeC.depth).toBe(0);
    expect(nodeB.depth).toBe(1);
    expect(nodeA.depth).toBe(2);
  });

  it('test nodes always get depth 0 and layerIndex -1', () => {
    const graph = buildGraphWithTests(['A', 'B'], ['T1'], [
      ['T1', 'A'],
      ['A', 'B'],
    ]);
    computeVisualMetrics(graph);

    const testNode = graph.nodes.find((n) => n.id === 'T1')!;
    expect(testNode.depth).toBe(0);
    expect(testNode.layerIndex).toBe(-1);
  });

  it('size scales logarithmically with fanIn', () => {
    // D is imported by A, B, C (fanIn=3). E has fanIn=0.
    const graph = buildGraph(['A', 'B', 'C', 'D', 'E'], [
      ['A', 'D'],
      ['B', 'D'],
      ['C', 'D'],
    ]);
    computeVisualMetrics(graph);

    const nodeD = graph.nodes.find((n) => n.id === 'D')!;
    const nodeE = graph.nodes.find((n) => n.id === 'E')!;

    // size = 30 + log2(fanIn + 1) * 12
    // fanIn=3: 30 + log2(4)*12 = 30 + 24 = 54
    // fanIn=0: 30 + log2(1)*12 = 30 + 0 = 30
    expect(nodeD.size).toBe(Math.round(30 + Math.log2(4) * 12));
    expect(nodeE.size).toBe(30);
  });

  it('layerIndex buckets depths into 0-3 range', () => {
    // Create a deep chain: A->B->C->D->E
    // Depths: E=0, D=1, C=2, B=3, A=4
    // maxDepth=4, bucketSize=ceil(4/4)=1
    // layerIndex = min(3, floor(depth / 1))
    const graph = buildGraph(['A', 'B', 'C', 'D', 'E'], [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
      ['D', 'E'],
    ]);
    computeVisualMetrics(graph);

    const nodeA = graph.nodes.find((n) => n.id === 'A')!;
    const nodeE = graph.nodes.find((n) => n.id === 'E')!;

    expect(nodeE.layerIndex).toBe(0);
    // A has depth 4, bucketSize=1, floor(4/1)=4, min(3,4)=3
    expect(nodeA.layerIndex).toBe(3);
  });

  it('isolated nodes get depth 0 and fanIn 0', () => {
    const graph = buildGraph(['A', 'B', 'C'], []);
    computeVisualMetrics(graph);

    for (const node of graph.nodes) {
      expect(node.depth).toBe(0);
      expect(node.fanIn).toBe(0);
      expect(node.size).toBe(30);
      expect(node.layerIndex).toBe(0);
    }
  });

  it('handles cycles without infinite loop', () => {
    // A->B->C->A (cycle)
    const graph = buildGraph(['A', 'B', 'C'], [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'A'],
    ]);

    // Should complete without hanging
    computeVisualMetrics(graph);

    // All nodes in the same SCC, so they get the same depth
    const nodeA = graph.nodes.find((n) => n.id === 'A')!;
    const nodeB = graph.nodes.find((n) => n.id === 'B')!;
    const nodeC = graph.nodes.find((n) => n.id === 'C')!;

    // All in one SCC with no external dependencies => depth 0
    expect(nodeA.depth).toBe(0);
    expect(nodeB.depth).toBe(0);
    expect(nodeC.depth).toBe(0);
  });

  it('node count matches input graph', () => {
    const graph = buildGraph(['A', 'B', 'C', 'D'], [
      ['A', 'B'],
      ['C', 'D'],
    ]);
    computeVisualMetrics(graph);
    expect(graph.nodes).toHaveLength(4);
  });

  it('edge count is unchanged after computing metrics', () => {
    const graph = buildGraph(['A', 'B', 'C'], [
      ['A', 'B'],
      ['B', 'C'],
    ]);
    computeVisualMetrics(graph);
    expect(graph.edges).toHaveLength(2);
  });
});
