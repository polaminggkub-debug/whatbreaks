<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Graph, GraphNode, FailingResult, RefactorResult } from '../types/graph';
import GraphView from './components/GraphView.vue';
import NodePanel from './components/NodePanel.vue';
import ModeToggle from './components/ModeToggle.vue';
import SearchBar from './components/SearchBar.vue';
import Legend from './components/Legend.vue';
import { useImpact } from './composables/useImpact';
import { useMode } from './composables/useMode';

const graph = ref<Graph | null>(null);
const selectedNode = ref<GraphNode | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const { mode, selectedTarget, setTarget, clear: clearMode } = useMode();
const { highlightResult, analyzeFailure, analyzeRefactor, clearHighlight } = useImpact(graph);

onMounted(async () => {
  try {
    const res = await fetch('/api/graph');
    if (!res.ok) throw new Error(`Failed to load graph: ${res.status}`);
    graph.value = await res.json();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load graph data';
  } finally {
    loading.value = false;
  }

  try {
    await fetch('/api/config');
  } catch {
    // Config endpoint is optional
  }
});

function onNodeClick(nodeId: string) {
  if (!graph.value) return;
  const node = graph.value.nodes.find(n => n.id === nodeId);
  selectedNode.value = node ?? null;
}

function onNodeSelect(nodeId: string) {
  onNodeClick(nodeId);
}

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
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="logo">
        <span class="logo-icon">&#9670;</span>
        <span class="logo-text">WhatBreaks</span>
      </div>
      <ModeToggle
        :modelValue="mode"
        :nodes="graph?.nodes ?? []"
        @update:modelValue="onModeChange"
        @analyze="onAnalyze"
      />
      <SearchBar :nodes="graph?.nodes ?? []" @select="onNodeSelect" />
    </header>

    <main class="main">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading dependency graph...</p>
      </div>
      <div v-else-if="error" class="error-state">
        <p class="error-icon">!</p>
        <p>{{ error }}</p>
        <p class="error-hint">Make sure the WhatBreaks server is running.</p>
      </div>
      <GraphView
        v-else-if="graph"
        :graph="graph"
        :mode="mode"
        :highlightResult="highlightResult"
        @nodeClick="onNodeClick"
      />
      <div v-else class="empty-state">
        <p>No graph data available.</p>
        <p class="empty-hint">Run <code>whatbreaks scan</code> first to generate the dependency graph.</p>
      </div>

      <transition name="slide">
        <NodePanel
          v-if="selectedNode"
          :node="selectedNode"
          :impact="nodeImpact"
          :mode="mode"
          :graph="graph"
          :highlightResult="highlightResult"
          @close="selectedNode = null"
        />
      </transition>
    </main>

    <footer class="bottombar">
      <Legend />
      <div class="stats" v-if="graph">
        {{ graph.nodes.length }} files &middot; {{ graph.edges.length }} connections
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background: #0f172a;
  color: #e2e8f0;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  z-index: 100;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 18px;
  white-space: nowrap;
}

.logo-icon {
  color: #ef4444;
  font-size: 20px;
}

.logo-text {
  background: linear-gradient(135deg, #ef4444, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.main {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: #94a3b8;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #334155;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #7f1d1d;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
}

.error-hint,
.empty-hint {
  font-size: 13px;
  color: #64748b;
}

.empty-hint code {
  background: #334155;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.bottombar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: #1e293b;
  border-top: 1px solid #334155;
  font-size: 12px;
  color: #94a3b8;
  z-index: 100;
  flex-shrink: 0;
}

.stats {
  white-space: nowrap;
}

.slide-enter-active {
  transition: transform 0.25s ease-out, opacity 0.25s ease-out;
}
.slide-leave-active {
  transition: transform 0.2s ease-in, opacity 0.2s ease-in;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
