<script setup lang="ts">
import type { RefactorResult } from '../../types/graph';

const props = defineProps<{ result: RefactorResult }>();
const emit = defineEmits<{ clear: [] }>();

const filename = props.result.file.split('/').pop() ?? props.result.file;

const riskColors: Record<string, { border: string; bg: string; text: string }> = {
  high: { border: '#dc2626', bg: 'rgba(220,38,38,0.25)', text: '#fca5a5' },
  medium: { border: '#f59e0b', bg: 'rgba(245,158,11,0.25)', text: '#fcd34d' },
  low: { border: '#2dd4bf', bg: 'rgba(45,212,191,0.25)', text: '#99f6e4' },
};

const colors = riskColors[props.result.risk_level] ?? riskColors.low;
</script>

<template>
  <div class="impact-toast" :style="{ borderColor: colors.border }">
    <span class="toast-text">
      Touching <span class="file-label">{{ filename }}</span> would affect
      <strong>{{ result.affected_files }}</strong> files &middot;
      <strong>{{ result.affected_tests }}</strong> tests &middot;
      Risk:
      <span
        class="risk-badge"
        :style="{ background: colors.bg, color: colors.text, borderColor: colors.border }"
      >
        {{ result.risk_level.toUpperCase() }}
      </span>
    </span>
    <button class="clear-btn" @click="emit('clear')" title="Dismiss">&times;</button>
  </div>
</template>

<style scoped>
.impact-toast {
  position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
  background: #1e293b; border: 1px solid; border-radius: 12px;
  padding: 10px 20px; max-width: 600px; z-index: 200;
  box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  display: flex; align-items: center; gap: 12px;
  animation: slide-down 0.25s ease-out;
}
.toast-text { font-size: 13px; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.file-label { font-family: 'Fira Code', 'Cascadia Code', monospace; font-weight: 700; }
.risk-badge {
  display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase;
  padding: 2px 8px; border-radius: 9999px; border: 1px solid; letter-spacing: 0.5px;
}
.clear-btn {
  background: none; border: none; color: #94a3b8; font-size: 18px;
  cursor: pointer; padding: 0 4px; line-height: 1; flex-shrink: 0;
  transition: color 0.15s;
}
.clear-btn:hover { color: #e2e8f0; }
@keyframes slide-down {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
