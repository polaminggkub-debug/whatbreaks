import type { ParsedFile } from './importParser.js';
import type { GraphEdge } from '../types/graph.js';

const TEST_FILE_PATTERNS = [
  /\.spec\.ts$/,
  /\.test\.ts$/,
  /\.spec\.vue$/,
  /\.test\.vue$/,
];

/**
 * Check whether a file path represents a test file.
 */
export function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

/**
 * Given all parsed files, create `test-covers` edges from test files
 * to the source files they import.
 */
export function mapTestCoverage(
  parsedFiles: Map<string, ParsedFile>,
): GraphEdge[] {
  const edges: GraphEdge[] = [];

  for (const [filePath, parsed] of parsedFiles) {
    if (!isTestFile(filePath)) continue;

    for (const importedPath of parsed.imports) {
      // Only create test-covers edges to non-test files
      if (isTestFile(importedPath)) continue;

      // Verify the imported file actually exists in our scanned set
      if (!parsedFiles.has(importedPath)) continue;

      edges.push({
        source: filePath,
        target: importedPath,
        type: 'test-covers',
      });
    }
  }

  return edges;
}
