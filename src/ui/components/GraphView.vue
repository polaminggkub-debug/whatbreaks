<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue';
import cytoscape from 'cytoscape';
import type { Graph, AnalysisMode, FailingResult, RefactorResult } from '../../types/graph';

const props = defineProps<{
  graph: Graph;
  mode: AnalysisMode;
  highlightResult?: FailingResult | RefactorResult | null;
}>();

const emit = defineEmits<{
  nodeClick: [nodeId: string];
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const cy = shallowRef<cytoscape.Core | null>(null);

const LAYER_COLORS: Record<string, string> = {
  page: '#6366f1',
  ui: '#3b82f6',
  feature: '#8b5cf6',
  entity: '#a855f7',
  shared: '#06b6d4',
  test: '#14b8a6',
  config: '#64748b',
};

const LAYER_ORDER: Record<string, number> = {
  page: 0,
  ui: 1,
  feature: 2,
  entity: 3,
  shared: 4,
  test: 5,
  config: 6,
};

// File type icons from Devicon (MIT license) + custom SVGs
// https://github.com/devicons/devicon
function svgToDataUri(svg: string): string {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const FILE_ICONS: Record<string, string> = {
  ts: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="12" fill="#3178c6"/><path fill="#fff" d="M72.18 63.14v5.12H55.94v46.24H44.43V68.26H28.16v-5a49.19 49.19 0 01.12-5.17c.08-.09 9.96-.09 21.96-.09h21.93z"/><path fill="#fff" d="M95.76 63.05a15.56 15.56 0 017.82 4.5 20.58 20.58 0 013 4c0 .16-5.4 3.81-8.69 5.85-.12.08-.6-.44-1.13-1.23a7.09 7.09 0 00-5.87-3.53c-3.79-.26-6.23 1.73-6.21 5a4.58 4.58 0 00.54 2.34c.83 1.73 2.38 2.76 7.24 4.86 8.95 3.85 12.78 6.39 15.16 10 2.66 4 3.25 10.46 1.45 15.24-2 5.2-6.9 8.73-13.83 9.9a38.32 38.32 0 01-9.52-.1 23 23 0 01-12.72-6.63c-1.15-1.27-3.39-4.58-3.25-4.82a9.34 9.34 0 011.15-.73l4.52-2.6 3.59-2.08.75 1.11a16.78 16.78 0 004.74 4.54c4 2.1 9.46 1.81 12.16-.62a5.43 5.43 0 00.69-6.92c-1-1.39-3-2.56-8.59-5-6.45-2.78-9.23-4.5-11.77-7.24a16.48 16.48 0 01-3.43-6.25 25 25 0 01-.22-8c1.33-6.23 6-10.58 12.82-11.87a31.66 31.66 0 019.49.26z"/></svg>`),

  vue: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="12" fill="#2d3748"/><path d="M26 22l23 .01L64.04 46.4 79.02 22.03 102 22 64.15 87.05z" fill="#35495e" transform="translate(0,12) scale(0.82) translate(12,0)"/><path d="M.91 22l25.07-.17 38.15 65.66L102 22l25.11.03-63 108.06z" fill="#41b883" transform="translate(0,12) scale(0.82) translate(12,0)"/></svg>`),

  test: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="12" fill="#0d9488"/><path d="M52 24h24v28l20 36a8 8 0 01-7 12H39a8 8 0 01-7-12l20-36V24z" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M48 24h32" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M44 80c8-4 16 4 24 0s16 4 24 0" fill="none" stroke="#5eead4" stroke-width="4" stroke-linecap="round"/><circle cx="56" cy="90" r="4" fill="#5eead4"/><circle cx="72" cy="86" r="3" fill="#5eead4"/></svg>`),

  config: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="12" fill="#475569"/><path d="M64 40a24 24 0 110 48 24 24 0 010-48zm0 8a16 16 0 100 32 16 16 0 000-32z" fill="#e2e8f0"/><path d="M60 20h8v12h-8zM60 96h8v12h-8zM96 60v8H84v-8zm-64 0v8H20v-8zM85.8 33.4l5.6 5.6-8.5 8.5-5.6-5.6zm-49.2 49.2l5.6 5.6-8.5 8.5-5.6-5.6zm57.8 0l-8.5 8.5 5.6 5.6 8.5-8.5zM36.6 33.4l-8.5 8.5 5.6 5.6 8.5-8.5z" fill="#94a3b8"/></svg>`),
};

function getFileIcon(nodeId: string, nodeType: string): string {
  if (nodeType === 'test') return FILE_ICONS.test;
  if (nodeId.endsWith('.vue')) return FILE_ICONS.vue;
  if (nodeId.includes('config') || nodeId.includes('.config.')) return FILE_ICONS.config;
  return FILE_ICONS.ts;
}

