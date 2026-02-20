import type cytoscape from 'cytoscape';

/**
 * Clears all group focus mode classes.
 */
export function clearFocusMode(instance: cytoscape.Core): void {
  instance.nodes('[type="group"]').removeClass('group-focused group-dimmed');
  instance.nodes().not('[type="group"]').removeClass('group-faded');
  instance.edges().removeClass('group-faded');
}

/** Currently locked (expanded) hub node ID, or null. */
let lockedHubId: string | null = null;

/** Collapse a hub: hide its edges, update label. */
function collapseHub(instance: cytoscape.Core, nodeId: string): void {
  const node = instance.getElementById(nodeId) as cytoscape.NodeSingular;
  if (!node.length || !node.hasClass('hub')) return;
  node.connectedEdges().forEach((e: cytoscape.EdgeSingular) => {
    e.removeClass('hub-edge-preview hub-edge-locked');
    e.addClass('hub-edge-hidden');
  });
  // Restore original label (remove " (pinned)" suffix)
  const label = node.data('hubLabel') as string;
  if (label?.includes(' (pinned)')) {
    node.data('hubLabel', label.replace(' (pinned)', ''));
  }
}

/** Check if impact mode is active. */
function isImpactActive(instance: cytoscape.Core): boolean {
  return instance.nodes('.impact-root').length > 0;
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

    // Hub click — toggle lock
    if (node.hasClass('hub') && !isImpactActive(instance)) {
      if (lockedHubId === node.id()) {
        // Clicking locked hub → collapse
        collapseHub(instance, node.id());
        lockedHubId = null;
        return;
      }
      // Collapse previous locked hub
      if (lockedHubId) {
        collapseHub(instance, lockedHubId);
      }
      // Lock this hub
      lockedHubId = node.id();
      node.connectedEdges().forEach((e: cytoscape.EdgeSingular) => {
        e.removeClass('hub-edge-hidden hub-edge-preview');
        e.addClass('hub-edge-locked');
      });
      // Update label to show pinned state
      const label = node.data('hubLabel') as string;
      if (label && !label.includes('(pinned)')) {
        node.data('hubLabel', label + ' (pinned)');
      }
      return;
    }

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
      // Collapse any locked hub
      if (lockedHubId) {
        collapseHub(instance, lockedHubId);
        lockedHubId = null;
      }

      const hadFocus = instance.nodes('.selected-node, .group-focused').length > 0;
      instance.elements().removeClass('selected-node selected-neighbor selected-connected selected-dimmed');
      clearFocusMode(instance);  // Resets to Level 1 (collapses aggregation)
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

    // Hub hover preview (skip during impact mode)
    if (node.hasClass('hub') && !isImpactActive(instance)) {
      // Show connected edges as preview
      node.connectedEdges().forEach((e: cytoscape.EdgeSingular) => {
        if (e.hasClass('hub-edge-hidden')) {
          e.removeClass('hub-edge-hidden');
          e.addClass('hub-edge-preview');
        }
      });
    }

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

    // Restore hub edge hiding on mouseout (unless locked)
    const mouseOutNode = evt.target as cytoscape.NodeSingular;
    if (mouseOutNode.hasClass('hub') && mouseOutNode.id() !== lockedHubId) {
      mouseOutNode.connectedEdges().forEach((e: cytoscape.EdgeSingular) => {
        if (e.hasClass('hub-edge-preview')) {
          e.removeClass('hub-edge-preview');
          e.addClass('hub-edge-hidden');
        }
      });
    }

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

/**
 * Clears all hub disclosure state — collapses locked hub, removes preview classes.
 * Called when impact mode activates.
 */
export function clearHubState(instance: cytoscape.Core): void {
  if (lockedHubId) {
    collapseHub(instance, lockedHubId);
    lockedHubId = null;
  }
  instance.edges('.hub-edge-preview').removeClass('hub-edge-preview').addClass('hub-edge-hidden');
}

/**
 * Restores hub edge hiding on all hub nodes.
 * Called when impact mode clears.
 */
export function restoreHubEdges(instance: cytoscape.Core): void {
  instance.nodes('.hub').forEach((hubNode: cytoscape.NodeSingular) => {
    hubNode.connectedEdges().forEach((e: cytoscape.EdgeSingular) => {
      e.removeClass('hub-edge-preview hub-edge-locked');
      e.addClass('hub-edge-hidden');
    });
  });
  lockedHubId = null;
}
