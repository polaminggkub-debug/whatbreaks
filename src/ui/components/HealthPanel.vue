<script setup lang="ts">
import { ref } from 'vue';
import type { HealthReport } from '../../types/graph';

defineProps<{
  report: HealthReport;
}>();

const emit = defineEmits<{
  close: [];
  simulateBreak: [fileId: string];
  analyzeTest: [testId: string];
  highlightCycle: [cycle: string[]];
}>();

const showHotspots = ref(true);
const showChains = ref(true);
const showCircular = ref(true);

function shortName(filePath: string): string {
  return filePath.split('/').pop() ?? filePath;
}

const riskColors: Record<string, string> = { high: '#dc2626', medium: '#f59e0b', low: '#2dd4bf' };
</script>

<template>
  <aside class="health-panel">
    <div class="hp-header">
      <h3 class="hp-title">Codebase Health</h3>
      <button class="hp-close" @click="emit('close')" aria-label="Close health panel">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <div class="hp-body">
      <!-- Hotspots -->
      <div class="hp-section">
        <div class="hp-section-hdr" @click="showHotspots = !showHotspots">
          <span class="hp-section-label">Hotspots ({{ report.hotspots.length }})</span>
          <span class="hp-toggle">{{ showHotspots ? '\u25BC' : '\u25B6' }}</span>
        </div>
        <div v-if="showHotspots" class="hp-section-body">
          <div v-for="h in report.hotspots" :key="h.file" class="hp-item" @click="emit('simulateBreak', h.file)">
            <div class="hp-item-row">
              <code class="hp-file">{{ shortName(h.file) }}</code>
              <span class="hp-risk-badge" :style="{ background: riskColors[h.riskLevel] }">{{ h.riskLevel.toUpperCase() }}</span>
            </div>
            <div class="hp-meta">Fan-in: {{ h.fanIn }} &middot; Tests: {{ h.testsAtRisk }}</div>
          </div>
          <div v-if="report.hotspots.length === 0" class="hp-empty">No hotspots detected</div>
        </div>
      </div>

      <!-- Fragile Chains -->
      <div class="hp-section">
        <div class="hp-section-hdr" @click="showChains = !showChains">
          <span class="hp-section-label">Fragile Chains ({{ report.fragileChains.length }})</span>
          <span class="hp-toggle">{{ showChains ? '\u25BC' : '\u25B6' }}</span>
        </div>
        <div v-if="showChains" class="hp-section-body">
          <div v-for="c in report.fragileChains" :key="c.test" class="hp-item hp-item-warn" @click="emit('analyzeTest', c.test)">
            <div class="hp-item-row">
              <code class="hp-file">{{ shortName(c.test) }}</code>
            </div>
            <div class="hp-meta">Chain depth: {{ c.chainDepth }}</div>
            <div class="hp-meta">Deepest: {{ shortName(c.deepestDep) }}</div>
          </div>
          <div v-if="report.fragileChains.length === 0" class="hp-empty">No fragile chains found</div>
        </div>
      </div>

      <!-- Circular Dependencies -->
      <div class="hp-section">
        <div class="hp-section-hdr" @click="showCircular = !showCircular">
          <span class="hp-section-label">Circular Deps ({{ report.circularDeps.length }})</span>
          <span class="hp-toggle">{{ showCircular ? '\u25BC' : '\u25B6' }}</span>
        </div>
        <div v-if="showCircular" class="hp-section-body">
          <div v-for="(cd, i) in report.circularDeps" :key="i" class="hp-item hp-item-cycle" @click="emit('highlightCycle', cd.cycle)">
            <code class="hp-cycle-text">{{ cd.cycle.map(shortName).join(' \u2192 ') }}</code>
          </div>
          <div v-if="report.circularDeps.length === 0" class="hp-empty">No circular dependencies</div>
        </div>
      </div>
    </div>

    <div class="hp-footer">
      {{ report.sourceFiles }} source &middot; {{ report.testFiles }} tests &middot; {{ report.edges }} edges
    </div>
  </aside>
</template>

<style scoped>
.health-panel { position: absolute; top: 0; left: 0; width: 320px; height: 100%; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column; z-index: 50; box-shadow: 6px 0 24px rgba(0,0,0,0.5); }
.hp-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #334155; flex-shrink: 0; }
.hp-title { font-family: 'Fira Code', monospace; font-size: 14px; font-weight: 600; color: #e2e8f0; text-transform: uppercase; letter-spacing: 0.5px; }
.hp-close { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: color 0.15s, background 0.15s; }
.hp-close:hover { color: #e2e8f0; background: #334155; }
.hp-body { flex: 1; overflow-y: auto; padding: 12px 16px; }
.hp-body::-webkit-scrollbar { width: 6px; }
.hp-body::-webkit-scrollbar-track { background: transparent; }
.hp-body::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
.hp-section { margin-bottom: 16px; }
.hp-section-hdr { display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 6px 8px; border-radius: 4px; transition: background 0.15s; user-select: none; }
.hp-section-hdr:hover { background: #0f172a; }
.hp-section-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; padding-left: 8px; border-left: 2px solid #334155; }
.hp-toggle { font-size: 10px; color: #475569; }
.hp-section-body { margin-top: 6px; }
.hp-item { padding: 8px 10px; border-radius: 6px; cursor: pointer; transition: background 0.15s; margin-bottom: 4px; }
.hp-item:hover { background: #0f172a; }
.hp-item-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.hp-file { font-family: 'Fira Code', monospace; font-size: 12px; color: #e2e8f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hp-risk-badge { display: inline-block; padding: 1px 8px; border-radius: 8px; font-size: 10px; font-weight: 700; color: #fff; letter-spacing: 0.5px; flex-shrink: 0; }
.hp-meta { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.hp-item-warn .hp-file { color: #f59e0b; }
.hp-item-cycle { padding: 6px 10px; }
.hp-cycle-text { font-family: 'Fira Code', monospace; font-size: 11px; color: #f87171; word-break: break-all; }
.hp-empty { font-size: 12px; color: #475569; font-style: italic; padding: 4px 10px; }
.hp-footer { flex-shrink: 0; padding: 12px 20px; border-top: 1px solid #334155; font-size: 11px; color: #64748b; text-align: center; }
</style>
