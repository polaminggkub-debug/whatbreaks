<script setup lang="ts">
import { computed } from 'vue';
import type { Graph, GraphNode, AnalysisMode, FailingResult, RefactorResult } from '../../types/graph';
import { LAYER_COLORS, IMPACT_COLORS, DEPTH_LAYER_COLORS, DEPTH_LAYER_LABELS, TEST_LEVEL_COLORS } from '../utils/constants';
import { tracePath, getEdgeRelation } from '../composables/useImpact';
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
  navigateToNode: [nodeId: string];
  highlightEdge: [sourceId: string, targetId: string];
  clearEdgeHighlight: [];
}>();

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
  return IMPACT_COLORS[props.impact.status] ?? '#64748b';
});

const depthColor = computed(() =>
  DEPTH_LAYER_COLORS[props.node.layerIndex ?? 0] ?? '#64748b'
);
const depthLabel = computed(() =>
  DEPTH_LAYER_LABELS[props.node.layerIndex ?? 0] ?? 'Unknown'
);

const coveringTests = computed(() => {
  if (!props.graph) return [];
  return props.graph.edges
    .filter(e => e.type === 'test-covers' && e.target === props.node.id)
    .map(e => {
      const testNode = props.graph!.nodes.find(n => n.id === e.source);
      return { id: e.source, label: testNode ? testNode.label : e.source };
    });
});

const importedBy = computed(() => {
  if (!props.graph) return [];
  return props.graph.edges
    .filter(e => e.type === 'import' && e.target === props.node.id)
    .map(e => {
      const srcNode = props.graph!.nodes.find(n => n.id === e.source);
      return { id: e.source, label: srcNode ? srcNode.label : e.source };
    });
});

