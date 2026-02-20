import { describe, it, expect } from 'vitest';
import { buildElements } from '../../src/ui/utils/buildCytoscapeElements';
import type { Graph } from '../../src/types/graph';

describe('buildElements aggregate edges', () => {
  const graph: Graph = {
    nodes: [
      { id: 'src/a/foo.ts', label: 'foo.ts', layer: 'feature', type: 'source', functions: [], depth: 1, layerIndex: 1, fanIn: 0, size: 30 },
      { id: 'src/a/bar.ts', label: 'bar.ts', layer: 'feature', type: 'source', functions: [], depth: 1, layerIndex: 1, fanIn: 0, size: 30 },
      { id: 'src/b/baz.ts', label: 'baz.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 2, size: 30 },
      { id: 'src/b/qux.ts', label: 'qux.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 1, size: 30 },
    ],
    edges: [
      { source: 'src/a/foo.ts', target: 'src/b/baz.ts', type: 'import' },
      { source: 'src/a/bar.ts', target: 'src/b/baz.ts', type: 'import' },
      { source: 'src/a/foo.ts', target: 'src/b/qux.ts', type: 'import' },
    ],
    groups: [
      { id: 'group-a', label: 'A', nodeIds: ['src/a/foo.ts', 'src/a/bar.ts'], centralNodeId: 'src/a/foo.ts', level: 0 },
      { id: 'group-b', label: 'B', nodeIds: ['src/b/baz.ts', 'src/b/qux.ts'], centralNodeId: 'src/b/baz.ts', level: 0 },
    ],
  };

  it('outputs aggregate edges with correct count', () => {
    const elements = buildElements(graph, {
      showTests: true, showFoundation: true, sizeMode: 'fanIn', layoutMode: 'cose',
    });

    const aggEdges = elements.filter(el =>
      el.data.edgeType === 'aggregate'
    );

    expect(aggEdges.length).toBe(1); // group-a -> group-b
    const agg = aggEdges[0];
    expect(agg.data.source).toBe('group-a');
    expect(agg.data.target).toBe('group-b');
    expect(agg.data.count).toBe(3); // 3 real edges cross the boundary
    expect(agg.data.label).toBe('3');
  });

  it('does NOT create aggregate edge for intra-group edges', () => {
    const graphWithIntra: Graph = {
      ...graph,
      edges: [
        ...graph.edges,
        { source: 'src/a/foo.ts', target: 'src/a/bar.ts', type: 'import' }, // intra-group
      ],
    };
    const elements = buildElements(graphWithIntra, {
      showTests: true, showFoundation: true, sizeMode: 'fanIn', layoutMode: 'cose',
    });

    const aggEdges = elements.filter(el => el.data.edgeType === 'aggregate');
    // Only group-a -> group-b, no intra-group aggregate
    expect(aggEdges.length).toBe(1);
  });

  it('creates aggregate edge from ungrouped node to group', () => {
    const graphUngrouped: Graph = {
      nodes: [
        ...graph.nodes,
        { id: 'src/main.ts', label: 'main.ts', layer: 'page', type: 'source', functions: [], depth: 2, layerIndex: 2, fanIn: 0, size: 30 },
      ],
      edges: [
        { source: 'src/main.ts', target: 'src/a/foo.ts', type: 'import' },
      ],
      groups: graph.groups,
    };
    const elements = buildElements(graphUngrouped, {
      showTests: true, showFoundation: true, sizeMode: 'fanIn', layoutMode: 'cose',
    });

    const aggEdges = elements.filter(el => el.data.edgeType === 'aggregate');
    const mainToA = aggEdges.find(e =>
      e.data.source === 'src/main.ts' && e.data.target === 'group-a'
    );
    expect(mainToA).toBeDefined();
    expect(mainToA!.data.count).toBe(1);
  });

  it('aggregate edges have classes property set to aggregate-edge', () => {
    const elements = buildElements(graph, {
      showTests: true, showFoundation: true, sizeMode: 'fanIn', layoutMode: 'cose',
    });

    const aggEdges = elements.filter(el => el.data.edgeType === 'aggregate');
    for (const agg of aggEdges) {
      expect(agg.classes).toBe('aggregate-edge');
    }
  });
});
