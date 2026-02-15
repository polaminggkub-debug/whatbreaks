<script setup lang="ts">
import { ref, computed } from 'vue';
import type { GraphNode } from '../../types/graph';
import { LAYER_COLORS } from '../utils/constants';

const props = defineProps<{
  nodes: GraphNode[];
}>();

const emit = defineEmits<{
  select: [nodeId: string];
}>();

const query = ref('');
const showDropdown = ref(false);
const activeIndex = ref(-1);

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
  activeIndex.value = -1;
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
    activeIndex.value = -1;
  }, 200);
}

function onInput() {
  showDropdown.value = query.value.trim().length > 0;
  activeIndex.value = -1;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    showDropdown.value = false;
    activeIndex.value = -1;
    (e.target as HTMLInputElement).blur();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (activeIndex.value < filtered.value.length - 1) {
      activeIndex.value++;
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (activeIndex.value > 0) {
      activeIndex.value--;
    }
  } else if (e.key === 'Enter' && activeIndex.value >= 0) {
    e.preventDefault();
    selectNode(filtered.value[activeIndex.value].id);
  }
}
</script>

<template>
  <div class="search-bar">
    <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      v-model="query"
      placeholder="Search files..."
      class="search-input"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="showDropdown && filtered.length > 0"
      @focus="onFocus"
      @blur="onBlur"
      @input="onInput"
      @keydown="onKeydown"
    />
    <div v-if="showDropdown && filtered.length > 0" class="search-dropdown" role="listbox">
      <div
        v-for="(node, i) in filtered"
        :key="node.id"
        class="search-item"
        :class="{ active: i === activeIndex }"
        role="option"
        :aria-selected="i === activeIndex"
        @mousedown.prevent="selectNode(node.id)"
      >
        <span class="item-label">{{ node.label }}</span>
        <span class="item-meta">
          <span class="item-layer" :style="{ color: LAYER_COLORS[node.layer] ?? '#64748b' }">{{ node.layer }}</span>
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
  transition: border-color 0.2s;
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

.search-item:hover,
.search-item.active {
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
