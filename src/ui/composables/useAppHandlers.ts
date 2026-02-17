import { ref, computed, type Ref } from 'vue';
import type { Graph, GraphNode, FailingResult, RefactorResult } from '../../types/graph.js';
import type GraphView from '../components/GraphView.vue';
import type { UseImpactReturn } from './useImpact.js';
import type { UseModeReturn } from './useMode.js';

export interface CtxMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string;
  nodeLabel: string;
}

export function useAppHandlers(
  graph: Ref<Graph | null>,
  selectedNode: Ref<GraphNode | null>,
  graphViewRef: Ref<InstanceType<typeof GraphView> | null>,
  impact: UseImpactReturn,
  modeState: UseModeReturn,
  showHealth: Ref<boolean>,
) {
  const { mode, setTarget, clear: clearMode } = modeState;
  const { highlightResult, analyzeFailure, analyzeRefactor, clearHighlight } = impact;

  // Context menu state
  const ctxMenu = ref<CtxMenuState>({ visible: false, x: 0, y: 0, nodeId: '', nodeLabel: '' });
  // Break simulation toast
  const simResult = ref<RefactorResult | null>(null);

  // --- Node impact computed ---
  const nodeImpact = computed(() => {
    if (!selectedNode.value || !highlightResult.value) return null;
    const result = highlightResult.value;
    const nodeId = selectedNode.value.id;

    if (result.mode === 'failing') {
      const failing = result as FailingResult;
      if (failing.test === nodeId) return { status: 'root', reason: 'This is the failing test' };
      const chainNode = failing.chain.find(c => c.nodeId === nodeId);
      if (chainNode) {
        if (chainNode.depth === 1) return { status: 'direct', reason: 'Directly tested by the failing test' };
        return { status: 'indirect', reason: `Indirectly affected (depth ${chainNode.depth})` };
      }
      if (failing.otherTestsAtRisk.includes(nodeId)) return { status: 'indirect', reason: 'Another test at risk' };
      return { status: 'unaffected', reason: 'Not affected by this failure' };
    }

    if (result.mode === 'refactor') {
      const refactor = result as RefactorResult;
      if (refactor.file === nodeId) return { status: 'root', reason: 'This is the file being refactored' };
      if (refactor.direct_importers.includes(nodeId)) return { status: 'direct', reason: 'Directly imports the refactored file' };
      if (refactor.transitive_affected.includes(nodeId)) return { status: 'indirect', reason: 'Transitively affected by the refactor' };
      if (refactor.tests_to_run.includes(nodeId)) return { status: 'direct', reason: 'Test that should be run' };
      return { status: 'unaffected', reason: 'Not affected by this refactor' };
    }

    return null;
  });

  // --- Event handlers ---
  function onNodeClick(nodeId: string) {
    if (!graph.value) return;
    const node = graph.value.nodes.find(n => n.id === nodeId);
    selectedNode.value = node ?? null;
  }

  function onNodeSelect(nodeId: string) {
    onNodeClick(nodeId);
  }

  function onAnalyze(target: string) {
    setTarget(target);
    if (mode.value === 'failing') {
      analyzeFailure(target);
    } else {
      analyzeRefactor(target);
    }
  }

  function onModeChange(newMode: 'failing' | 'refactor') {
    mode.value = newMode;
    clearHighlight();
    clearMode();
    selectedNode.value = null;
  }

  function onNavigateToNode(nodeId: string) {
    if (!graph.value) return;
    const node = graph.value.nodes.find(n => n.id === nodeId);
    if (!node) return;
    selectedNode.value = node;
    graphViewRef.value?.focusNode(nodeId);
  }

  function onHighlightEdge(sourceId: string, targetId: string) {
    graphViewRef.value?.highlightEdge(sourceId, targetId);
  }

  function onClearEdgeHighlight() {
    graphViewRef.value?.clearEdgeHighlight();
  }

  // --- Context menu & break simulation ---
  function onContextMenu(x: number, y: number, nodeId: string, nodeLabel: string) {
    ctxMenu.value = { visible: true, x, y, nodeId, nodeLabel };
  }

  function onSimulateBreak(nodeId: string) {
    ctxMenu.value.visible = false;
    const result = analyzeRefactor(nodeId);
    if (result) {
      simResult.value = result;
      onNodeClick(nodeId);
    }
  }

  function onClearSimulation() {
    simResult.value = null;
    clearHighlight();
  }

  function onShowImporters(nodeId: string) {
    ctxMenu.value.visible = false;
    onNodeClick(nodeId);
    graphViewRef.value?.focusNode(nodeId);
  }

  function onCopyPath(nodeId: string) {
    ctxMenu.value.visible = false;
    navigator.clipboard.writeText(nodeId);
  }

  // --- Health panel ---
  function onHealthSimulateBreak(fileId: string) {
    showHealth.value = false;
    onSimulateBreak(fileId);
  }

  function onHealthAnalyzeTest(testId: string) {
    showHealth.value = false;
    mode.value = 'failing';
    analyzeFailure(testId);
    onNodeClick(testId);
  }

  function onHealthHighlightCycle(cycle: string[]) {
    graphViewRef.value?.highlightCycle(cycle);
  }

  return {
    ctxMenu,
    simResult,
    nodeImpact,
    onNodeClick,
    onNodeSelect,
    onAnalyze,
    onModeChange,
    onNavigateToNode,
    onHighlightEdge,
    onClearEdgeHighlight,
    onContextMenu,
    onSimulateBreak,
    onClearSimulation,
    onShowImporters,
    onCopyPath,
    onHealthSimulateBreak,
    onHealthAnalyzeTest,
    onHealthHighlightCycle,
  };
}
