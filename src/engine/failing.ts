import { FailingResult, ImpactNode } from '../types/graph.js';
import { GraphIndex } from './graph.js';

/**
 * Analyze a failing test to determine root cause investigation order.
 *
 * Algorithm:
 * 1. Start from the failing test file
 * 2. BFS through all imports transitively (what does the test import? what do those import?)
 * 3. Sort by depth (deepest = most likely root cause)
 * 4. Find other tests at risk (tests that share any of the same dependencies)
 */
export function analyzeFailingTest(index: GraphIndex, testFileId: string): FailingResult {
  const testNode = index.getNode(testFileId);
  if (!testNode) {
    return {
      test: testFileId,
      mode: 'failing',
      chain: [],
      directlyTests: [],
      deepDependencies: [],
      filesToInvestigate: [],
      otherTestsAtRisk: [],
    };
  }

  // BFS through imports starting from the test file
  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; depth: number }> = [];
  const chain: ImpactNode[] = [];

  visited.add(testFileId);
  queue.push({ nodeId: testFileId, depth: 0 });

  // The test itself is depth 0 in the chain
  chain.push({
    nodeId: testFileId,
    depth: 0,
    layer: testNode.layer,
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const deps = index.getImports(current.nodeId);

    for (const depId of deps) {
      if (visited.has(depId)) continue;
      visited.add(depId);

      const nextDepth = current.depth + 1;
      const depNode = index.getNode(depId);
      queue.push({ nodeId: depId, depth: nextDepth });
      chain.push({
        nodeId: depId,
        depth: nextDepth,
        layer: depNode?.layer,
      });
    }
  }

  // Direct imports of the test (depth 1)
  const directlyTests = chain
    .filter((n) => n.depth === 1)
    .map((n) => n.nodeId);

  // All transitive dependencies (depth >= 1), sorted deepest-first
  const deepDependencies = chain
    .filter((n) => n.depth >= 1)
    .sort((a, b) => b.depth - a.depth)
    .map((n) => n.nodeId);

  // Investigation order: deepest-first (deepest = most likely root cause)
  const filesToInvestigate = [...deepDependencies];

  // Find other tests at risk: tests that share any dependency with this test
  const allDeps = new Set(chain.filter((n) => n.depth >= 1).map((n) => n.nodeId));
  const otherTestsAtRisk = new Set<string>();

  const allDepsArray = Array.from(allDeps);
  for (const depId of allDepsArray) {
    // Tests that cover this dependency
    for (const testId of index.getTestsCovering(depId)) {
      if (testId !== testFileId) {
        otherTestsAtRisk.add(testId);
      }
    }

    // Tests that import this dependency (directly or transitively)
    for (const importerId of index.getImporters(depId)) {
      const importerNode = index.getNode(importerId);
      if (importerNode?.type === 'test' && importerId !== testFileId) {
        otherTestsAtRisk.add(importerId);
      }
    }
  }

  // Also check all test nodes to see if they share any dependency via BFS
  const allTests = index.getAllTestNodes();
  for (const otherTest of allTests) {
    if (otherTest.id === testFileId) continue;
    if (otherTestsAtRisk.has(otherTest.id)) continue;

    // Quick check: does this test import any of our dependencies?
    const otherDirectDeps = index.getImports(otherTest.id);
    for (const dep of otherDirectDeps) {
      if (allDeps.has(dep)) {
        otherTestsAtRisk.add(otherTest.id);
        break;
      }
    }
  }

  return {
    test: testFileId,
    mode: 'failing',
    chain,
    directlyTests,
    deepDependencies,
    filesToInvestigate,
    otherTestsAtRisk: Array.from(otherTestsAtRisk),
  };
}
