<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue';
import cytoscape from 'cytoscape';
import cyDagre from 'cytoscape-dagre';
import fcose from 'cytoscape-fcose';
import type { Graph, AnalysisMode, FailingResult, RefactorResult } from '../../types/graph.js';
import { getStylesheet } from '../utils/graphStyles.js';
import { buildElements } from '../utils/buildCytoscapeElements.js';
import { bindGraphInteractions, clearFocusMode } from '../composables/useGraphInteractions.js';
import { focusNode as focusNodeUtil } from '../composables/useGraphInteractions.js';
import {
  initGroupCollapse,
  collapseAllGroups,
  resetCollapseState,
} from '../composables/useGroupCollapse.js';
import {
  applyHighlight as applyHighlightUtil,
  highlightCycle as highlightCycleUtil,
  clearCycleHighlight as clearCycleHighlightUtil,
  highlightEdge as highlightEdgeUtil,
  clearEdgeHighlight as clearEdgeHighlightUtil,
} from '../utils/highlightUtils.js';

cytoscape.use(cyDagre);
cytoscape.use(fcose);

const props = defineProps<{
  graph: Graph;
  mode: AnalysisMode;
  highlightResult?: FailingResult | RefactorResult | null;
  layoutMode?: 'dagre' | 'cose';
  showTests?: boolean;
  showFoundation?: boolean;
  sizeMode?: 'fanIn' | 'uniform';
}>();

