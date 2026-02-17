import { ref } from 'vue';
import type { AnalysisMode } from '../../types/graph';

export function useMode() {
  const mode = ref<AnalysisMode>('failing');
  const selectedTarget = ref<string | null>(null);

  function toggle() {
    mode.value = mode.value === 'failing' ? 'refactor' : 'failing';
    selectedTarget.value = null;
  }

  function setTarget(target: string) {
    selectedTarget.value = target;
  }

  function clear() {
    selectedTarget.value = null;
  }

  return {
    mode,
    selectedTarget,
    toggle,
    setTarget,
    clear,
  };
}

export type UseModeReturn = ReturnType<typeof useMode>;
