import { ref, computed } from 'vue';
import type { Graph, GraphNode, GraphEdge, NodeLayer } from '../../types/graph';

export function useGraph() {
  const graph = ref<Graph | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchGraph() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/graph');
      if (!res.ok) throw new Error(`Failed to load graph: ${res.status}`);
      graph.value = await res.json();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load graph data';
      graph.value = null;
    } finally {
      loading.value = false;
    }
  }

  const nodes = computed(() => graph.value?.nodes ?? []);
  const edges = computed(() => graph.value?.edges ?? []);

  function getNode(id: string): GraphNode | undefined {
    return graph.value?.nodes.find(n => n.id === id);
  }

  function getEdgesFrom(nodeId: string): GraphEdge[] {
    return (graph.value?.edges ?? []).filter(e => e.source === nodeId);
  }

  function getEdgesTo(nodeId: string): GraphEdge[] {
    return (graph.value?.edges ?? []).filter(e => e.target === nodeId);
  }

  function getNodesByLayer(layer: NodeLayer): GraphNode[] {
    return (graph.value?.nodes ?? []).filter(n => n.layer === layer);
  }

  function getTestNodes(): GraphNode[] {
    return (graph.value?.nodes ?? []).filter(n => n.type === 'test');
  }

  function getSourceNodes(): GraphNode[] {
    return (graph.value?.nodes ?? []).filter(n => n.type === 'source');
  }

  /**
   * Build an adjacency list (forward: source -> targets) from edges of a given type
   */
  function buildAdjacency(edgeType?: string): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const edge of (graph.value?.edges ?? [])) {
      if (edgeType && edge.type !== edgeType) continue;
      const existing = adj.get(edge.source) ?? [];
      existing.push(edge.target);
      adj.set(edge.source, existing);
    }
    return adj;
  }

  /**
   * Build a reverse adjacency list (target -> sources)
   */
  function buildReverseAdjacency(edgeType?: string): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const edge of (graph.value?.edges ?? [])) {
      if (edgeType && edge.type !== edgeType) continue;
      const existing = adj.get(edge.target) ?? [];
      existing.push(edge.source);
      adj.set(edge.target, existing);
    }
    return adj;
  }

  return {
    graph,
    loading,
    error,
    nodes,
    edges,
    fetchGraph,
    getNode,
    getEdgesFrom,
    getEdgesTo,
    getNodesByLayer,
    getTestNodes,
    getSourceNodes,
    buildAdjacency,
    buildReverseAdjacency,
  };
}
