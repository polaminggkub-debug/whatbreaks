import { RefactorResult, RiskLevel } from '../types/graph.js';
import { GraphIndex } from './graph.js';

/**
 * Analyze the blast radius of refactoring a file.
 *
 * Algorithm:
 * 1. Start from the file being changed
 * 2. BFS forward via importedBy to find all direct and transitive dependents
 * 3. Collect all test files that cover any affected file
 * 4. Build suggested test command
 * 5. Compute risk level based on fan-in count
 */
export function analyzeRefactorImpact(index: GraphIndex, fileId: string): RefactorResult {
  const node = index.getNode(fileId);
  if (!node) {
    return {
      file: fileId,
      mode: 'refactor',
      affected_files: 0,
      affected_tests: 0,
      direct_importers: [],
      transitive_affected: [],
      tests_to_run: [],
      suggested_test_command: '',
      risk_level: 'low',
      risk_reason: 'File not found in graph',
    };
  }

  // BFS forward through importedBy edges
  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; depth: number }> = [];
  const directImporters: string[] = [];
  const transitiveAffected: string[] = [];
  const testsToRun = new Set<string>();

  visited.add(fileId);
  queue.push({ nodeId: fileId, depth: 0 });

  // Collect tests covering the starting file
  for (const testId of index.getTestsCovering(fileId)) {
    testsToRun.add(testId);
  }

  // If the file itself is a test, include it
  if (node.type === 'test') {
    testsToRun.add(fileId);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const importers = index.getImporters(current.nodeId);

    for (const importerId of importers) {
      if (visited.has(importerId)) continue;
      visited.add(importerId);

      const nextDepth = current.depth + 1;
      queue.push({ nodeId: importerId, depth: nextDepth });

      if (nextDepth === 1) {
        directImporters.push(importerId);
      }
      transitiveAffected.push(importerId);

      // Check if importer is a test
      const importerNode = index.getNode(importerId);
      if (importerNode?.type === 'test') {
        testsToRun.add(importerId);
      }

      // Collect tests covering this affected file
      for (const testId of index.getTestsCovering(importerId)) {
        testsToRun.add(testId);
      }
    }
  }

  const testsArray = Array.from(testsToRun);

  // Build suggested test command
  const suggestedTestCommand = buildTestCommand(testsArray);

  // Compute risk level based on total fan-in (all affected files, not just direct)
  const totalAffected = transitiveAffected.length;
  const { level, reason } = computeRiskLevel(totalAffected, testsArray.length, fileId);

  return {
    file: fileId,
    mode: 'refactor',
    affected_files: transitiveAffected.length,
    affected_tests: testsArray.length,
    direct_importers: directImporters,
    transitive_affected: transitiveAffected,
    tests_to_run: testsArray,
    suggested_test_command: suggestedTestCommand,
    risk_level: level,
    risk_reason: reason,
  };
}

function buildTestCommand(testIds: string[]): string {
  if (testIds.length === 0) return '';

  // Extract base names: strip path and extension
  const baseNames = testIds.map((id) => {
    const parts = id.split('/');
    const filename = parts[parts.length - 1];
    // Remove extension (.ts, .test.ts, .spec.ts, etc.)
    return filename.replace(/\.(test|spec)\.(ts|js|tsx|jsx)$/, '').replace(/\.(ts|js|tsx|jsx)$/, '');
  });

  // Determine test runner: if any test has "e2e" or "playwright" in the path, use playwright
  const hasE2E = testIds.some(
    (id) => id.includes('e2e') || id.includes('playwright'),
  );

  const runner = hasE2E ? 'npx playwright test' : 'npx vitest';
  return `${runner} ${baseNames.join(' ')}`;
}

function computeRiskLevel(
  affectedCount: number,
  testCount: number,
  fileId: string,
): { level: RiskLevel; reason: string } {
  if (affectedCount >= 20) {
    return {
      level: 'high',
      reason: `${fileId} has ${affectedCount} transitive dependents — changes here ripple widely`,
    };
  }

  if (affectedCount >= 5) {
    return {
      level: 'medium',
      reason: `${fileId} has ${affectedCount} transitive dependents across the codebase`,
    };
  }

  return {
    level: 'low',
    reason: `${fileId} has limited impact with ${affectedCount} transitive dependents`,
  };
}