const emit = defineEmits<{
  nodeClick: [nodeId: string];
  contextMenu: [x: number, y: number, nodeId: string, nodeLabel: string];
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const cy = shallowRef<cytoscape.Core | null>(null);
let edgeAnimationId: number | null = null;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function getLayoutConfig() {
  const nodeCount = props.graph.nodes.length;
  const currentLayout = props.layoutMode ?? 'dagre';

  if (currentLayout === 'dagre') {
    return {
      name: 'dagre',
      rankDir: 'TB',
      nodeSep: 50,
      edgeSep: 10,
      rankSep: 80,
      animate: !prefersReducedMotion,
      animationDuration: prefersReducedMotion ? 0 : 800,
      fit: true,
      padding: 40,
      rank: (node: cytoscape.NodeSingular) => -node.data('layerIndex'),
    };
  }

  // Build soft directional constraints: upstream (low layerIndex) at top
  const nodeLayerMap = new Map<string, number>();
  for (const n of props.graph.nodes) {
    nodeLayerMap.set(n.id, n.layerIndex ?? 0);
  }

  const constraints: { top: string; bottom: string }[] = [];
  for (const edge of props.graph.edges) {
    if (edge.type !== 'import') continue;
    const srcLayer = nodeLayerMap.get(edge.source) ?? 0;
    const tgtLayer = nodeLayerMap.get(edge.target) ?? 0;
    if (Math.abs(srcLayer - tgtLayer) < 1) continue;
    if (srcLayer === -1 || tgtLayer === -1) continue;
    constraints.push({ top: edge.target, bottom: edge.source });
  }

  return {
    name: 'fcose',
    animate: !prefersReducedMotion,
    animationDuration: prefersReducedMotion ? 0 : 800,
    padding: 30,
    nodeRepulsion: nodeCount > 100 ? 8000 : 4500,
    idealEdgeLength: nodeCount > 100 ? 120 : 80,
    edgeElasticity: 0.45,
    gravity: 0.25,
    numIter: 2500,
    nodeDimensionsIncludeLabels: true,
    fit: true,
    randomize: true,
    quality: 'default',
    nodeSeparation: 40,
    relativePlacementConstraint: constraints.length > 0 ? constraints : undefined,
  };
}

function stopEdgeAnimation() {
  if (edgeAnimationId !== null) {
    cancelAnimationFrame(edgeAnimationId);
    edgeAnimationId = null;
  }
}

function startEdgeAnimation() {
  stopEdgeAnimation();
  if (prefersReducedMotion || !cy.value) return;

  let offset = 0;
  const speed = 0.5;

  function tick() {
    if (!cy.value) return;
    offset = (offset + speed) % 24;
    const impactEdges = cy.value.edges('.impact-path, .impact-path-indirect');
    if (impactEdges.length === 0) {
      edgeAnimationId = null;
      return;
    }
    impactEdges.style('line-dash-offset', -offset);
    edgeAnimationId = requestAnimationFrame(tick);
  }

  edgeAnimationId = requestAnimationFrame(tick);
}

const HUB_THRESHOLD = 10;

function detectHubs(instance: cytoscape.Core) {
  instance.nodes().not('[type="group"]').forEach((node: cytoscape.NodeSingular) => {
    const inDegree = node.data('inDegree') as number;
    if (inDegree > HUB_THRESHOLD) {
      node.addClass('hub');
      // Scale border width: min(2 + sqrt(inDegree), 8)
      const borderW = Math.min(2 + Math.sqrt(inDegree), 8);
      node.style('border-width', borderW);
      // Hide connected edges
      node.connectedEdges().addClass('hub-edge-hidden');
    }
  });
}

function initCytoscape() {
  if (!containerRef.value || !props.graph) return;

  if (cy.value) {
    cy.value.destroy();
    resetCollapseState();
  }

  const elements = buildElements(props.graph, {
    showTests: props.showTests !== false,
    showFoundation: props.showFoundation !== false,
    sizeMode: props.sizeMode ?? 'fanIn',
    layoutMode: props.layoutMode ?? 'dagre',
  });

  const instance = cytoscape({
    container: containerRef.value,
    elements,
    style: getStylesheet(),
    layout: getLayoutConfig() as unknown as cytoscape.LayoutOptions,
    minZoom: 0.1,
    maxZoom: 5,
    wheelSensitivity: 0.3,
    boxSelectionEnabled: false,
  });

  // Auto-frame: ensure minimum readable zoom after layout
  instance.one('layoutstop', () => {
    const zoom = instance.zoom();
    if (zoom < 0.35) {
      instance.animate({
        zoom: 0.35,
        center: { eles: instance.elements() },
        duration: 400,
        easing: 'ease-out-cubic',
      });
    }
    detectHubs(instance);
    // Initialize and collapse all groups (default state)
    initGroupCollapse(instance);
    collapseAllGroups(instance);
  });

  bindGraphInteractions(
    instance,
    (nodeId: string) => emit('nodeClick', nodeId),
    (x: number, y: number, nodeId: string, nodeLabel: string) => emit('contextMenu', x, y, nodeId, nodeLabel),
  );

  cy.value = instance;
}

onMounted(() => {
  initCytoscape();
});

onUnmounted(() => {
  stopEdgeAnimation();
  if (cy.value) {
    cy.value.destroy();
    cy.value = null;
  }
});

// Graph object is replaced entirely on fetch, shallow watch is sufficient
watch(() => props.graph, () => initCytoscape());

watch(() => props.highlightResult, (result) => {
  if (!cy.value) return;
  applyHighlightUtil(cy.value, result ?? null, startEdgeAnimation, stopEdgeAnimation);
});

watch(() => [props.layoutMode, props.showTests, props.showFoundation, props.sizeMode], () => {
  initCytoscape();
  // Re-apply active highlight after graph rebuild (filter toggle)
  if (props.highlightResult && cy.value) {
    cy.value.one('layoutstop', () => {
      if (cy.value && props.highlightResult) {
        applyHighlightUtil(cy.value, props.highlightResult, startEdgeAnimation, stopEdgeAnimation);
      }
    });
  }
});

// Exposed methods — delegate to extracted utilities
function focusNode(nodeId: string) {
  if (!cy.value) return;
  focusNodeUtil(cy.value, nodeId);
}

function highlightCycle(cycle: string[]) {
  if (!cy.value) return;
  highlightCycleUtil(cy.value, cycle);
}

function clearCycleHighlight() {
  if (!cy.value) return;
  clearCycleHighlightUtil(cy.value);
}

function highlightEdge(sourceId: string, targetId: string) {
  if (!cy.value) return;
  highlightEdgeUtil(cy.value, sourceId, targetId);
}

function clearEdgeHighlight() {
  if (!cy.value) return;
  clearEdgeHighlightUtil(cy.value);
}

defineExpose({ focusNode, highlightEdge, clearEdgeHighlight, highlightCycle, clearCycleHighlight });
</script>

<template>
  <div ref="containerRef" class="graph-container"></div>
</template>

<style scoped>
.graph-container {
  width: 100%;
  height: 100%;
  background:
    radial-gradient(circle, #1e293b 1px, transparent 1px);
  background-size: 24px 24px;
  cursor: grab;
}

.graph-container:active {
  cursor: grabbing;
}
</style>
