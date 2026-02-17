import type { Graph, GraphNode, GraphEdge, NodeType, NodeLayer } from '../../src/types/graph';

/**
 * Build a minimal Graph with source nodes and import edges.
 * Each nodeId becomes a source node in the 'shared' layer.
 * Each edge tuple [source, target] becomes an import edge (source imports target).
 */
export function buildGraph(
  nodeIds: string[],
  edges: [string, string][],
): Graph {
  const nodes: GraphNode[] = nodeIds.map((id) => ({
    id,
    label: id.split('/').pop() ?? id,
    layer: 'shared' as NodeLayer,
    type: 'source' as NodeType,
    functions: [],
    depth: 0,
    layerIndex: 0,
    fanIn: 0,
    size: 30,
  }));

  const graphEdges: GraphEdge[] = edges.map(([source, target]) => ({
    source,
    target,
    type: 'import' as const,
  }));

  return { nodes, edges: graphEdges };
}

/**
 * Build a Graph where some nodes are tests and some are sources.
 * Test nodes get type='test' and layer='test'.
 */
export function buildGraphWithTests(
  sourceIds: string[],
  testIds: string[],
  edges: [string, string][],
): Graph {
  const sourceNodes: GraphNode[] = sourceIds.map((id) => ({
    id,
    label: id.split('/').pop() ?? id,
    layer: 'shared' as NodeLayer,
    type: 'source' as NodeType,
    functions: [],
    depth: 0,
    layerIndex: 0,
    fanIn: 0,
    size: 30,
  }));

  const testNodes: GraphNode[] = testIds.map((id) => ({
    id,
    label: id.split('/').pop() ?? id,
    layer: 'test' as NodeLayer,
    type: 'test' as NodeType,
    functions: [],
    depth: 0,
    layerIndex: -1,
    fanIn: 0,
    size: 30,
  }));

  const graphEdges: GraphEdge[] = edges.map(([source, target]) => ({
    source,
    target,
    type: 'import' as const,
  }));

  return { nodes: [...sourceNodes, ...testNodes], edges: graphEdges };
}
