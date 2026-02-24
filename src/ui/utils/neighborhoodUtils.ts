/**
 * BFS neighborhood and chain selection utilities for Cytoscape graphs.
 */
import type cytoscape from 'cytoscape';

/**
 * BFS neighborhood at given depth. depth=0 means all (full transitive).
 */
export function getNeighborhood(
  instance: cytoscape.Core,
  node: cytoscape.NodeSingular,
  depth: number,
): { nodes: cytoscape.Collection; edges: cytoscape.Collection } {
  if (depth === 0) {
    const downstream = node.successors();
    const upstream = node.predecessors();
    const chain = downstream.union(upstream);
    return {
      nodes: chain.nodes().not('[type="group"]'),
      edges: chain.edges(),
    };
  }

  // BFS up to N hops in both directions
  const visited = new Set<string>([node.id()]);
  let frontier: cytoscape.NodeSingular[] = [node];

  for (let i = 0; i < depth; i++) {
    const nextFrontier: cytoscape.NodeSingular[] = [];
    for (const n of frontier) {
      n.connectedEdges().forEach((e: cytoscape.EdgeSingular) => {
        const otherId = e.source().id() === n.id() ? e.target().id() : e.source().id();
        if (!visited.has(otherId)) {
          const other = instance.getElementById(otherId) as cytoscape.NodeSingular;
          if (other.length && other.data('type') !== 'group') {
            visited.add(otherId);
            nextFrontier.push(other);
          }
        }
      });
    }
    frontier = nextFrontier;
  }

  // Include edges between ALL visited nodes
  const finalEdges = instance.collection();
  instance.edges().forEach((e: cytoscape.EdgeSingular) => {
    if (visited.has(e.source().id()) && visited.has(e.target().id())) {
      finalEdges.merge(e);
    }
  });

  let neighborNodes = instance.collection();
  visited.forEach((id) => {
    if (id !== node.id()) {
      const n = instance.getElementById(id);
      if (n.length) neighborNodes = neighborNodes.union(n);
    }
  });

  return { nodes: neighborNodes, edges: finalEdges };
}

/**
 * Selects a node and shows its dependency chain at a given depth.
 * Dims everything outside the chain.
 */
export function selectNodeChain(
  instance: cytoscape.Core,
  node: cytoscape.NodeSingular,
  depth: number,
  clearFocusMode: (inst: cytoscape.Core) => void,
): void {
  clearFocusMode(instance);
  instance.elements().removeClass('selected-node selected-neighbor selected-connected selected-dimmed');

  node.addClass('selected-node');

  const { nodes: chainNodes, edges: chainEdges } = getNeighborhood(instance, node, depth);
  chainNodes.addClass('selected-neighbor');
  chainEdges.addClass('selected-connected');

  // Build focus set for quick lookup
  const focusNodeIds = new Set<string>();
  focusNodeIds.add(node.id());
  chainNodes.forEach((n: cytoscape.NodeSingular) => focusNodeIds.add(n.id()));

  // Dim everything outside the chain
  const focusNodes = node.union(chainNodes);
  instance.nodes().not(focusNodes).not('[type="group"]').addClass('selected-dimmed');
  instance.edges().not(chainEdges).addClass('selected-dimmed');

  // Dim groups with no descendants in the chain
  instance.nodes('[type="group"]').forEach((g: cytoscape.NodeSingular) => {
    const descendants = g.descendants().not('[type="group"]');
    const hasChainMember = descendants.some((child: cytoscape.NodeSingular) => focusNodeIds.has(child.id()));
    if (!hasChainMember) g.addClass('selected-dimmed');
  });
}

/**
 * Adaptive zoom: fit chain if readable, otherwise center on the node.
 */
export function animateToChain(
  instance: cytoscape.Core,
  node: cytoscape.NodeSingular,
  chainEles: cytoscape.Collection,
): void {
  const bb = chainEles.boundingBox();
  const pad = 100;
  const fitZoom = Math.min(
    (instance.width() - 2 * pad) / bb.w,
    (instance.height() - 2 * pad) / bb.h,
  );

  if (fitZoom >= 0.5) {
    instance.animate({
      fit: { eles: chainEles, padding: pad },
      duration: 400,
      easing: 'ease-out-cubic',
    });
  } else {
    instance.animate({
      center: { eles: node },
      zoom: 0.6,
      duration: 400,
      easing: 'ease-out-cubic',
    });
  }
}
