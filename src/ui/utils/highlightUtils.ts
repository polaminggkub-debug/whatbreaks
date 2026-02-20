import type cytoscape from 'cytoscape';
import type { FailingResult, RefactorResult } from '../../types/graph.js';
import { clearFocusMode, clearHubState, restoreHubEdges } from '../composables/useGraphInteractions.js';
import { expandGroupsForImpact, restoreGroupsAfterImpact } from '../composables/useGroupCollapse.js';

/**
 * Applies impact highlight styling to the graph based on analysis results.
 * Handles both 'failing' and 'refactor' mode results.
 */
export function applyHighlight(
  instance: cytoscape.Core,
  result: FailingResult | RefactorResult | null,
  startEdgeAnimation: () => void,
  stopEdgeAnimation: () => void,
): void {
  stopEdgeAnimation();
  clearFocusMode(instance);
  clearHubState(instance);
  // Strip all hub-edge classes so impact classification takes over
  instance.edges('.hub-edge-hidden, .hub-edge-preview, .hub-edge-locked')
    .removeClass('hub-edge-hidden hub-edge-preview hub-edge-locked');

  instance.nodes().removeClass('impact-root impact-direct impact-indirect impact-unaffected impact-group-visible selected-neighbor');
  instance.edges().removeClass('impact-path impact-path-indirect impact-unaffected selected-connected');

  if (!result) {
    restoreGroupsAfterImpact(instance);
    restoreHubEdges(instance);
    return;
  }

  const affectedNodeIds = new Set<string>();

  if (result.mode === 'failing') {
    classifyFailingNodes(instance, result as FailingResult, affectedNodeIds);
  } else {
    classifyRefactorNodes(instance, result as RefactorResult, affectedNodeIds);
  }

  // Auto-expand collapsed groups containing affected nodes
  expandGroupsForImpact(instance, affectedNodeIds);

  // Mark unaffected nodes
  instance.nodes().forEach((n: cytoscape.NodeSingular) => {
    if (!affectedNodeIds.has(n.id())) {
      n.addClass('impact-unaffected');
    }
  });

  // Keep groups visible if they contain any affected nodes
  instance.nodes('[type="group"]').forEach((g: cytoscape.NodeSingular) => {
    const descendants = g.descendants().not('[type="group"]');
    const hasAffected = descendants.some((child: cytoscape.NodeSingular) => affectedNodeIds.has(child.id()));
    if (hasAffected) {
      g.removeClass('impact-unaffected');
      g.addClass('impact-group-visible');
    }
  });

  classifyEdges(instance, affectedNodeIds);
  startEdgeAnimation();
  animateToAffected(instance, affectedNodeIds);
}

/** Classify nodes for failing test mode. */
function classifyFailingNodes(
  instance: cytoscape.Core,
  failing: FailingResult,
  affectedNodeIds: Set<string>,
): void {
  const testNode = instance.getElementById(failing.test) as cytoscape.NodeSingular;
  if (testNode.length) {
    testNode.addClass('impact-root');
    affectedNodeIds.add(failing.test);
  }

  for (const cn of failing.chain) {
    const node = instance.getElementById(cn.nodeId) as cytoscape.NodeSingular;
    if (node.length) {
      affectedNodeIds.add(cn.nodeId);
      if (cn.depth <= 1) {
        node.addClass('impact-direct');
      } else {
        node.addClass('impact-indirect');
      }
    }
  }

  for (const t of failing.otherTestsAtRisk) {
    const node = instance.getElementById(t) as cytoscape.NodeSingular;
    if (node.length && !affectedNodeIds.has(t)) {
      node.addClass('impact-indirect');
      affectedNodeIds.add(t);
    }
  }
}

/** Classify nodes for refactor mode. */
function classifyRefactorNodes(
  instance: cytoscape.Core,
  refactor: RefactorResult,
  affectedNodeIds: Set<string>,
): void {
  const rootNode = instance.getElementById(refactor.file) as cytoscape.NodeSingular;
  if (rootNode.length) {
    rootNode.addClass('impact-root');
    affectedNodeIds.add(refactor.file);
  }

  for (const f of refactor.direct_importers) {
    const node = instance.getElementById(f) as cytoscape.NodeSingular;
    if (node.length) {
      node.addClass('impact-direct');
      affectedNodeIds.add(f);
    }
  }

  for (const f of refactor.transitive_affected) {
    const node = instance.getElementById(f) as cytoscape.NodeSingular;
    if (node.length && !affectedNodeIds.has(f)) {
      node.addClass('impact-indirect');
      affectedNodeIds.add(f);
    }
  }

  for (const t of refactor.tests_to_run) {
    const node = instance.getElementById(t) as cytoscape.NodeSingular;
    if (node.length && !affectedNodeIds.has(t)) {
      node.addClass('impact-direct');
      affectedNodeIds.add(t);
    }
  }
}

