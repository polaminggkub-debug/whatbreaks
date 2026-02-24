<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue';
import cytoscape from 'cytoscape';
import cyDagre from 'cytoscape-dagre';
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

  return {
    name: 'cose',
    animate: 'end',
    animationDuration: 800,
    padding: 30,
    nodeRepulsion: () => nodeCount > 100 ? 8000 : 4500,
    idealEdgeLength: () => nodeCount > 100 ? 120 : 80,
    edgeElasticity: () => 0.45,
    gravity: 0.25,
    numIter: 2500,
    nodeDimensionsIncludeLabels: true,
    fit: true,
    randomize: true,
    nodeOverlap: 20,
    nestingFactor: 1.2,
    componentSpacing: 100,
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
      const borderW = Math.min(2 + Math.sqrt(inDegree), 8);
      node.style('border-width', borderW);
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

  const isDagre = (props.layoutMode ?? 'dagre') === 'dagre';

  const instance = cytoscape({
    container: containerRef.value,
    elements,
    style: getStylesheet(),
    // Start with preset; run actual layout after canvas is properly sized
    layout: { name: 'preset' },
    minZoom: 0.1,
    maxZoom: 5,
    wheelSensitivity: 0.3,
    boxSelectionEnabled: false,
  });

  // Force canvas resize to match container before running layout
  instance.resize();

  function postLayout() {
    detectHubs(instance);
    initGroupCollapse(instance);
    if (isDagre) {
      collapseAllGroups(instance);
    }
    // Ensure readable zoom level
    if (instance.zoom() < 0.35) {
      instance.animate({
        zoom: 0.35,
        center: { eles: instance.elements() },
        duration: 400,
        easing: 'ease-out-cubic',
      });
    }
    applyZoomClasses(instance);
  }

  // Register layoutstop before running layout to avoid race condition
  instance.one('layoutstop', postLayout);

  // Run the actual layout now that canvas is properly sized
  instance.layout(getLayoutConfig() as unknown as cytoscape.LayoutOptions).run();

  bindGraphInteractions(
    instance,
    (nodeId: string) => emit('nodeClick', nodeId),
    (x: number, y: number, nodeId: string, nodeLabel: string) => emit('contextMenu', x, y, nodeId, nodeLabel),
  );

  // Zoom-based simplification
  let currentZoomLevel: 'far' | 'mid' | 'close' = 'close';

  function applyZoomClasses(inst: cytoscape.Core) {
    const z = inst.zoom();
    let newLevel: 'far' | 'mid' | 'close';
    if (z < 0.45) newLevel = 'far';
    else if (z <= 1.0) newLevel = 'mid';
    else newLevel = 'close';

    if (newLevel === currentZoomLevel) return;
    currentZoomLevel = newLevel;

    inst.batch(() => {
      const leafNodes = inst.nodes().not('[type="group"]').not('.collapsed-child');
      const regularEdges = inst.edges().not('.aggregate-edge');

      leafNodes.removeClass('zoom-far-node zoom-mid-node');
      regularEdges.removeClass('zoom-far-edge');

      if (newLevel === 'far') {
        leafNodes.addClass('zoom-far-node');
        regularEdges.addClass('zoom-far-edge');
      } else if (newLevel === 'mid') {
        leafNodes.addClass('zoom-mid-node');
      }
    });
  }

  instance.on('zoom', () => applyZoomClasses(instance));

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

defineExpose({ focusNode, highlightEdge, clearEdgeHighlight, highlightCycle, clearCycleHighlight, getCy: () => cy.value });
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
