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
      :title="layout === 'dagre' ? 'Switch to force layout' : 'Switch to layered layout'"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
      {{ layout === 'dagre' ? 'Layered' : 'Force' }}
    </button>

    <button
      class="ctrl-btn"
      :class="{ active: !showTests }"
      @click="emit('update:showTests', !showTests)"
      title="Toggle test nodes"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5,3 19,12 5,21" />
      </svg>
      Tests {{ showTests ? 'ON' : 'OFF' }}
    </button>

    <button
      class="ctrl-btn"
      :class="{ active: !showFoundation }"
      @click="emit('update:showFoundation', !showFoundation)"
      title="Toggle foundation layer"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
      </svg>
      Foundation {{ showFoundation ? 'ON' : 'OFF' }}
    </button>

    <button
      class="ctrl-btn"
      :class="{ active: sizeMode === 'uniform' }"
      @click="emit('update:sizeMode', sizeMode === 'fanIn' ? 'uniform' : 'fanIn')"
      title="Toggle node size mode"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
      </svg>
      Size: {{ sizeMode === 'fanIn' ? 'Fan-in' : 'Uniform' }}
    </button>

    <button
      class="ctrl-btn"
      :class="{ active: showHealth }"
      @click="emit('update:showHealth', !showHealth)"
      title="Toggle codebase health panel"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
      Health
    </button>
  </div>
</template>

<style scoped>
.view-controls {
  display: flex;
  gap: 6px;
}

.ctrl-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #334155;
  color: #94a3b8;
  border: 1px solid #475569;
  border-radius: 6px;
  padding: 4px 10px;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
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