function buildElements(graph: Graph) {
  const nodes = graph.nodes.map(n => ({
    data: {
      id: n.id,
      label: n.label,
      layer: n.layer,
      type: n.type,
      functions: n.functions,
      layerOrder: LAYER_ORDER[n.layer] ?? 99,
      color: LAYER_COLORS[n.layer] ?? '#64748b',
      icon: getFileIcon(n.id, n.type),
    },
  }));

  const nodeIds = new Set(graph.nodes.map(n => n.id));
  const edges = graph.edges
    .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e, i) => ({
      data: {
        id: `e${i}`,
        source: e.source,
        target: e.target,
        edgeType: e.type,
      },
    }));

  return [...nodes, ...edges];
}

function getStylesheet(): cytoscape.Stylesheet[] {
  return [
    {
      selector: 'node',
      style: {
        'background-color': '#1e293b',
        'background-image': 'data(icon)',
        'background-fit': 'contain',
        'background-clip': 'none',
        'background-width': '70%',
        'background-height': '70%',
        'label': 'data(label)',
        'color': '#e2e8f0',
        'font-size': '10px',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 6,
        'width': 36,
        'height': 36,
        'shape': 'roundrectangle',
        'border-width': 2,
        'border-color': 'data(color)',
        'border-opacity': 0.6,
        'text-wrap': 'ellipsis',
        'text-max-width': '80px',
        'overlay-padding': 4,
        'transition-property': 'background-color, border-color, opacity, border-width',
        'transition-duration': 250,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node:active',
      style: {
        'overlay-color': '#6366f1',
        'overlay-opacity': 0.15,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.hover',
      style: {
        'border-width': 3,
        'z-index': 999,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.selected-node',
      style: {
        'border-width': 3,
        'border-color': '#ffffff',
        'z-index': 999,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.impact-root',
      style: {
        'background-color': '#ef4444',
        'border-color': '#fca5a5',
        'border-width': 3,
        'width': 60,
        'height': 36,
        'font-size': '12px',
        'font-weight': 700,
        'color': '#fca5a5',
        'z-index': 999,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.impact-direct',
      style: {
        'background-color': '#f59e0b',
        'border-color': '#fcd34d',
        'border-width': 3,
        'color': '#fcd34d',
        'z-index': 998,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.impact-indirect',
      style: {
        'background-color': '#eab308',
        'border-color': '#fde047',
        'border-width': 2,
        'color': '#fde047',
        'z-index': 997,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.impact-unaffected',
      style: {
        'background-color': '#1e293b',
        'border-color': '#334155',
        'border-width': 1,
        'opacity': 0.25,
        'color': '#475569',
        'font-size': '8px',
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'edge',
      style: {
        'width': 1.5,
        'line-color': '#475569',
        'target-arrow-color': '#475569',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.8,
        'curve-style': 'bezier',
        'opacity': 0.6,
        'transition-property': 'line-color, target-arrow-color, opacity, width',
        'transition-duration': 250,
      } as unknown as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.hover-connected',
      style: {
        'line-color': '#94a3b8',
        'target-arrow-color': '#94a3b8',
        'opacity': 1,
        'width': 2.5,
        'z-index': 999,
      } as unknown as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.impact-path',
      style: {
        'line-color': '#ef4444',
        'target-arrow-color': '#ef4444',
        'opacity': 1,
        'width': 2.5,
        'z-index': 998,
      } as unknown as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.impact-unaffected',
      style: {
        'opacity': 0.1,
        'width': 0.5,
      } as unknown as cytoscape.Css.Edge,
    },
    {
      selector: 'edge[edgeType="test-covers"]',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [6, 3],
      } as unknown as cytoscape.Css.Edge,
    },
  ];
}

function initCytoscape() {
  if (!containerRef.value || !props.graph) return;

  if (cy.value) {
    cy.value.destroy();
  }

  const nodeCount = props.graph.nodes.length;

  const instance = cytoscape({
    container: containerRef.value,
    elements: buildElements(props.graph),
    style: getStylesheet(),
    layout: {
      name: 'cose',
      animate: true,
      animationDuration: 800,
      padding: 40,
      nodeRepulsion: () => nodeCount > 100 ? 8000 : 4500,
      idealEdgeLength: () => nodeCount > 100 ? 120 : 80,
      edgeElasticity: () => 100,
      gravity: 0.25,
      numIter: 1000,
      nodeDimensionsIncludeLabels: true,
      fit: true,
      randomize: false,
    } as unknown as cytoscape.LayoutOptions,
    minZoom: 0.1,
    maxZoom: 5,
    wheelSensitivity: 0.3,
    boxSelectionEnabled: false,
  });

  instance.on('tap', 'node', (evt) => {
    const nodeId = evt.target.id();
    instance.nodes().removeClass('selected-node');
    evt.target.addClass('selected-node');
    emit('nodeClick', nodeId);
  });

  instance.on('tap', (evt) => {
    if (evt.target === instance) {
      instance.nodes().removeClass('selected-node');
    }
  });

  instance.on('mouseover', 'node', (evt) => {
    const node = evt.target;
    node.addClass('hover');
    node.connectedEdges().addClass('hover-connected');
    node.neighborhood('node').addClass('hover');
  });

  instance.on('mouseout', 'node', (evt) => {
    const node = evt.target;
    node.removeClass('hover');
    node.connectedEdges().removeClass('hover-connected');
    node.neighborhood('node').removeClass('hover');
  });

  cy.value = instance;
}

function applyHighlight(result: FailingResult | RefactorResult | null) {
  if (!cy.value) return;
  const instance = cy.value;

  // Clear all impact classes
  instance.nodes().removeClass('impact-root impact-direct impact-indirect impact-unaffected');
  instance.edges().removeClass('impact-path');

  if (!result) return;

  const affectedNodeIds = new Set<string>();

  if (result.mode === 'failing') {
    const failing = result as FailingResult;

    // Root: the test itself
    const testNode = instance.getElementById(failing.test);
    if (testNode.length) {
      testNode.addClass('impact-root');
      affectedNodeIds.add(failing.test);
    }

    // Chain nodes
    for (const cn of failing.chain) {
      const node = instance.getElementById(cn.nodeId);
      if (node.length) {
        affectedNodeIds.add(cn.nodeId);
        if (cn.depth <= 1) {
          node.addClass('impact-direct');
        } else {
          node.addClass('impact-indirect');
        }
      }
    }

    // Other tests at risk
    for (const t of failing.otherTestsAtRisk) {
      const node = instance.getElementById(t);
      if (node.length && !affectedNodeIds.has(t)) {
        node.addClass('impact-indirect');
        affectedNodeIds.add(t);
      }
    }
  } else {
    const refactor = result as RefactorResult;

    // Root: the refactored file
    const rootNode = instance.getElementById(refactor.file);
    if (rootNode.length) {
      rootNode.addClass('impact-root');
      affectedNodeIds.add(refactor.file);
    }

    // Direct importers
    for (const f of refactor.direct_importers) {
      const node = instance.getElementById(f);
      if (node.length) {
        node.addClass('impact-direct');
        affectedNodeIds.add(f);
      }
    }

    // Transitive affected
    for (const f of refactor.transitive_affected) {
      const node = instance.getElementById(f);
      if (node.length && !affectedNodeIds.has(f)) {
        node.addClass('impact-indirect');
        affectedNodeIds.add(f);
      }
    }

    // Tests to run
    for (const t of refactor.tests_to_run) {
      const node = instance.getElementById(t);
      if (node.length && !affectedNodeIds.has(t)) {
        node.addClass('impact-direct');
        affectedNodeIds.add(t);
      }
    }
  }

  // Mark unaffected nodes and edges
  instance.nodes().forEach(n => {
    if (!affectedNodeIds.has(n.id())) {
      n.addClass('impact-unaffected');
    }
  });

  instance.edges().forEach(e => {
    const src = e.source().id();
    const tgt = e.target().id();
    if (affectedNodeIds.has(src) && affectedNodeIds.has(tgt)) {
      e.addClass('impact-path');
    } else {
      e.addClass('impact-unaffected');
    }
  });

  // Zoom to fit the affected subgraph so the user can see the impact
  const affectedNodes = instance.nodes().filter(n => affectedNodeIds.has(n.id()));
  if (affectedNodes.length > 0) {
    instance.animate({
      fit: { eles: affectedNodes, padding: 80 },
      duration: 400,
      easing: 'ease-out-cubic',
    });
  }
}

onMounted(() => {
  initCytoscape();
});

onUnmounted(() => {
  if (cy.value) {
    cy.value.destroy();
    cy.value = null;
  }
});

watch(() => props.graph, () => {
  initCytoscape();
}, { deep: true });

watch(() => props.highlightResult, (result) => {
  applyHighlight(result ?? null);
}, { deep: true });
</script>

<template>
  <div ref="containerRef" class="graph-container"></div>
</template>

<style scoped>
.graph-container {
  width: 100%;
  height: 100%;
  background: transparent;
  cursor: grab;
}

.graph-container:active {
  cursor: grabbing;
}
</style>
