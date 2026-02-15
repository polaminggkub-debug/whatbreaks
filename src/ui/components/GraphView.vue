<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { Graph, AnalysisMode, FailingResult, RefactorResult } from '../../types/graph';

cytoscape.use(dagre);

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
        'background-color': 'data(color)',
        'label': 'data(label)',
        'color': '#e2e8f0',
        'font-size': '10px',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 6,
        'width': 50,
        'height': 30,
        'shape': 'roundrectangle',
        'border-width': 2,
        'border-color': 'data(color)',
        'border-opacity': 0.6,
        'text-wrap': 'ellipsis',
        'text-max-width': '80px',
        'overlay-padding': 4,
        'shadow-blur': 8,
        'shadow-color': 'data(color)',
        'shadow-opacity': 0.3,
        'shadow-offset-x': 0,
        'shadow-offset-y': 2,
        'transition-property': 'background-color, border-color, opacity, shadow-opacity',
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
        'shadow-opacity': 0.6,
        'z-index': 999,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.selected-node',
      style: {
        'border-width': 3,
        'border-color': '#ffffff',
        'shadow-opacity': 0.8,
        'z-index': 999,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.impact-root',
      style: {
        'background-color': '#ef4444',
        'border-color': '#ef4444',
        'shadow-color': '#ef4444',
        'shadow-opacity': 0.6,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.impact-direct',
      style: {
        'background-color': '#f59e0b',
        'border-color': '#f59e0b',
        'shadow-color': '#f59e0b',
        'shadow-opacity': 0.5,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.impact-indirect',
      style: {
        'background-color': '#eab308',
        'border-color': '#eab308',
        'shadow-color': '#eab308',
        'shadow-opacity': 0.4,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.impact-unaffected',
      style: {
        'background-color': '#334155',
        'border-color': '#334155',
        'shadow-opacity': 0.0,
        'opacity': 0.4,
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

  const instance = cytoscape({
    container: containerRef.value,
    elements: buildElements(props.graph),
    style: getStylesheet(),
    layout: {
      name: 'dagre',
      rankDir: 'TB',
      nodeSep: 50,
      rankSep: 80,
      edgeSep: 20,
      padding: 40,
      animate: true,
      animationDuration: 500,
      sort: (a: cytoscape.SingularElementArgument, b: cytoscape.SingularElementArgument) => {
        const aOrder = a.data('layerOrder') ?? 99;
        const bOrder = b.data('layerOrder') ?? 99;
        return aOrder - bOrder;
      },
    } as unknown as cytoscape.LayoutOptions,
    minZoom: 0.2,
    maxZoom: 4,
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

  // Mark unaffected nodes
  instance.nodes().forEach(n => {
    if (!affectedNodeIds.has(n.id())) {
      n.addClass('impact-unaffected');
    }
  });

  // Highlight edges between affected nodes
  instance.edges().forEach(e => {
    const src = e.source().id();
    const tgt = e.target().id();
    if (affectedNodeIds.has(src) && affectedNodeIds.has(tgt)) {
      e.addClass('impact-path');
    }
  });
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