/** Classify edges as direct, indirect, or unaffected. */
function classifyEdges(instance: cytoscape.Core, affectedNodeIds: Set<string>): void {
  const directIds = new Set<string>();
  instance.nodes('.impact-root').forEach((n: cytoscape.NodeSingular) => directIds.add(n.id()));
  instance.nodes('.impact-direct').forEach((n: cytoscape.NodeSingular) => directIds.add(n.id()));

  instance.edges().forEach((e: cytoscape.EdgeSingular) => {
    const src = e.source().id();
    const tgt = e.target().id();
    if (affectedNodeIds.has(src) && affectedNodeIds.has(tgt)) {
      if (directIds.has(src) && directIds.has(tgt)) {
        e.addClass('impact-path');
      } else {
        e.addClass('impact-path-indirect');
      }
    } else {
      e.addClass('impact-unaffected');
    }
  });
}

/** Animate viewport to show affected nodes. */
function animateToAffected(instance: cytoscape.Core, affectedNodeIds: Set<string>): void {
  const affectedNodes = instance.nodes().filter((n: cytoscape.NodeSingular) => affectedNodeIds.has(n.id()));
  if (affectedNodes.length === 0) return;

  const bb = affectedNodes.boundingBox();
  const pad = 80;
  const fitZoom = Math.min(
    (instance.width() - 2 * pad) / bb.w,
    (instance.height() - 2 * pad) / bb.h,
  );

  if (fitZoom >= 0.45) {
    instance.animate({
      fit: { eles: affectedNodes, padding: pad },
      duration: 400,
      easing: 'ease-out-cubic',
    });
  } else {
    const rootNode = instance.nodes('.impact-root');
    instance.animate({
      center: { eles: rootNode.length ? rootNode : affectedNodes },
      zoom: 0.55,
      duration: 400,
      easing: 'ease-out-cubic',
    });
  }
}

/**
 * Highlights a circular dependency cycle on the graph.
 * Uses Cytoscape selectors instead of iterating all edges.
 */
export function highlightCycle(instance: cytoscape.Core, cycle: string[]): void {
  const cycleSet = new Set(cycle);

  // Clear previous
  instance.elements().removeClass('cycle-highlight cycle-dimmed');

  // Highlight cycle nodes
  instance.nodes().forEach((n: cytoscape.NodeSingular) => {
    if (cycleSet.has(n.id())) n.addClass('cycle-highlight');
    else if (n.data('type') !== 'group') n.addClass('cycle-dimmed');
  });

  // Highlight edges between consecutive cycle nodes using selectors
  for (let i = 0; i < cycle.length; i++) {
    const src = cycle[i];
    const tgt = cycle[(i + 1) % cycle.length];
    instance.edges(`[source="${src}"][target="${tgt}"]`).addClass('cycle-highlight');
  }
  instance.edges().not('.cycle-highlight').addClass('cycle-dimmed');

  // Zoom to cycle
  const cycleNodes = instance.nodes().filter((n: cytoscape.NodeSingular) => cycleSet.has(n.id()));
  if (cycleNodes.length > 0) {
    instance.animate({ fit: { eles: cycleNodes, padding: 80 }, duration: 400, easing: 'ease-out-cubic' });
  }
}

/** Clears cycle highlighting from the graph. */
export function clearCycleHighlight(instance: cytoscape.Core): void {
  instance.elements().removeClass('cycle-highlight cycle-dimmed');
}

/**
 * Highlights a single edge between two nodes (used for path trace).
 * Uses Cytoscape selectors instead of iterating all edges.
 */
export function highlightEdge(instance: cytoscape.Core, sourceId: string, targetId: string): void {
  instance.edges('.path-highlight').removeClass('path-highlight');
  instance
    .edges(`[source="${sourceId}"][target="${targetId}"], [source="${targetId}"][target="${sourceId}"]`)
    .addClass('path-highlight');
}

/** Clears path-trace edge highlighting. */
export function clearEdgeHighlight(instance: cytoscape.Core): void {
  instance.edges('.path-highlight').removeClass('path-highlight');
}
