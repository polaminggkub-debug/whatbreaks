<script setup lang="ts">
const layers = [
  { label: 'Page', color: '#6366f1' },
  { label: 'UI', color: '#3b82f6' },
  { label: 'Feature', color: '#8b5cf6' },
  { label: 'Entity', color: '#a855f7' },
  { label: 'Shared', color: '#06b6d4' },
  { label: 'Test', color: '#14b8a6' },
  { label: 'Config', color: '#64748b' },
];

const impacts = [
  { label: 'Root', color: '#ef4444' },
  { label: 'Direct', color: '#f59e0b' },
  { label: 'Indirect', color: '#eab308' },
];
</script>

<template>
  <div class="legend">
    <div class="legend-group">
      <span class="legend-title">Layers:</span>
      <div v-for="item in layers" :key="item.label" class="legend-item">
        <span class="legend-dot" :style="{ background: item.color }"></span>
        <span class="legend-label">{{ item.label }}</span>
      </div>
    </div>
    <div class="legend-separator"></div>
    <div class="legend-group">
      <span class="legend-title">Impact:</span>
      <div v-for="item in impacts" :key="item.label" class="legend-item">
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
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  font-size: 11px;
  color: #94a3b8;
}

.legend-separator {
  width: 1px;
  height: 14px;
  background: #334155;
}
</style>
