import type cytoscape from 'cytoscape';

/**
 * Clears all group focus mode classes from the Cytoscape instance.
 */
export function clearFocusMode(instance: cytoscape.Core): void {
  instance.nodes('[type="group"]').removeClass('group-focused group-dimmed');
  instance.nodes().not('[type="group"]').removeClass('group-faded');
  instance.edges().removeClass('group-faded');
}

/**
 * Selects a node and shows its full transitive dependency chain.
 * Dims everything outside the chain.
 */
function selectNodeChain(instance: cytoscape.Core, node: cytoscape.NodeSingular): void {
  clearFocusMode(instance);
  instance.elements().removeClass('selected-node selected-neighbor selected-connected selected-dimmed');

  node.addClass('selected-node');

  // Full transitive chain: upstream (importers) + downstream (imports)
  const downstream = node.successors();
  const upstream = node.predecessors();
  const chain = downstream.union(upstream);

  const chainNodes = chain.nodes().not('[type="group"]');
  const chainEdges = chain.edges();

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

  return;
}

/**
 * Adaptive zoom: fit chain if readable, otherwise center on the node.
 */
function animateToChain(instance: cytoscape.Core, node: cytoscape.NodeSingular, chainEles: cytoscape.Collection): void {
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

/**
 * Binds all interaction event handlers to a Cytoscape instance.
 * Returns a cleanup function (not currently needed since cy.destroy() handles it).
 */
export function bindGraphInteractions(
  instance: cytoscape.Core,
  emitNodeClick: (nodeId: string) => void,
  emitContextMenu: (x: number, y: number, nodeId: string, nodeLabel: string) => void,
): void {
  // Click node — focus mode: show full transitive dependency chain
  instance.on('tap', 'node', (evt) => {
    if (evt.target.data('type') === 'group') return;
    const node = evt.target as cytoscape.NodeSingular;
    selectNodeChain(instance, node);

    // Animate to the chain
    const downstream = node.successors();
    const upstream = node.predecessors();
    const chain = downstream.union(upstream);
    const chainNodes = chain.nodes().not('[type="group"]');
    const chainEdges = chain.edges();
    const chainEles = node.union(chainNodes).union(chainEdges);
    animateToChain(instance, node, chainEles);

    emitNodeClick(node.id());
  });

  // Click group — focus mode: dim everything else, zoom in
  instance.on('tap', 'node[type="group"]', (evt) => {
    const target = evt.target as cytoscape.NodeSingular;

    // Toggle off if already focused
    if (target.hasClass('group-focused')) {
      clearFocusMode(instance);
      instance.animate({
        fit: { eles: instance.elements(), padding: 40 },
        duration: 400,
        easing: 'ease-out-cubic',
      });
      return;
    }

    // Focus this group — also clear node selection
    clearFocusMode(instance);
    instance.elements().removeClass('selected-node selected-neighbor selected-connected selected-dimmed');
    target.addClass('group-focused');

    // Children of focused group (recursive — includes nested subgroups)
    const children = target.descendants();

    // Dim other groups, but NOT subgroups inside the focused parent
    const childGroupIds = new Set(children.filter('[type="group"]').map((n: cytoscape.NodeSingular) => n.id()));
    instance.nodes('[type="group"]').forEach((g: cytoscape.NodeSingular) => {
      if (g.id() !== target.id() && !childGroupIds.has(g.id())) {
        g.addClass('group-dimmed');
      }
    });
    const childIds = new Set(children.map((n: cytoscape.NodeSingular) => n.id()));

    // Dim non-member nodes
    instance.nodes().not('[type="group"]').forEach((n: cytoscape.NodeSingular) => {
      if (!childIds.has(n.id())) n.addClass('group-faded');
    });

    // Dim unrelated edges
    instance.edges().forEach((e: cytoscape.EdgeSingular) => {
      const connected = childIds.has(e.source().id()) || childIds.has(e.target().id());
      if (!connected) e.addClass('group-faded');
    });

    // Zoom to fit the group
    const groupEles = children.add(target);
    instance.animate({
      fit: { eles: groupEles, padding: 60 },
      duration: 400,
      easing: 'ease-out-cubic',
    });
  });

  // Click background — clear all focus modes, zoom back to full graph
  instance.on('tap', (evt) => {
    if (evt.target === instance) {
      const hadFocus = instance.nodes('.selected-node, .group-focused').length > 0;
      instance.elements().removeClass('selected-node selected-neighbor selected-connected selected-dimmed');
      clearFocusMode(instance);
      if (hadFocus) {
        instance.animate({
          fit: { eles: instance.elements(), padding: 40 },
          duration: 400,
          easing: 'ease-out-cubic',
        });
      }
    }
  });

  // Right-click node — context menu for break simulation
  instance.on('cxttap', 'node', (evt) => {
    if (evt.target.data('type') === 'group') return;
    const node = evt.target as cytoscape.NodeSingular;
    const pos = evt.renderedPosition;
    emitContextMenu(pos.x, pos.y, node.id(), node.data('label'));
  });

  // Hover focus: 3-tier dim model (skip during impact analysis)
  instance.on('mouseover', 'node', (evt) => {
    const node = evt.target as cytoscape.NodeSingular;
    if (node.data('type') === 'group') return;
    // Impact mode — use additive hover (don't override impact colors)
    if (instance.nodes('.impact-root').length > 0) {
      node.addClass('impact-hover');
      return;
    }
    if (instance.nodes('.selected-node').length > 0) return;

    // Tier 3: dim everything
    instance.nodes().addClass('hover-dimmed');
    instance.edges().addClass('hover-dimmed');

    // Tier 1: focus node
    node.removeClass('hover-dimmed').addClass('hover-focus');

    // Tier 2: connected neighbors + edges
    const neighbors = node.neighborhood('node').not('[type="group"]');
    neighbors.removeClass('hover-dimmed').addClass('hover-neighbor');
    node.connectedEdges().removeClass('hover-dimmed').addClass('hover-connected');

    // Keep all ancestor groups of visible nodes visible
    node.union(neighbors).forEach((n: cytoscape.NodeSingular) => {
      let parent = n.parent();
      while (parent.length) {
        parent.removeClass('hover-dimmed');
        parent = parent.parent();
      }
    });
  });

  instance.on('mouseout', 'node', (evt) => {
    if (evt.target.data('type') === 'group') return;
    instance.elements().removeClass('hover-focus hover-neighbor hover-dimmed hover-connected impact-hover');
  });
}

/**
 * Programmatically focuses a node and shows its transitive chain.
 * Used by external callers (e.g., search results, path trace).
 */
export function focusNode(instance: cytoscape.Core, nodeId: string): void {
  const node = instance.getElementById(nodeId) as cytoscape.NodeSingular;
  if (!node.length) return;

  selectNodeChain(instance, node);

  instance.animate({
    center: { eles: node },
    zoom: Math.max(instance.zoom(), 1.2),
    duration: 400,
    easing: 'ease-out-cubic',
  });
}
