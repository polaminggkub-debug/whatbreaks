import { GraphIndex } from './graph.js';
import type { ImpactResult } from '../types/graph.js';
export type { ImpactResult };

/**
 * Forward impact: from a changed file, find all dependents.
 * Walks importedBy edges via BFS: "who imports me, and who imports them, etc."
 * Collects affected tests: any test node encountered, or any test that covers an affected node.
 */
export function computeForwardImpact(index: GraphIndex, fileId: string): ImpactResult {
  const node = index.getNode(fileId);
  if (!node) {
    return { nodes: [], affectedTests: [] };
  }

  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; depth: number }> = [];
  const result: Array<{ nodeId: string; depth: number }> = [];
  const affectedTestSet = new Set<string>();

  visited.add(fileId);
  queue.push({ nodeId: fileId, depth: 0 });
  result.push({ nodeId: fileId, depth: 0 });

  // Collect tests covering the starting file
  for (const testId of index.getTestsCovering(fileId)) {
    affectedTestSet.add(testId);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const importers = index.getImporters(current.nodeId);

    for (const importerId of importers) {
      if (visited.has(importerId)) continue;
      visited.add(importerId);

      const nextDepth = current.depth + 1;
      queue.push({ nodeId: importerId, depth: nextDepth });
      result.push({ nodeId: importerId, depth: nextDepth });

      // Check if this node is a test
      const importerNode = index.getNode(importerId);
      if (importerNode?.type === 'test') {
        affectedTestSet.add(importerId);
      }

      // Collect tests covering this affected file
      for (const testId of index.getTestsCovering(importerId)) {
        affectedTestSet.add(testId);
      }
    }
  }

  return {
    nodes: result,
    affectedTests: Array.from(affectedTestSet),
  };
}

/**
 * Backward impact: from a file/test, find all dependencies.
 * Walks imports edges via BFS: "what do I import, and what do those import, etc."
 * Collects affected tests: any test node in the result, or tests covering any dependency.
 */
export function computeBackwardImpact(index: GraphIndex, fileId: string): ImpactResult {
  const node = index.getNode(fileId);
  if (!node) {
    return { nodes: [], affectedTests: [] };
  }

  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; depth: number }> = [];
  const result: Array<{ nodeId: string; depth: number }> = [];
  const affectedTestSet = new Set<string>();

  visited.add(fileId);
  queue.push({ nodeId: fileId, depth: 0 });
  result.push({ nodeId: fileId, depth: 0 });

  if (node.type === 'test') {
    affectedTestSet.add(fileId);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const deps = index.getImports(current.nodeId);

    for (const depId of deps) {
      if (visited.has(depId)) continue;
      visited.add(depId);

      const nextDepth = current.depth + 1;
      queue.push({ nodeId: depId, depth: nextDepth });
      result.push({ nodeId: depId, depth: nextDepth });

      // Check if this dependency is a test
      const depNode = index.getNode(depId);
      if (depNode?.type === 'test') {
        affectedTestSet.add(depId);
      }

      // Collect tests covering this dependency
      for (const testId of index.getTestsCovering(depId)) {
        affectedTestSet.add(testId);
      }
    }
  }

  return {
    nodes: result,
    affectedTests: Array.from(affectedTestSet),
  };
}
