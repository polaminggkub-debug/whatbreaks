<script setup lang="ts">
import { DEPTH_LAYERS, IMPACTS } from '../utils/constants';
</script>

<template>
  <div class="legend">
    <div class="legend-group">
      <span class="legend-title">Layers:</span>
      <div v-for="item in DEPTH_LAYERS" :key="item.key" class="legend-item">
        <span class="legend-dot" :style="{ background: item.color }"></span>
        <span class="legend-label">{{ item.label }}</span>
      </div>
    </div>
    <div class="legend-separator"></div>
    <div class="legend-group">
      <span class="legend-title">Impact:</span>
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

.legend-label {
  font-size: 12px;
  color: #94a3b8;
}

.legend-separator {
  width: 1px;
  height: 18px;
  background: #334155;
}
</style>
