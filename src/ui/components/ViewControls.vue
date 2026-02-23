<script setup lang="ts">
defineProps<{
  layout: 'dagre' | 'cose';
  showTests: boolean;
  showFoundation: boolean;
  sizeMode: 'fanIn' | 'uniform';
  showHealth: boolean;
}>();

const emit = defineEmits<{
  'update:layout': [value: 'dagre' | 'cose'];
  'update:showTests': [value: boolean];
  'update:showFoundation': [value: boolean];
  'update:sizeMode': [value: 'fanIn' | 'uniform'];
  'update:showHealth': [value: boolean];
}>();
</script>

<template>
  <div class="view-controls">
    <button
      class="ctrl-btn"
      :class="{ active: layout === 'dagre' }"
      @click="emit('update:layout', layout === 'dagre' ? 'cose' : 'dagre')"
      :title="layout === 'dagre' ? 'Layered layout (click for Force)' : 'Force layout (click for Layered)'"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    </button>

    <button
      class="ctrl-btn"
      :class="{ active: !showTests }"
      @click="emit('update:showTests', !showTests)"
      :title="showTests ? 'Hide test nodes' : 'Show test nodes'"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5,3 19,12 5,21" />
      </svg>
    </button>

    <button
      class="ctrl-btn"
      :class="{ active: !showFoundation }"
      @click="emit('update:showFoundation', !showFoundation)"
      :title="showFoundation ? 'Hide foundation layer' : 'Show foundation layer'"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
      </svg>
    </button>

    <button
      class="ctrl-btn"
      :class="{ active: sizeMode === 'uniform' }"
      @click="emit('update:sizeMode', sizeMode === 'fanIn' ? 'uniform' : 'fanIn')"
      :title="sizeMode === 'fanIn' ? 'Size by fan-in (click for uniform)' : 'Uniform size (click for fan-in)'"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
      </svg>
    </button>

    <button
      class="ctrl-btn"
      :class="{ active: showHealth }"
      @click="emit('update:showHealth', !showHealth)"
      :title="showHealth ? 'Hide health panel' : 'Show health panel'"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.view-controls {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.ctrl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #334155;
  color: #94a3b8;
  border: 1px solid #475569;
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.ctrl-btn:hover {
  background: #475569;
  color: #e2e8f0;
}

.ctrl-btn:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

.ctrl-btn.active {
  background: #1e40af;
  border-color: #3b82f6;
  color: #ffffff;
}
</style>
