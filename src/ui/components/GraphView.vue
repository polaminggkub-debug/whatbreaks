<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue';
import cytoscape from 'cytoscape';
import cyDagre from 'cytoscape-dagre';
import type { Graph, AnalysisMode, FailingResult, RefactorResult } from '../../types/graph';
import { getFileIcon } from '../utils/fileIcons';
import { DEPTH_LAYER_COLORS } from '../utils/constants';
import { getStylesheet } from '../utils/graphStyles';

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
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const cy = shallowRef<cytoscape.Core | null>(null);
let edgeAnimationId: number | null = null;
const expandedGroups = ref(new Set<string>());

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function buildElements(graph: Graph) {
  const filteredNodes = graph.nodes.filter(n => {
    if (props.showTests === false && n.type === 'test') return false;
    if (props.showFoundation === false && n.layerIndex === 0) return false;
    return true;
  });

  const nodeIds = new Set(filteredNodes.map(n => n.id));

  // Create group (compound parent) nodes if groups exist
  const groupNodes: cytoscape.ElementDefinition[] = [];
  const nodeParentMap = new Map<string, string>();

  if (graph.groups?.length) {
    for (const group of graph.groups) {
      const visibleChildren = group.nodeIds.filter(id => nodeIds.has(id));
      if (visibleChildren.length < 2) continue;
      groupNodes.push({
        data: { id: group.id, label: group.label, type: 'group' },
      });
      for (const nid of visibleChildren) {
        nodeParentMap.set(nid, group.id);
      }
    }
  }

  // Handle collapsed groups
  for (const group of graph.groups ?? []) {
    if (!expandedGroups.value.has(group.id)) {
      const visibleChildren = group.nodeIds.filter(id => nodeIds.has(id));
      for (const nid of visibleChildren) {
        nodeIds.delete(nid);
        nodeParentMap.delete(nid);
      }
      const groupNode = groupNodes.find(gn => gn.data.id === group.id);
      if (groupNode) {
        groupNode.data.label = `${group.label} (${visibleChildren.length})`;
        groupNode.data.collapsedCount = visibleChildren.length;
        groupNode.data.collapsedNodeIds = visibleChildren;
      }
    }
  }

  const nodes = filteredNodes
    .filter(n => nodeIds.has(n.id))
    .map(n => ({
      data: {
        id: n.id,
        label: n.label,
        layer: n.layer,
        type: n.type,
        functions: n.functions,
        color: DEPTH_LAYER_COLORS[n.layerIndex ?? 0] ?? '#64748b',
        testLevel: n.testLevel ?? 'unit',
        icon: getFileIcon(n.id, n.type, n.testLevel),
        nodeSize: props.sizeMode === 'uniform' ? 36 : (n.size ?? 36),
        layerIndex: n.layerIndex ?? 0,
        fanIn: n.fanIn ?? 0,
        depth: n.depth ?? 0,
        parent: nodeParentMap.get(n.id) ?? undefined,
      },
    }));

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

  // Aggregate edges for collapsed groups
  const collapsedGroupNodeMap = new Map<string, string>();
  for (const group of graph.groups ?? []) {
    if (!expandedGroups.value.has(group.id)) {
      for (const nid of group.nodeIds) {
        collapsedGroupNodeMap.set(nid, group.id);
      }
    }
  }

  const aggregateEdgeSet = new Set<string>();
  const aggregateEdges: cytoscape.ElementDefinition[] = [];
  for (const edge of graph.edges) {
    const srcGroup = collapsedGroupNodeMap.get(edge.source);
    const tgtGroup = collapsedGroupNodeMap.get(edge.target);
    if (srcGroup && tgtGroup && srcGroup !== tgtGroup) {
      const key = `${srcGroup}->${tgtGroup}`;
      if (!aggregateEdgeSet.has(key)) {
        aggregateEdgeSet.add(key);
        aggregateEdges.push({
          data: { id: `agg-${key}`, source: srcGroup, target: tgtGroup, edgeType: 'aggregate' },
        });
      }
    }
  }

  return [...groupNodes, ...nodes, ...edges, ...aggregateEdges];
}

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
      rank: (node: any) => -node.data('layerIndex'),
    };
  }

  return {
    name: 'cose',
    animate: !prefersReducedMotion,
    animationDuration: prefersReducedMotion ? 0 : 800,
    padding: 40,
    nodeRepulsion: () => nodeCount > 100 ? 8000 : 4500,
    idealEdgeLength: () => nodeCount > 100 ? 120 : 80,
    edgeElasticity: () => 100,
    gravity: 0.25,
    numIter: 1000,
    nodeDimensionsIncludeLabels: true,
    fit: true,
    randomize: false,
  };
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
    layout: getLayoutConfig() as unknown as cytoscape.LayoutOptions,
    minZoom: 0.1,
    maxZoom: 5,
    wheelSensitivity: 0.3,
    boxSelectionEnabled: false,
  });

  instance.on('tap', 'node', (evt) => {
    if (evt.target.data('type') === 'group') return; // handled by group tap
    const nodeId = evt.target.id();
    // Clear previous selection
    instance.nodes().removeClass('selected-node selected-neighbor');
    instance.edges().removeClass('selected-connected');
    // Apply persistent selection
    evt.target.addClass('selected-node');
    evt.target.connectedEdges().addClass('selected-connected');
    evt.target.neighborhood('node').addClass('selected-neighbor');
    emit('nodeClick', nodeId);
  });

  // Group focus mode: click a group to dim others
  instance.on('tap', 'node[type="group"]', (evt) => {
    const groupId = evt.target.id();
    if (evt.target.hasClass('group-focused')) {
      instance.nodes('[type="group"]').removeClass('group-focused group-dimmed');
      instance.nodes().not('[type="group"]').removeClass('impact-unaffected');
      instance.edges().removeClass('impact-unaffected');
      return;
    }
    instance.nodes('[type="group"]').addClass('group-dimmed').removeClass('group-focused');
    evt.target.removeClass('group-dimmed').addClass('group-focused');
    const childNodeIds = new Set(
      instance.nodes(`[parent="${groupId}"]`).map((n: any) => n.id())
    );
    instance.nodes().not('[type="group"]').forEach((n: any) => {
      n.toggleClass('impact-unaffected', !childNodeIds.has(n.id()));
    });
    instance.edges().forEach((e: any) => {
      const connected = childNodeIds.has(e.source().id()) || childNodeIds.has(e.target().id());
      e.toggleClass('impact-unaffected', !connected);
    });
    const groupEles = evt.target.descendants().add(evt.target);
    instance.animate({ fit: { eles: groupEles, padding: 60 }, duration: 400, easing: 'ease-out-cubic' });
  });

  // Double-click group to expand/collapse
  instance.on('dblclick', 'node[type="group"]', (evt) => {
    const groupId = evt.target.id();
    if (expandedGroups.value.has(groupId)) {
      expandedGroups.value.delete(groupId);
    } else {
      expandedGroups.value.add(groupId);
    }
    initCytoscape();
  });

  instance.on('tap', (evt) => {
    if (evt.target === instance) {
      instance.nodes().removeClass('selected-node selected-neighbor group-focused group-dimmed');
      instance.edges().removeClass('selected-connected');
      instance.nodes().not('[type="group"]').removeClass('impact-unaffected');
      instance.edges().removeClass('impact-unaffected');
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
    const impactEdges = cy.value.edges('.impact-path');
    if (impactEdges.length === 0) {
      edgeAnimationId = null;
      return;
    }
    impactEdges.style('line-dash-offset', -offset);
    edgeAnimationId = requestAnimationFrame(tick);
  }

  edgeAnimationId = requestAnimationFrame(tick);
}

function applyHighlight(result: FailingResult | RefactorResult | null) {
  if (!cy.value) return;
  const instance = cy.value;

  stopEdgeAnimation();

  instance.nodes().removeClass('impact-root impact-direct impact-indirect impact-unaffected selected-neighbor');
  instance.edges().removeClass('impact-path impact-unaffected selected-connected');

  if (!result) return;

  const affectedNodeIds = new Set<string>();

  if (result.mode === 'failing') {
    const failing = result as FailingResult;

    const testNode = instance.getElementById(failing.test);
    if (testNode.length) {
      testNode.addClass('impact-root');
      affectedNodeIds.add(failing.test);
    }

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

    for (const t of failing.otherTestsAtRisk) {
      const node = instance.getElementById(t);
      if (node.length && !affectedNodeIds.has(t)) {
        node.addClass('impact-indirect');
        affectedNodeIds.add(t);
      }
    }
  } else {
    const refactor = result as RefactorResult;

    const rootNode = instance.getElementById(refactor.file);
    if (rootNode.length) {
      rootNode.addClass('impact-root');
      affectedNodeIds.add(refactor.file);
    }

    for (const f of refactor.direct_importers) {
      const node = instance.getElementById(f);
      if (node.length) {
        node.addClass('impact-direct');
        affectedNodeIds.add(f);
      }
    }

    for (const f of refactor.transitive_affected) {
      const node = instance.getElementById(f);
      if (node.length && !affectedNodeIds.has(f)) {
        node.addClass('impact-indirect');
        affectedNodeIds.add(f);
      }
    }

    for (const t of refactor.tests_to_run) {
      const node = instance.getElementById(t);
      if (node.length && !affectedNodeIds.has(t)) {
        node.addClass('impact-direct');
        affectedNodeIds.add(t);
      }
    }
  }

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

  startEdgeAnimation();

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
  stopEdgeAnimation();
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

watch(() => [props.layoutMode, props.showTests, props.showFoundation, props.sizeMode], () => {
  initCytoscape();
});

function focusNode(nodeId: string) {
  if (!cy.value) return;
  const instance = cy.value;
  const node = instance.getElementById(nodeId);
  if (!node.length) return;

  instance.nodes().removeClass('selected-node selected-neighbor');
  instance.edges().removeClass('selected-connected');
  node.addClass('selected-node');
  node.connectedEdges().addClass('selected-connected');
  node.neighborhood('node').addClass('selected-neighbor');

  instance.animate({
    center: { eles: node },
    zoom: Math.max(instance.zoom(), 1.2),
    duration: 400,
    easing: 'ease-out-cubic',
  });
}

defineExpose({ focusNode });
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
