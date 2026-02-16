<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue';
import cytoscape from 'cytoscape';
import cyDagre from 'cytoscape-dagre';
import fcose from 'cytoscape-fcose';
import type { Graph, AnalysisMode, FailingResult, RefactorResult, FileGroup } from '../../types/graph';
import { getFileIcon } from '../utils/fileIcons';
import { DEPTH_LAYER_COLORS } from '../utils/constants';
import { getStylesheet } from '../utils/graphStyles';

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
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const cy = shallowRef<cytoscape.Core | null>(null);
let edgeAnimationId: number | null = null;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function getAllDescendantNodeIds(group: FileGroup, allGroups: FileGroup[]): string[] {
  const ids = [...group.nodeIds];
  const children = allGroups.filter(g => g.parentGroupId === group.id);
  for (const child of children) {
    ids.push(...child.nodeIds);
  }
  return ids;
}

/** Derive dominant layer color from a group's member nodes */
function getDominantColor(memberIds: string[], graph: Graph): string {
  const colorCounts = new Map<string, number>();
  for (const id of memberIds) {
    const node = graph.nodes.find(n => n.id === id);
    if (!node) continue;
    const color = DEPTH_LAYER_COLORS[node.layerIndex ?? 0] ?? '#64748b';
    colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
  }
  let best = '#64748b';
  let bestCount = 0;
  for (const [color, count] of colorCounts) {
    if (count > bestCount) { bestCount = count; best = color; }
  }
  return best;
}

