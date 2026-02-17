import { computed, type Ref } from 'vue';
import type { Graph, HealthReport } from '../../types/graph';
import { GraphIndex } from '../../engine/graph-core';
import { analyzeRisk } from '../../engine/risk';

/**
 * Composable providing health report for the UI.
 * Delegates to the shared engine function (analyzeRisk) via GraphIndex,
 * eliminating duplicated hotspot, fragile chain, and cycle detection logic.
 */
export function useHealth(graph: Ref<Graph | null>) {
  const healthReport = computed<HealthReport | null>(() => {
    const g = graph.value;
    if (!g) return null;

    const index = new GraphIndex(g);
    return analyzeRisk(index);
  });

  return { healthReport };
}
