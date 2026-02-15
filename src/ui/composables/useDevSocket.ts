import { ref, onMounted, onUnmounted } from 'vue';
import type { Graph, FailingResult } from '../../types/graph';

interface DevState {
  graph: Graph;
  currentFailure: FailingResult | null;
}

export function useDevSocket() {
  const isDevMode = ref(false);
  const isConnected = ref(false);
  const devFailure = ref<FailingResult | null>(null);
  const devGraph = ref<Graph | null>(null);
  let ws: WebSocket | null = null;

  async function detectDevMode(): Promise<boolean> {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) return false;
      const state: DevState = await res.json();
      devGraph.value = state.graph;
      devFailure.value = state.currentFailure;
      return true;
    } catch {
      return false;
    }
  }

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      isConnected.value = true;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'state') {
          devGraph.value = msg.payload.graph;
          devFailure.value = msg.payload.currentFailure;
        } else if (msg.type === 'failure-update') {
          devFailure.value = msg.payload;
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      isConnected.value = false;
      // Reconnect after 2 seconds
      setTimeout(() => {
        if (isDevMode.value) connect();
      }, 2000);
    };
  }

  onMounted(async () => {
    isDevMode.value = await detectDevMode();
    if (isDevMode.value) {
      connect();
    }
  });

  onUnmounted(() => {
    if (ws) {
      ws.close();
      ws = null;
    }
  });

  return {
    isDevMode,
    isConnected,
    devGraph,
    devFailure,
  };
}