/** Compute the impact path from selected node to the impact root */
const impactPath = computed(() => {
  if (!props.graph || !props.impact || !props.highlightResult) return [];
  // Don't show path for root node or unaffected nodes
  if (props.impact.status === 'root' || props.impact.status === 'unaffected') return [];

  const rootId = props.highlightResult.mode === 'failing'
    ? (props.highlightResult as FailingResult).test
    : (props.highlightResult as RefactorResult).file;

  const path = tracePath(props.graph, props.node.id, rootId);
  if (path.length < 2) return []; // No meaningful path

  return path.map((id, i) => {
    const node = props.graph!.nodes.find(n => n.id === id);
    const relation = i < path.length - 1
      ? getEdgeRelation(props.graph!, id, path[i + 1])
      : '';
    const isFirst = i === 0;
    const isLast = i === path.length - 1;
    return {
      id,
      label: node?.label ?? id.split('/').pop() ?? id,
      relation,
      tag: isFirst ? 'this file' : isLast ? 'root' : '',
    };
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
      <button class="close-btn" @click="emit('close')" aria-label="Close panel">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
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

      <!-- Layer + Type + Test Level -->
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
        <div v-if="node.type === 'test'">
          <div class="section-label">Test Level</div>
          <span class="badge" :style="{ background: TEST_LEVEL_COLORS[node.testLevel ?? 'unit'] ?? '#94a3b8' }">
            {{ node.testLevel ?? 'unit' }}
          </span>
        </div>
      </div>

      <!-- Depth & Fan-in -->
      <div class="section row-section" v-if="node.depth !== undefined">
        <div>
          <div class="section-label">Depth</div>
          <span class="metric">{{ node.depth }}</span>
        </div>
        <div>
          <div class="section-label">Arch Layer</div>
          <span class="badge" :style="{ background: depthColor }">
            {{ depthLabel }}
          </span>
        </div>
        <div>
          <div class="section-label">Fan-in</div>
          <span class="metric">{{ node.fanIn ?? 0 }}</span>
        </div>
      </div>

      <!-- Impact status -->
      <div class="section" v-if="impact">
        <div class="section-label">Impact Status</div>
        <div class="impact-status">
          <span class="impact-dot" :class="{ pulse: impact?.status === 'root' }" :style="{ background: impactColor }"></span>
          <span class="impact-text">{{ impactLabel }}</span>
        </div>
        <div class="impact-reason">{{ impact.reason }}</div>
      </div>

      <!-- Impact path trace ("Why is this file affected?") -->
      <div class="section" v-if="impactPath.length > 0">
        <div class="section-label">Why This File Is Affected</div>
        <div class="impact-chain">
          <div
            v-for="(step, i) in impactPath"
            :key="step.id"
            class="chain-step"
            @click="emit('navigateToNode', step.id)"
            @mouseenter="i < impactPath.length - 1 ? emit('highlightEdge', step.id, impactPath[i + 1].id) : undefined"
            @mouseleave="emit('clearEdgeHighlight')"
          >
            <span v-for="_ in i" :key="_" class="chain-indent"></span>
            <span class="chain-connector" v-if="i > 0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2">
                <polyline points="6,4 6,16 18,16" />
                <polyline points="14,12 18,16 14,20" />
              </svg>
            </span>
            <span class="chain-relation" v-if="i > 0">{{ impactPath[i - 1].relation }}</span>
            <span class="chain-file">{{ step.label }}</span>
            <span v-if="step.tag === 'this file'" class="chain-tag">this file</span>
            <span v-if="step.tag === 'root'" class="chain-tag root">root</span>
          </div>
        </div>
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
          <li v-for="dep in importedBy" :key="dep.id" class="dep-item dep-link" @click="emit('navigateToNode', dep.id)">{{ dep.label }}</li>
        </ul>
      </div>

      <!-- Covering tests -->
      <div class="section" v-if="coveringTests.length > 0">
        <div class="section-label">Tests covering this file ({{ coveringTests.length }})</div>
        <ul class="test-list">
          <li v-for="t in coveringTests" :key="t.id" class="test-item dep-link" @click="emit('navigateToNode', t.id)">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#14b8a6" stroke="none">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            {{ t.label }}
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
  box-shadow: -6px 0 24px rgba(0, 0, 0, 0.5);
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
  font-family: 'Fira Code', monospace;
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
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}

.close-btn:hover {
  color: #e2e8f0;
  background: #334155;
}

.close-btn:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
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
  padding-left: 8px;
  border-left: 2px solid #334155;
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
  font-family: 'Fira Code', monospace;
  font-size: 12px;
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
  letter-spacing: 0.3px;
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
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.impact-dot.pulse {
  animation: impact-pulse 1.5s ease-in-out infinite;
}

@keyframes impact-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
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

.func-list, .test-list, .dep-list { list-style: none; padding: 0; margin: 0; }
.func-item { padding: 4px 8px; font-size: 12px; background: #0f172a; border-radius: 4px; margin-bottom: 3px; }
.func-item code { font-family: 'Fira Code', monospace; color: #a5b4fc; }
.dep-item { padding: 4px 0; font-size: 12px; color: #94a3b8; border-bottom: 1px solid #1e293b; }
.dep-link { cursor: pointer; padding: 4px 6px; border-radius: 4px; transition: background 0.15s, color 0.15s; }
.dep-link:hover { background: #0f172a; color: #a5b4fc; }
.test-item { display: flex; align-items: center; gap: 6px; padding: 4px 6px; font-size: 12px; color: #94a3b8; border-radius: 4px; transition: background 0.15s; }
.test-item:hover { background: #0f172a; }
.no-tests { font-size: 12px; color: #475569; font-style: italic; }
.metric { font-family: 'Fira Code', monospace; font-size: 18px; font-weight: 700; color: #e2e8f0; }

/* Impact path trace chain */
.impact-chain { background: #0f172a; border-radius: 6px; border: 1px solid #334155; padding: 8px 6px; }
.chain-step { display: flex; align-items: center; gap: 4px; padding: 4px 6px; border-radius: 4px; cursor: pointer; transition: background 0.15s, color 0.15s; }
.chain-step:hover { background: #1e293b; }
.chain-indent { width: 14px; flex-shrink: 0; }
.chain-connector { flex-shrink: 0; display: flex; align-items: center; }
.chain-relation { font-size: 10px; color: #64748b; flex-shrink: 0; font-style: italic; }
.chain-file { font-family: 'Fira Code', monospace; font-size: 12px; color: #cbd5e1; }
.chain-step:hover .chain-file { color: #a5b4fc; }
.chain-tag { font-size: 9px; padding: 1px 6px; border-radius: 8px; background: #334155; color: #94a3b8; flex-shrink: 0; margin-left: auto; }
.chain-tag.root { background: #dc2626; color: #fff; }

@media (prefers-reduced-motion: reduce) {
  .impact-dot.pulse {
    animation: none;
  }
}
</style>
