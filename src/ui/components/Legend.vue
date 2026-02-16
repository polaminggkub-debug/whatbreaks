<script setup lang="ts">
import { DEPTH_LAYERS, IMPACTS, TEST_PYRAMID_LEGEND } from '../utils/constants';

const emit = defineEmits<{
  filterTestLevel: [level: string | null];
}>();

let activeLevel: string | null = null;

function toggleTestLevel(level: string) {
  if (activeLevel === level) {
    activeLevel = null;
    emit('filterTestLevel', null);
  } else {
    activeLevel = level;
    emit('filterTestLevel', level);
  }
}
</script>

<template>
  <div class="legend">
    <div class="legend-group">
      <span class="legend-title">Structure:</span>
      <div v-for="item in DEPTH_LAYERS" :key="item.key" class="legend-item">
        <span class="legend-dot" :style="{ background: item.color }"></span>
        <span class="legend-label">{{ item.label }}</span>
      </div>
    </div>
    <div class="legend-separator"></div>
    <div class="legend-group">
      <span class="legend-title">Test Pyramid:</span>
      <div class="legend-item legend-clickable" @click="toggleTestLevel('e2e')">
        <svg class="legend-icon" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        <span class="legend-label">E2E</span>
      </div>
      <div class="legend-item legend-clickable" @click="toggleTestLevel('integration')">
        <svg class="legend-icon" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <span class="legend-label">Integration</span>
      </div>
      <div class="legend-item legend-clickable" @click="toggleTestLevel('unit')">
        <svg class="legend-icon" viewBox="0 0 32 32" fill="none"><path fill="#94a3b8" d="M20 4v2h-2v4.531l.264.461 7.473 13.078a2 2 0 0 1 .263.992V26a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-.938a2 2 0 0 1 .264-.992l7.473-13.078.263-.46V6h-2V4zm0-2h-8a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2v2L4.527 23.078A4 4 0 0 0 4 25.062V26a4 4 0 0 0 4 4h16a4 4 0 0 0 4-4v-.938a4 4 0 0 0-.527-1.984L20 10V8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2"/></svg>
        <span class="legend-label">Unit</span>
      </div>
    </div>
    <div class="legend-separator"></div>
    <div class="legend-group">
      <span class="legend-title">Failure Impact:</span>
      <div v-for="item in IMPACTS" :key="item.key" class="legend-item">
        <span class="legend-dot" :style="{ background: item.color }"></span>
        <span class="legend-label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.legend {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.legend-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.legend-title {
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: default;
  transition: background 0.15s;
}

.legend-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.legend-label {
  font-size: 12px;
  color: #94a3b8;
}

.legend-clickable {
  cursor: pointer;
}

.legend-clickable:hover {
  background: rgba(255, 255, 255, 0.1);
}

.legend-separator {
  width: 1px;
  height: 18px;
  background: #334155;
}
</style>
