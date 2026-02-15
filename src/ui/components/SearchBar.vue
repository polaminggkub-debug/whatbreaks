<script setup lang="ts">
import { ref, computed } from 'vue';
import type { GraphNode } from '../../types/graph';

const LAYER_COLORS: Record<string, string> = {
  page: '#6366f1',
  ui: '#3b82f6',
  feature: '#8b5cf6',
  entity: '#a855f7',
  shared: '#06b6d4',
  test: '#14b8a6',
  config: '#64748b',
};

function layerColor(layer: string): string {
  return LAYER_COLORS[layer] ?? '#64748b';
}

const props = defineProps<{
  nodes: GraphNode[];
}>();

const emit = defineEmits<{
  select: [nodeId: string];
}>();

const query = ref('');
const showDropdown = ref(false);

const filtered = computed(() => {
  const q = query.value.toLowerCase().trim();
  if (!q) return [];
  return props.nodes
    .filter(n => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q))
    .slice(0, 15);
});

function selectNode(nodeId: string) {
  const node = props.nodes.find(n => n.id === nodeId);
  query.value = node?.label ?? nodeId;
  showDropdown.value = false;
  emit('select', nodeId);
}

function onFocus() {
  if (query.value.trim()) {
    showDropdown.value = true;
  }
}

function onBlur() {
  setTimeout(() => {
    showDropdown.value = false;
  }, 200);
}

function onInput() {
  showDropdown.value = query.value.trim().length > 0;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    showDropdown.value = false;
    (e.target as HTMLInputElement).blur();
  }
}
</script>

<template>
  <div class="search-bar">
    <div class="search-icon">&#128269;</div>
    <input
      v-model="query"
      placeholder="Search files..."
      class="search-input"
      @focus="onFocus"
      @blur="onBlur"
      @input="onInput"
      @keydown="onKeydown"
    />
    <div v-if="showDropdown && filtered.length > 0" class="search-dropdown">
      <div
        v-for="node in filtered"
        :key="node.id"
        class="search-item"
        @mousedown.prevent="selectNode(node.id)"
      >
        <span class="item-label">{{ node.label }}</span>
        <span class="item-meta">
          <span class="item-layer" :style="{ color: layerColor(node.layer) }">{{ node.layer }}</span>
          <span class="item-type">{{ node.type }}</span>
        </span>
      </div>
    </div>
    <div v-if="showDropdown && query.trim() && filtered.length === 0" class="search-dropdown">
      <div class="no-results">No files found</div>
    </div>
  </div>
</template>

<style scoped>
.search-bar {
  position: relative;
  width: 220px;
  flex-shrink: 0;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  pointer-events: none;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 7px 12px 7px 32px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s, width 0.3s;
}

.search-input::placeholder {
  color: #475569;
}

.search-input:focus {
  border-color: #6366f1;
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  max-height: 280px;
  overflow-y: auto;
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.search-dropdown::-webkit-scrollbar {
  width: 6px;
}

.search-dropdown::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 3px;
}

.search-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.1s;
}

.search-item:hover {
  background: #334155;
}

.item-label {
  font-size: 13px;
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.item-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
  margin-left: 8px;
}

.item-layer {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.item-type {
  font-size: 10px;
  color: #475569;
}

.no-results {
  padding: 12px;
  text-align: center;
  font-size: 13px;
  color: #475569;
}
</style>