function buildElements(graph: Graph) {
  const filteredNodes = graph.nodes.filter(n => {
    if (props.showTests === false && n.type === 'test') return false;
    if (props.showFoundation === false && n.layerIndex === 0) return false;
    return true;
  });

  const nodeIds = new Set(filteredNodes.map(n => n.id));

  // Create group (compound parent) nodes
  // Force (cose) layout: flatten to single-level groups (cose breaks with nested compounds)
  // Layered (dagre): full nested subgroups
  const groupNodes: cytoscape.ElementDefinition[] = [];
  const nodeParentMap = new Map<string, string>();
  const isCose = (props.layoutMode ?? 'dagre') === 'cose';

  // Oversized parent groups create massive bounding boxes that dominate the layout.
  // Promote their subgroups to top-level when a parent exceeds this threshold.
  const MAX_COMPOUND_SIZE = 15;

  if (graph.groups?.length) {
    const level0 = graph.groups.filter(g => g.level === 0 || !g.parentGroupId);
    const level1 = graph.groups.filter(g => g.level === 1 && g.parentGroupId);

    // Pre-compute visible descendant counts + colors per level-0 group
    const groupMeta = new Map<string, { visible: number; color: string; hasSubs: boolean }>();
    for (const group of level0) {
      const allDescendantIds = getAllDescendantNodeIds(group, graph.groups);
      const visibleCount = allDescendantIds.filter(id => nodeIds.has(id)).length;
      const color = getDominantColor(allDescendantIds, graph);
      const hasSubs = level1.some(s => s.parentGroupId === group.id);
      groupMeta.set(group.id, { visible: visibleCount, color, hasSubs });
    }

    // Add level-0 group nodes (skip oversized parents that have subgroups)
    const promotedParentIds = new Set<string>();
    for (const group of level0) {
      const meta = groupMeta.get(group.id)!;
      if (meta.visible < 2) continue;
      if (meta.visible > MAX_COMPOUND_SIZE && meta.hasSubs) {
        promotedParentIds.add(group.id);
        continue; // skip — subgroups will be promoted to top-level
      }
      groupNodes.push({
        data: { id: group.id, label: group.label, type: 'group', level: 0, color: meta.color },
      });
    }

    if (isCose) {
      // Flatten: all files go directly into their level-0 parent
      for (const group of level0) {
        if (!groupNodes.find(g => g.data.id === group.id)) continue;
        const allDescendantIds = getAllDescendantNodeIds(group, graph.groups);
        for (const nid of allDescendantIds) {
          if (nodeIds.has(nid)) nodeParentMap.set(nid, group.id);
        }
      }
      // Promoted parents in cose: subgroups become top-level groups
      for (const sub of level1) {
        if (!promotedParentIds.has(sub.parentGroupId!)) continue;
        const visibleChildren = sub.nodeIds.filter(id => nodeIds.has(id));
        if (visibleChildren.length < 2) continue;
        const parentColor = groupMeta.get(sub.parentGroupId!)?.color ?? '#64748b';
        groupNodes.push({
          data: { id: sub.id, label: sub.label, type: 'group', level: 0, color: parentColor },
        });
        for (const nid of visibleChildren) {
          nodeParentMap.set(nid, sub.id);
        }
      }
    } else {
      // Nested: subgroups as compound children (or promoted to top-level)
      for (const sub of level1) {
        const visibleChildren = sub.nodeIds.filter(id => nodeIds.has(id));
        if (visibleChildren.length < 2) continue;

        if (promotedParentIds.has(sub.parentGroupId!)) {
          // Parent was oversized — promote subgroup to top-level
          const parentColor = groupMeta.get(sub.parentGroupId!)?.color ?? '#64748b';
          groupNodes.push({
            data: { id: sub.id, label: sub.label, type: 'group', level: 0, color: parentColor },
          });
        } else {
          const parentNode = groupNodes.find(g => g.data.id === sub.parentGroupId);
          if (!parentNode) continue;
          groupNodes.push({
            data: {
              id: sub.id,
              label: sub.label,
              type: 'group',
              level: sub.level,
              parent: sub.parentGroupId,
              color: parentNode.data.color,
            },
          });
        }
        for (const nid of visibleChildren) {
          nodeParentMap.set(nid, sub.id);
        }
      }

      // Files not claimed by subgroups stay in parent group directly
      for (const group of level0) {
        if (!groupNodes.find(g => g.data.id === group.id)) continue;
        for (const nid of group.nodeIds) {
          if (nodeIds.has(nid) && !nodeParentMap.has(nid)) {
            nodeParentMap.set(nid, group.id);
          }
        }
      }
    }
  }

  const nodes = filteredNodes.map(n => ({
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

  return [...groupNodes, ...nodes, ...edges];
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
    // Skip same-layer and test nodes
    if (Math.abs(srcLayer - tgtLayer) < 1) continue;
    if (srcLayer === -1 || tgtLayer === -1) continue;
    // source imports target → target is upstream → target on top
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

function clearFocusMode(instance: cytoscape.Core) {
  instance.nodes('[type="group"]').removeClass('group-focused group-dimmed');
  instance.nodes().not('[type="group"]').removeClass('group-faded');
  instance.edges().removeClass('group-faded');
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

  // Click node — select + show details
  instance.on('tap', 'node', (evt) => {
    if (evt.target.data('type') === 'group') return;
    const nodeId = evt.target.id();
    instance.nodes().removeClass('selected-node selected-neighbor');
    instance.edges().removeClass('selected-connected');
    evt.target.addClass('selected-node');
    evt.target.connectedEdges().addClass('selected-connected');
    evt.target.neighborhood('node').addClass('selected-neighbor');
    emit('nodeClick', nodeId);
  });

  // Click group — focus mode: dim everything else, zoom in
  instance.on('tap', 'node[type="group"]', (evt) => {
    const target = evt.target;

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

    // Focus this group
    clearFocusMode(instance);
    target.addClass('group-focused');

    // Children of focused group (recursive — includes nested subgroups)
    const children = target.descendants();

    // Dim other groups, but NOT subgroups inside the focused parent
    const childGroupIds = new Set(children.filter('[type="group"]').map((n: any) => n.id()));
    instance.nodes('[type="group"]').forEach((g: any) => {
      if (g.id() !== target.id() && !childGroupIds.has(g.id())) {
        g.addClass('group-dimmed');
      }
    });
    const childIds = new Set(children.map((n: any) => n.id()));

    // Dim non-member nodes
    instance.nodes().not('[type="group"]').forEach((n: any) => {
      if (!childIds.has(n.id())) n.addClass('group-faded');
    });

    // Dim unrelated edges
    instance.edges().forEach((e: any) => {
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

  // Click background — clear all
  instance.on('tap', (evt) => {
    if (evt.target === instance) {
      instance.nodes().removeClass('selected-node selected-neighbor');
      instance.edges().removeClass('selected-connected');
      clearFocusMode(instance);
    }
  });

  // Hover focus: 3-tier dim model (skip during impact analysis)
  instance.on('mouseover', 'node', (evt) => {
    const node = evt.target;
    if (node.data('type') === 'group') return;
    if (instance.nodes('.impact-root').length > 0) return;

    // Tier 3: dim everything
    instance.nodes().addClass('hover-dimmed');
    instance.edges().addClass('hover-dimmed');

    // Tier 1: focus node
    node.removeClass('hover-dimmed').addClass('hover-focus');

    // Tier 2: connected neighbors + edges
    const neighbors = node.neighborhood('node').not('[type="group"]');
    neighbors.removeClass('hover-dimmed').addClass('hover-neighbor');
    node.connectedEdges().removeClass('hover-dimmed').addClass('hover-connected');

    // Keep parent groups of visible nodes visible
    node.union(neighbors).forEach((n: any) => {
      const parent = n.parent();
      if (parent.length) parent.removeClass('hover-dimmed');
    });
  });

  instance.on('mouseout', 'node', (evt) => {
    if (evt.target.data('type') === 'group') return;
    instance.elements().removeClass('hover-focus hover-neighbor hover-dimmed hover-connected');
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
  clearFocusMode(instance);

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
