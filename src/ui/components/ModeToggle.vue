<script setup lang="ts">
import { ref, computed } from 'vue';
import type { GraphNode, AnalysisMode } from '../../types/graph';

const props = defineProps<{
  modelValue: AnalysisMode;
  nodes: GraphNode[];
}>();

const emit = defineEmits<{
  'update:modelValue': [mode: AnalysisMode];
  analyze: [target: string];
}>();

const targetInput = ref('');
const showDropdown = ref(false);

const filteredNodes = computed(() => {
  const search = targetInput.value.toLowerCase().trim();
  if (!search) return relevantNodes.value.slice(0, 20);
  return relevantNodes.value
    .filter(n => n.label.toLowerCase().includes(search) || n.id.toLowerCase().includes(search))
    .slice(0, 20);
});

const relevantNodes = computed(() => {
  if (props.modelValue === 'failing') {
    return props.nodes.filter(n => n.type === 'test');
  }
  return props.nodes.filter(n => n.type === 'source');
});

const placeholder = computed(() => {
  return props.modelValue === 'failing'
    ? 'Select a failing test...'
    : 'Select a file to refactor...';
});

function setMode(mode: AnalysisMode) {
  emit('update:modelValue', mode);
  targetInput.value = '';
  showDropdown.value = false;
}

function selectTarget(nodeId: string) {
  const node = props.nodes.find(n => n.id === nodeId);
  targetInput.value = node?.label ?? nodeId;
  showDropdown.value = false;
}

function analyze() {
  const node = props.nodes.find(
    n => n.label === targetInput.value || n.id === targetInput.value
  );
  if (node) {
    emit('analyze', node.id);
  }
}

function onInputFocus() {
  showDropdown.value = true;
}

function onInputBlur() {
  // Delay to allow click on dropdown items
  setTimeout(() => {
    showDropdown.value = false;
  }, 200);
}
</script>

<template>
  <div class="mode-toggle">
    <div class="mode-buttons">
      <button
        class="mode-btn"
        :class="{ active: modelValue === 'failing', failing: modelValue === 'failing' }"
        @click="setMode('failing')"
      >
        <span class="mode-icon">&#9888;</span>
        Test Failure
      </button>
      <button
        class="mode-btn"
        :class="{ active: modelValue === 'refactor', refactor: modelValue === 'refactor' }"
        @click="setMode('refactor')"
      >
        <span class="mode-icon">&#9881;</span>
        Refactor
      </button>
    </div>

    <div class="target-selector">
      <div class="input-wrapper">
        <input
          v-model="targetInput"
          :placeholder="placeholder"
          class="target-input"
          @focus="onInputFocus"
          @blur="onInputBlur"
          @keydown.enter="analyze"
        />
        <div v-if="showDropdown && filteredNodes.length > 0" class="dropdown">
          <div
            v-for="node in filteredNodes"
            :key="node.id"
            class="dropdown-item"
            @mousedown.prevent="selectTarget(node.id)"
          >
            <span class="dropdown-label">{{ node.label }}</span>
            <span class="dropdown-layer">{{ node.layer }}</span>
          </div>
        </div>
      </div>
      <button
        class="analyze-btn"
        :class="{ 'failing-accent': modelValue === 'failing', 'refactor-accent': modelValue === 'refactor' }"
        @click="analyze"
        :disabled="!targetInput"
      >
        Analyze
      </button>
    </div>
  </div>
</template>

<style scoped>
.mode-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.mode-buttons {
  display: flex;
  background: #0f172a;
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
  flex-shrink: 0;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.mode-btn:hover {
  color: #e2e8f0;
  background: #1e293b;
}

.mode-btn.active.failing {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.2);
}

.mode-btn.active.refactor {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.2);
}

.mode-icon {
  font-size: 14px;
}

.target-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.input-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
}

.target-input {
  width: 100%;
  padding: 7px 12px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.target-input::placeholder {
  color: #475569;
}

.target-input:focus {
  border-color: #6366f1;
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  max-height: 240px;
  overflow-y: auto;
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.dropdown::-webkit-scrollbar {
  width: 6px;
}

.dropdown::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 3px;
}

.dropdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.1s;
}

.dropdown-item:hover {
  background: #334155;
}

.dropdown-label {
  font-size: 13px;
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-layer {
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  flex-shrink: 0;
  margin-left: 8px;
}

.analyze-btn {
  padding: 7px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  color: #fff;
  background: #475569;
}

.analyze-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.analyze-btn.failing-accent {
  background: #ef4444;
}

.analyze-btn.failing-accent:hover:not(:disabled) {
  background: #dc2626;
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.3);
}

.analyze-btn.refactor-accent {
  background: #f59e0b;
  color: #0f172a;
}

.analyze-btn.refactor-accent:hover:not(:disabled) {
  background: #d97706;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.3);
}
</style>
