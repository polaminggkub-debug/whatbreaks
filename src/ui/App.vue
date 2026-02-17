<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { Graph, GraphNode } from '../types/graph';
import GraphView from './components/GraphView.vue';
import NodePanel from './components/NodePanel.vue';
import ModeToggle from './components/ModeToggle.vue';
import SearchBar from './components/SearchBar.vue';
import Legend from './components/Legend.vue';
import ViewControls from './components/ViewControls.vue';
import ContextMenu from './components/ContextMenu.vue';
import ImpactToast from './components/ImpactToast.vue';
import HealthPanel from './components/HealthPanel.vue';
import { useImpact } from './composables/useImpact';
import { useHealth } from './composables/useHealth';
import { useMode } from './composables/useMode';
import { useDevSocket } from './composables/useDevSocket';
import { useAppHandlers } from './composables/useAppHandlers';

const graph = ref<Graph | null>(null);
const selectedNode = ref<GraphNode | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const graphViewRef = ref<InstanceType<typeof GraphView> | null>(null);

const modeState = useMode();
const { mode, selectedTarget } = modeState;

const layoutMode = ref<'dagre' | 'cose'>('dagre');
const showTests = ref(true);
const showFoundation = ref(true);
const sizeMode = ref<'fanIn' | 'uniform'>('fanIn');
const impact = useImpact(graph);
const { highlightResult } = impact;
const { healthReport } = useHealth(graph);
const { isDevMode, isConnected, devGraph, devFailure } = useDevSocket();

const showHealth = ref(false);

const {
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
} = useAppHandlers(graph, selectedNode, graphViewRef, impact, modeState, showHealth);

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
          :showHealth="showHealth"
          @update:layout="layoutMode = $event"
          @update:showTests="showTests = $event"
          @update:showFoundation="showFoundation = $event"
          @update:sizeMode="sizeMode = $event"
          @update:showHealth="showHealth = $event"
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
        ref="graphViewRef"
        :graph="graph"
        :mode="mode"
        :highlightResult="highlightResult"
        :layoutMode="layoutMode"
        :showTests="showTests"
        :showFoundation="showFoundation"
        :sizeMode="sizeMode"
        @nodeClick="onNodeClick"
        @contextMenu="onContextMenu"
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
          @navigateToNode="onNavigateToNode"
          @highlightEdge="onHighlightEdge"
          @clearEdgeHighlight="onClearEdgeHighlight"
        />
      </transition>

      <!-- Health panel (left side) -->
      <transition name="slide-left">
        <HealthPanel
          v-if="showHealth && healthReport"
          :report="healthReport"
          @close="showHealth = false"
          @simulateBreak="onHealthSimulateBreak"
          @analyzeTest="onHealthAnalyzeTest"
          @highlightCycle="onHealthHighlightCycle"
        />
      </transition>

      <!-- Break simulation toast -->
      <ImpactToast
        v-if="simResult"
        :result="simResult"
        @clear="onClearSimulation"
      />

      <!-- Context menu -->
      <ContextMenu
        :visible="ctxMenu.visible"
        :x="ctxMenu.x"
        :y="ctxMenu.y"
        :nodeId="ctxMenu.nodeId"
        :nodeLabel="ctxMenu.nodeLabel"
        @close="ctxMenu.visible = false"
        @simulateBreak="onSimulateBreak"
        @showImporters="onShowImporters"
        @copyPath="onCopyPath"
      />
    </main>

    <footer class="bottombar">
      <Legend />
      <div class="stats" v-if="graph">
        {{ graph.nodes.length }} files &middot; {{ graph.edges.length }} connections
        <template v-if="graph.groups?.length">
          &middot; {{ graph.groups.length }} groups
        </template>
      </div>
    </footer>
  </div>
</template>

<style scoped src="./styles/app-styles.css"></style>
