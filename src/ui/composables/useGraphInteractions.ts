import type cytoscape from 'cytoscape';
import { expandGroup, collapseGroup, getCollapsedGroups } from './useGroupCollapse.js';
import {
  showGroupTooltip,
  hideGroupTooltip,
  showEdgeTooltip,
  hideEdgeTooltip,
} from '../utils/tooltipUtils.js';
import {
  getNeighborhood,
  selectNodeChain,
  animateToChain,
} from '../utils/neighborhoodUtils.js';

/** State for the current focus mode */
export interface FocusState {
  nodeId: string | null;
  nodeLabel: string;
  depth: number;
}

let currentFocusState: FocusState = { nodeId: null, nodeLabel: '', depth: 1 };
let onFocusChange: ((state: FocusState) => void) | null = null;

export function getFocusState(): FocusState {
  return { ...currentFocusState };
}

export function setFocusChangeCallback(cb: (state: FocusState) => void): void {
  onFocusChange = cb;
}

function notifyFocusChange(): void {
  onFocusChange?.({ ...currentFocusState });
}

export function clearFocusState(): void {
  currentFocusState = { nodeId: null, nodeLabel: '', depth: 1 };
  notifyFocusChange();
}

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
 * Sets the focus depth and re-applies the chain highlight.
 */
export function setFocusDepth(instance: cytoscape.Core, depth: number): void {
  if (!currentFocusState.nodeId) return;
  const node = instance.getElementById(currentFocusState.nodeId) as cytoscape.NodeSingular;
  if (!node.length) return;
  currentFocusState.depth = depth;
  selectNodeChain(instance, node, depth, clearFocusMode);

  // Animate to the new chain
  const { nodes: chainNodes, edges: chainEdges } = getNeighborhood(instance, node, depth);
  const chainEles = node.union(chainNodes).union(chainEdges);
  animateToChain(instance, node, chainEles);

  notifyFocusChange();
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
  // Click node — focus mode: show dependency chain at current depth
  instance.on('tap', 'node', (evt) => {
    if (evt.target.data('type') === 'group') return;
    const node = evt.target as cytoscape.NodeSingular;

    // Hub click — toggle lock
    if (node.hasClass('hub') && !isImpactActive(instance)) {
      if (lockedHubId === node.id()) {
        // Clicking locked hub -> collapse
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

    // Set focus state with default depth=1
    currentFocusState = {
      nodeId: node.id(),
      nodeLabel: node.data('label') || node.id(),
      depth: 1,
    };

    selectNodeChain(instance, node, 1, clearFocusMode);

    // Animate to the depth-limited chain
    const { nodes: chainNodes, edges: chainEdges } = getNeighborhood(instance, node, 1);
    const chainEles = node.union(chainNodes).union(chainEdges);
    animateToChain(instance, node, chainEles);

    notifyFocusChange();
    emitNodeClick(node.id());
  });

  // Click group — collapsed: expand. Expanded: focus mode. Right-click: collapse.
  instance.on('tap', 'node[type="group"]', (evt) => {
    const target = evt.target as cytoscape.NodeSingular;
    const groupId = target.id();

    // Collapsed group -> expand on click
    if (target.hasClass('group-collapsed')) {
      expandGroup(instance, groupId);
      return;
    }

    // Expanded group -> existing focus mode toggle
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
    clearFocusState();
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

  // Right-click group — collapse expanded group (level-0 or promoted subgroups)
  instance.on('cxttap', 'node[type="group"]', (evt) => {
    const target = evt.target as cytoscape.NodeSingular;
    if (!target.hasClass('group-collapsed')) {
      // Allow collapse for top-level groups OR promoted subgroups (no parent in graph)
      const isTopLevel = target.data('level') === 0 || !target.data('parentGroupId');
      const isPromoted = target.data('parent') == null;
      if (isTopLevel || isPromoted) {
        collapseGroup(instance, target.id());
      }
    }
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
      clearFocusState();
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

  // Group hover — show "right-click to collapse" tooltip on expanded groups
  instance.on('mouseover', 'node[type="group"]', (evt) => {
    const group = evt.target as cytoscape.NodeSingular;
    if (group.hasClass('group-collapsed')) return;
    const rendered = evt.renderedPosition;
    const container = instance.container();
    if (container) {
      const rect = container.getBoundingClientRect();
      showGroupTooltip(rect.left + rendered.x, rect.top + rendered.y);
    }
  });

  instance.on('mouseout', 'node[type="group"]', () => {
    hideGroupTooltip();
  });

  // Hover focus: 3-tier dim model (skip during impact analysis)
  instance.on('mouseover', 'node', (evt) => {
    const node = evt.target as cytoscape.NodeSingular;
    // Show pointer cursor for interactive nodes
    const container = instance.container();
    if (container) container.style.cursor = 'pointer';
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
    // Restore grab cursor when leaving node
    const container = instance.container();
    if (container) container.style.cursor = 'grab';
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

  // Aggregate edge hover — show tooltip with import count
  instance.on('mouseover', 'edge.aggregate-edge.aggregate-visible', (evt) => {
    const container = instance.container();
    if (container) container.style.cursor = 'pointer';
    const edge = evt.target as cytoscape.EdgeSingular;
    const count = edge.data('count') || 1;
    const srcNode = instance.getElementById(edge.data('source'));
    const tgtNode = instance.getElementById(edge.data('target'));
    const srcLabel = srcNode.data('label') || edge.data('source');
    const tgtLabel = tgtNode.data('label') || edge.data('target');
    const text = `${count} import${count !== 1 ? 's' : ''} from ${srcLabel} → ${tgtLabel}`;
    if (container) {
      const rect = container.getBoundingClientRect();
      const pos = evt.renderedPosition;
      showEdgeTooltip(rect.left + pos.x, rect.top + pos.y, text);
    }
  });

  instance.on('mouseout', 'edge.aggregate-edge.aggregate-visible', () => {
    const container = instance.container();
    if (container) container.style.cursor = 'grab';
    hideEdgeTooltip();
  });
}

/**
 * Programmatically focuses a node and shows its dependency chain.
 * Used by external callers (e.g., search results, path trace).
 */
export function focusNode(instance: cytoscape.Core, nodeId: string): void {
  const node = instance.getElementById(nodeId) as cytoscape.NodeSingular;
  if (!node.length) return;

  currentFocusState = {
    nodeId: node.id(),
    nodeLabel: node.data('label') || node.id(),
    depth: 1,
  };

  selectNodeChain(instance, node, 1, clearFocusMode);
  notifyFocusChange();

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
