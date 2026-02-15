import { readFileSync, writeFileSync } from 'node:fs';
import { Graph, GraphNode, GraphEdge } from '../types/graph.js';

export class GraphIndex {
  private graph: Graph;
  private nodeMap: Map<string, GraphNode>;
  private importedBy: Map<string, string[]>;
  private imports: Map<string, string[]>;
  private testCovers: Map<string, string[]>;
  private coveredBy: Map<string, string[]>;

  constructor(graph: Graph) {
    this.graph = graph;
    this.nodeMap = new Map();
    this.importedBy = new Map();
    this.imports = new Map();
    this.testCovers = new Map();
    this.coveredBy = new Map();

    this.buildIndexes();
  }

  private buildIndexes(): void {
    for (const node of this.graph.nodes) {
      this.nodeMap.set(node.id, node);
    }

    for (const edge of this.graph.edges) {
      if (edge.type === 'import') {
        // source imports target: source -> target
        const fwd = this.imports.get(edge.source);
        if (fwd) {
          fwd.push(edge.target);
        } else {
          this.imports.set(edge.source, [edge.target]);
        }

        // target is imported by source
        const rev = this.importedBy.get(edge.target);
        if (rev) {
          rev.push(edge.source);
        } else {
          this.importedBy.set(edge.target, [edge.source]);
        }
      } else if (edge.type === 'test-covers') {
        // source (test) covers target (file)
        const tc = this.testCovers.get(edge.source);
        if (tc) {
          tc.push(edge.target);
        } else {
          this.testCovers.set(edge.source, [edge.target]);
        }

        const cb = this.coveredBy.get(edge.target);
        if (cb) {
          cb.push(edge.source);
        } else {
          this.coveredBy.set(edge.target, [edge.source]);
        }
      }
    }
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodeMap.get(id);
  }

  getImporters(id: string): string[] {
    return this.importedBy.get(id) ?? [];
  }

  getImports(id: string): string[] {
    return this.imports.get(id) ?? [];
  }

  getTestsCovering(id: string): string[] {
    return this.coveredBy.get(id) ?? [];
  }

  getFilesCoveredBy(testId: string): string[] {
    return this.testCovers.get(testId) ?? [];
  }

  getAllTestNodes(): GraphNode[] {
    return this.graph.nodes.filter((n) => n.type === 'test');
  }

  getAllSourceNodes(): GraphNode[] {
    return this.graph.nodes.filter((n) => n.type === 'source');
  }

  getGraph(): Graph {
    return this.graph;
  }

  getAllNodeIds(): string[] {
    return Array.from(this.nodeMap.keys());
  }
}

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
