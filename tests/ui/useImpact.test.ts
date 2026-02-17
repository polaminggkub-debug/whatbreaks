import { describe, it, expect } from 'vitest';
import { tracePath, getEdgeRelation } from '../../src/ui/composables/useImpact.js';
import type { Graph, GraphNode, GraphEdge, NodeLayer, NodeType } from '../../src/types/graph.js';

/** Build a minimal Graph for path/edge tests. */
function buildGraph(
  nodeIds: string[],
  edges: [string, string, 'import' | 'test-covers'][],
): Graph {
  const nodes: GraphNode[] = nodeIds.map((id) => ({
    id,
    label: id,
    layer: 'shared' as NodeLayer,
    type: 'source' as NodeType,
    functions: [],
    depth: 0,
    layerIndex: 0,
    fanIn: 0,
    size: 30,
  }));

  const graphEdges: GraphEdge[] = edges.map(([source, target, type]) => ({
    source,
    target,
    type,
  }));

  return { nodes, edges: graphEdges };
}

describe('tracePath', () => {
  it('A->B->C chain: trace from A to C returns [A, B, C]', () => {
    const graph = buildGraph(
      ['A', 'B', 'C'],
      [['A', 'B', 'import'], ['B', 'C', 'import']],
    );
    const path = tracePath(graph, 'A', 'C');
    expect(path).toEqual(['A', 'B', 'C']);
  });

  it('no path exists returns empty array', () => {
    // A->B and C->D are disconnected components
    const graph = buildGraph(
      ['A', 'B', 'C', 'D'],
      [['A', 'B', 'import'], ['C', 'D', 'import']],
    );
    const path = tracePath(graph, 'A', 'D');
    expect(path).toEqual([]);
  });

  it('direct neighbors returns [A, B]', () => {
    const graph = buildGraph(
      ['A', 'B'],
      [['A', 'B', 'import']],
    );
    const path = tracePath(graph, 'A', 'B');
    expect(path).toEqual(['A', 'B']);
  });

  it('same node returns [A]', () => {
    const graph = buildGraph(
      ['A', 'B'],
      [['A', 'B', 'import']],
    );
    const path = tracePath(graph, 'A', 'A');
    expect(path).toEqual(['A']);
  });

  it('traverses edges in reverse direction (undirected BFS)', () => {
    // Edge is A->B, but BFS is undirected so B->A should also work
    const graph = buildGraph(
      ['A', 'B', 'C'],
      [['B', 'A', 'import'], ['B', 'C', 'import']],
    );
    const path = tracePath(graph, 'A', 'C');
    expect(path).toEqual(['A', 'B', 'C']);
  });

  it('picks shortest path when multiple exist', () => {
    // A->B->C->D and A->D (shortcut)
    const graph = buildGraph(
      ['A', 'B', 'C', 'D'],
      [
        ['A', 'B', 'import'],
        ['B', 'C', 'import'],
        ['C', 'D', 'import'],
        ['A', 'D', 'import'],
      ],
    );
    const path = tracePath(graph, 'A', 'D');
    // BFS finds shortest: [A, D]
    expect(path).toEqual(['A', 'D']);
  });
});

describe('getEdgeRelation', () => {
  it('import edge forward returns "imports"', () => {
    const graph = buildGraph(
      ['A', 'B'],
      [['A', 'B', 'import']],
    );
    const relation = getEdgeRelation(graph, 'A', 'B');
    expect(relation).toBe('imports');
  });

  it('import edge reverse returns "imported by"', () => {
    const graph = buildGraph(
      ['A', 'B'],
      [['A', 'B', 'import']],
    );
    const relation = getEdgeRelation(graph, 'B', 'A');
    expect(relation).toBe('imported by');
  });

  it('test-covers edge forward returns "tests"', () => {
    const graph = buildGraph(
      ['T', 'A'],
      [['T', 'A', 'test-covers']],
    );
    const relation = getEdgeRelation(graph, 'T', 'A');
    expect(relation).toBe('tests');
  });

  it('test-covers edge reverse returns "tested by"', () => {
    const graph = buildGraph(
      ['T', 'A'],
      [['T', 'A', 'test-covers']],
    );
    const relation = getEdgeRelation(graph, 'A', 'T');
    expect(relation).toBe('tested by');
  });

  it('no edge between nodes returns "connects to"', () => {
    const graph = buildGraph(
      ['A', 'B', 'C'],
      [['A', 'B', 'import']],
    );
    const relation = getEdgeRelation(graph, 'A', 'C');
    expect(relation).toBe('connects to');
  });

  it('empty graph returns "connects to"', () => {
    const graph = buildGraph(['A', 'B'], []);
    const relation = getEdgeRelation(graph, 'A', 'B');
    expect(relation).toBe('connects to');
  });
});
