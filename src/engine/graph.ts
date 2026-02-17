import { readFileSync, writeFileSync } from 'node:fs';
import { Graph } from '../types/graph.js';

// Re-export GraphIndex from the pure (no-Node.js-deps) module
// so existing imports like `import { GraphIndex } from './graph.js'` still work.
export { GraphIndex } from './graph-core.js';

export function loadGraph(path: string): Graph {
  const raw = readFileSync(path, 'utf-8');
  const parsed = JSON.parse(raw) as Graph;

  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error(`Invalid graph file: expected { nodes: [], edges: [] } at ${path}`);
  }

  return parsed;
}

export function saveGraph(graph: Graph, path: string): void {
  const json = JSON.stringify(graph, null, 2);
  writeFileSync(path, json, 'utf-8');
}
