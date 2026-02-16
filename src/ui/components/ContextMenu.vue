<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  visible: boolean;
  x: number;
  y: number;
  nodeId: string;
  nodeLabel: string;
}>();

const emit = defineEmits<{
  close: [];
  simulateBreak: [nodeId: string];
  showImporters: [nodeId: string];
  copyPath: [nodeId: string];
}>();

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) emit('close');
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div v-if="visible" class="backdrop" @click.self="emit('close')">
    <div class="menu" :style="{ left: x + 'px', top: y + 'px' }">
      <div class="header" :title="nodeLabel">{{ nodeLabel }}</div>
      <button class="item" @click="emit('simulateBreak', nodeId)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        What breaks if I touch this?
      </button>
      <button class="item" @click="emit('showImporters', nodeId)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
        Show all importers
      </button>
      <button class="item" @click="emit('copyPath', nodeId)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        Copy file path
      </button>
    </div>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 1000; }
.menu { position: absolute; background: #1e293b; border: 1px solid #334155; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); max-width: 280px; overflow: hidden; }
.header { padding: 8px 16px; font-size: 11px; font-family: monospace; color: #94a3b8; border-bottom: 1px solid #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 16px; font-size: 13px; color: #e2e8f0; background: none; border: none; cursor: pointer; text-align: left; white-space: nowrap; }
.item:hover { background: #334155; }
.item svg { flex-shrink: 0; }
</style>
