<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  command: string;
}>();

const copied = ref(false);

async function copyCommand() {
  try {
    await navigator.clipboard.writeText(props.command);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Fallback for non-HTTPS contexts
    const textarea = document.createElement('textarea');
    textarea.value = props.command;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
}
</script>

<template>
  <div class="test-command">
    <div class="command-block">
      <code class="command-text">{{ command }}</code>
    </div>
    <button class="copy-btn" :class="{ copied }" @click="copyCommand">
      <span v-if="copied">Copied!</span>
      <span v-else>Copy</span>
    </button>
  </div>
</template>

<style scoped>
.test-command {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.command-block {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 10px 12px;
  overflow-x: auto;
}

.command-block::-webkit-scrollbar {
  height: 4px;
}

.command-block::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 2px;
}

.command-text {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 12px;
  color: #a5f3fc;
  white-space: pre;
  word-break: break-all;
}

.copy-btn {
  align-self: flex-end;
  padding: 5px 14px;
  border: none;
  border-radius: 5px;
  background: #14b8a6;
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: #0d9488;
  box-shadow: 0 0 10px rgba(20, 184, 166, 0.3);
}

.copy-btn.copied {
  background: #22c55e;
}
</style>
