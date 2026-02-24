<script setup lang="ts">
defineProps<{
  visible: boolean;
  depth: number;
  maxDepth: number;
  nodeLabel: string;
}>();

const emit = defineEmits<{
  'update:depth': [depth: number];
  close: [];
}>();

const depthOptions = [1, 2, 3, 0]; // 0 = All

function depthLabel(d: number): string {
  return d === 0 ? 'All' : `${d}`;
}
</script>

<template>
  <div v-if="visible" class="focus-controls">
    <div class="focus-header">
      <span class="focus-label">Focus: {{ nodeLabel }}</span>
      <button class="focus-close" @click="emit('close')" title="Exit focus (or click background)">&times;</button>
    </div>
    <div class="depth-bar">
      <span class="depth-label">Depth</span>
      <div class="depth-buttons">
        <button
          v-for="d in depthOptions"
          :key="d"
          class="depth-btn"
          :class="{ active: depth === d }"
          @click="emit('update:depth', d)"
        >
          {{ depthLabel(d) }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.focus-controls {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 10px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  z-index: 100;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.focus-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.focus-label {
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.focus-close {
  background: none;
  border: none;
  color: #64748b;
  font-size: 16px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}
.focus-close:hover {
  color: #e2e8f0;
}

.depth-bar {
  display: flex;
  align-items: center;
  gap: 6px;
}

.depth-label {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 500;
}

.depth-buttons {
  display: flex;
  gap: 2px;
  background: rgba(30, 41, 59, 0.8);
  border-radius: 6px;
  padding: 2px;
}

.depth-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-weight: 500;
}

.depth-btn:hover {
  color: #e2e8f0;
  background: rgba(100, 116, 139, 0.2);
}

.depth-btn.active {
  background: #6366f1;
  color: #ffffff;
}
</style>
