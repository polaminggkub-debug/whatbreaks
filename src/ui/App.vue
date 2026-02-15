<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import type { Graph, GraphNode, FailingResult, RefactorResult } from '../types/graph';
import GraphView from './components/GraphView.vue';
import NodePanel from './components/NodePanel.vue';
import ModeToggle from './components/ModeToggle.vue';
import SearchBar from './components/SearchBar.vue';
import Legend from './components/Legend.vue';
import ViewControls from './components/ViewControls.vue';
import { useImpact } from './composables/useImpact';
import { useMode } from './composables/useMode';
import { useDevSocket } from './composables/useDevSocket';

const graph = ref<Graph | null>(null);
const selectedNode = ref<GraphNode | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const { mode, selectedTarget, setTarget, clear: clearMode } = useMode();

const layoutMode = ref<'dagre' | 'cose'>('dagre');
const showTests = ref(true);
const showFoundation = ref(true);
const sizeMode = ref<'fanIn' | 'uniform'>('fanIn');
const { highlightResult, analyzeFailure, analyzeRefactor, clearHighlight } = useImpact(graph);
const { isDevMode, isConnected, devGraph, devFailure } = useDevSocket();

// When dev socket provides a graph, use it
watch(devGraph, (newGraph) => {
  if (newGraph) graph.value = newGraph;
});

// When dev socket pushes a failure update, apply highlight
watch(devFailure, (newFailure) => {
  if (newFailure) {
    mode.value = 'failing';
    highlightResult.value = newFailure;
  }
});

onMounted(async () => {
  // If dev mode detected by useDevSocket, graph comes from /api/state
  // Otherwise fall back to /api/graph (static serve mode)
  try {
    const res = await fetch('/api/graph');
    if (!res.ok) throw new Error(`Failed to load graph: ${res.status}`);
    if (!graph.value) {
      graph.value = await res.json();
    }
  } catch (e) {
    if (!graph.value) {
      error.value = e instanceof Error ? e.message : 'Failed to load graph data';
    }
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
      <div class="topbar-left">
        <div class="logo">
          <svg class="logo-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#logo-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <defs>
              <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ef4444" />
                <stop offset="100%" stop-color="#f59e0b" />
              </linearGradient>
            </defs>
            <polygon points="12 2, 22 8.5, 22 15.5, 12 22, 2 15.5, 2 8.5" />
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="8.5" x2="22" y2="8.5" />
          </svg>
          <span class="logo-text">WhatBreaks</span>
        </div>

        <!-- Dev mode live indicator -->
        <div v-if="isDevMode" class="dev-badge" :class="{ connected: isConnected }">
          <span class="dev-dot"></span>
          <span class="dev-label">{{ isConnected ? 'LIVE' : 'RECONNECTING' }}</span>
        </div>
      </div>

      <div class="topbar-center">
        <ModeToggle
          :modelValue="mode"
          :nodes="graph?.nodes ?? []"
          @update:modelValue="onModeChange"
          @analyze="onAnalyze"
        />
      </div>

      <div class="topbar-right">
        <SearchBar :nodes="graph?.nodes ?? []" @select="onNodeSelect" />
        <ViewControls
          :layout="layoutMode"
          :showTests="showTests"
          :showFoundation="showFoundation"
          :sizeMode="sizeMode"
          @update:layout="layoutMode = $event"
          @update:showTests="showTests = $event"
          @update:showFoundation="showFoundation = $event"
          @update:sizeMode="sizeMode = $event"
        />
      </div>
    </header>

    <main id="main" class="main">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading dependency graph...</p>
      </div>
      <div v-else-if="error" class="error-state">
        <svg class="error-icon-svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p>{{ error }}</p>
        <p class="error-hint">Make sure the WhatBreaks server is running.</p>
      </div>
      <GraphView
        v-else-if="graph"
        :graph="graph"
        :mode="mode"
        :highlightResult="highlightResult"
        :layoutMode="layoutMode"
        :showTests="showTests"
        :showFoundation="showFoundation"
        :sizeMode="sizeMode"
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
  font-family: 'Fira Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
  flex-wrap: wrap;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.topbar-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
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
  flex-shrink: 0;
}

.logo-text {
  font-family: 'Fira Code', monospace;
  background: linear-gradient(135deg, #ef4444, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Dev mode indicator */
.dev-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  flex-shrink: 0;
  transition: all 0.3s;
}

.dev-badge.connected {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.3);
}

.dev-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
}

.dev-badge.connected .dev-dot {
  background: #22c55e;
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
  50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
}

.dev-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #ef4444;
}

.dev-badge.connected .dev-label {
  color: #22c55e;
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
  font-size: 15px;
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

.error-icon-svg {
  opacity: 0.8;
}

.error-hint,
.empty-hint {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
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
  font-family: 'Fira Code', monospace;
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

@media (prefers-reduced-motion: reduce) {
  .spinner { animation: none; }
  .dev-dot { animation: none; }
  .slide-enter-active,
  .slide-leave-active { transition: none; }
}
</style>
