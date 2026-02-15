<script setup lang="ts">
import { computed } from 'vue';
import type { Graph, GraphNode, AnalysisMode, FailingResult, RefactorResult } from '../../types/graph';
import TestCommand from './TestCommand.vue';

const props = defineProps<{
  node: GraphNode;
  impact: { status: string; reason: string } | null;
  mode: AnalysisMode;
  graph: Graph | null;
  highlightResult?: FailingResult | RefactorResult | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const LAYER_COLORS: Record<string, string> = {
  page: '#6366f1',
  ui: '#3b82f6',
  feature: '#8b5cf6',
  entity: '#a855f7',
  shared: '#06b6d4',
  test: '#14b8a6',
  config: '#64748b',
};

const impactLabel = computed(() => {
  if (!props.impact) return null;
  const labels: Record<string, string> = {
    root: 'Root cause',
    direct: 'Directly affected',
    indirect: 'Indirectly affected',
    unaffected: 'Not affected',
  };
  return labels[props.impact.status] ?? props.impact.status;
});

const impactColor = computed(() => {
  if (!props.impact) return '#64748b';
  const colors: Record<string, string> = {
    root: '#ef4444',
    direct: '#f59e0b',
    indirect: '#eab308',
    unaffected: '#64748b',
  };
  return colors[props.impact.status] ?? '#64748b';
});

const coveringTests = computed(() => {
  if (!props.graph) return [];
  return props.graph.edges
    .filter(e => e.type === 'test-covers' && e.target === props.node.id)
    .map(e => {
      const testNode = props.graph!.nodes.find(n => n.id === e.source);
      return testNode ? testNode.label : e.source;
    });
});

const importedBy = computed(() => {
  if (!props.graph) return [];
  return props.graph.edges
    .filter(e => e.type === 'import' && e.target === props.node.id)
    .map(e => {
      const srcNode = props.graph!.nodes.find(n => n.id === e.source);
      return srcNode ? srcNode.label : e.source;
    });
});

const suggestedCommand = computed(() => {
  if (props.mode !== 'refactor' || !props.highlightResult) return null;
  if (props.highlightResult.mode === 'refactor') {
    return (props.highlightResult as RefactorResult).suggested_test_command || null;
  }
  return null;
});

function copyPath() {
  navigator.clipboard.writeText(props.node.id);
}
</script>

<template>
  <aside class="node-panel">
    <div class="panel-header">
      <h3 class="panel-title">File Details</h3>
      <button class="close-btn" @click="emit('close')" aria-label="Close panel">&times;</button>
    </div>

    <div class="panel-body">
      <!-- File path -->
      <div class="section">
        <div class="section-label">Path</div>
        <div class="file-path" @click="copyPath" title="Click to copy">
          <code>{{ node.id }}</code>
          <span class="copy-hint">click to copy</span>
        </div>
      </div>

      <!-- Layer + Type -->
      <div class="section row-section">
        <div>
          <div class="section-label">Layer</div>
          <span class="badge" :style="{ background: LAYER_COLORS[node.layer] ?? '#64748b' }">
            {{ node.layer }}
          </span>
        </div>
        <div>
          <div class="section-label">Type</div>
          <span class="badge type-badge">{{ node.type }}</span>
        </div>
      </div>

      <!-- Impact status -->
      <div class="section" v-if="impact">
        <div class="section-label">Impact Status</div>
        <div class="impact-status">
          <span class="impact-dot" :style="{ background: impactColor }"></span>
          <span class="impact-text">{{ impactLabel }}</span>
        </div>
        <div class="impact-reason">{{ impact.reason }}</div>
      </div>

      <!-- Exported functions -->
      <div class="section" v-if="node.functions.length > 0">
        <div class="section-label">Exports ({{ node.functions.length }})</div>
        <ul class="func-list">
          <li v-for="fn in node.functions" :key="fn" class="func-item">
            <code>{{ fn }}</code>
          </li>
        </ul>
      </div>

      <!-- Imported by -->
      <div class="section" v-if="importedBy.length > 0">
        <div class="section-label">Imported by ({{ importedBy.length }})</div>
        <ul class="dep-list">
          <li v-for="dep in importedBy" :key="dep" class="dep-item">{{ dep }}</li>
        </ul>
      </div>

      <!-- Covering tests -->
      <div class="section" v-if="coveringTests.length > 0">
        <div class="section-label">Tests covering this file ({{ coveringTests.length }})</div>
        <ul class="test-list">
          <li v-for="t in coveringTests" :key="t" class="test-item">
            <span class="test-icon">&#9654;</span>
            {{ t }}
          </li>
        </ul>
      </div>
      <div class="section" v-else-if="node.type === 'source'">
        <div class="section-label">Tests</div>
        <div class="no-tests">No tests cover this file</div>
      </div>

      <!-- Test command -->
      <div class="section" v-if="suggestedCommand">
        <div class="section-label">Suggested Test Command</div>
        <TestCommand :command="suggestedCommand" />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.node-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 350px;
  height: 100%;
  background: #1e293b;
  border-left: 1px solid #334155;
  display: flex;
  flex-direction: column;
  z-index: 50;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #334155;
  flex-shrink: 0;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 22px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

.close-btn:hover {
  color: #e2e8f0;
  background: #334155;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.panel-body::-webkit-scrollbar {
  width: 6px;
}

.panel-body::-webkit-scrollbar-track {
  background: transparent;
}

.panel-body::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 3px;
}

.section {
  margin-bottom: 20px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.row-section {
  display: flex;
  gap: 24px;
}

.file-path {
  background: #0f172a;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid #334155;
  transition: border-color 0.15s;
  position: relative;
  word-break: break-all;
}

.file-path:hover {
  border-color: #6366f1;
}

.file-path code {
  color: #e2e8f0;
}

.copy-hint {
  display: block;
  font-size: 10px;
  color: #475569;
  margin-top: 4px;
}

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

.type-badge {
  background: #475569;
}

.impact-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.impact-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.impact-text {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
}

.impact-reason {
  font-size: 12px;
  color: #94a3b8;
  padding-left: 18px;
}

.func-list,
.test-list,
.dep-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.func-item {
  padding: 4px 8px;
  font-size: 12px;
  background: #0f172a;
  border-radius: 4px;
  margin-bottom: 3px;
}

.func-item code {
  color: #a5b4fc;
}

.dep-item {
  padding: 4px 0;
  font-size: 12px;
  color: #94a3b8;
  border-bottom: 1px solid #1e293b;
}

.test-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  font-size: 12px;
  color: #94a3b8;
}

.test-icon {
  color: #14b8a6;
  font-size: 8px;
}

.no-tests {
  font-size: 12px;
  color: #475569;
  font-style: italic;
}
</style>
