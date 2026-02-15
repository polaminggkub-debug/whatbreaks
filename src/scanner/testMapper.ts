import type { ParsedFile } from './importParser.js';
import type { GraphEdge } from '../types/graph.js';

const TEST_FILE_PATTERNS = [
  // TypeScript / JavaScript / Vue
  /\.spec\.ts$/,
  /\.test\.ts$/,
  /\.spec\.tsx$/,
  /\.test\.tsx$/,
  /\.spec\.js$/,
  /\.test\.js$/,
  /\.spec\.jsx$/,
  /\.test\.jsx$/,
  /\.spec\.vue$/,
  /\.test\.vue$/,

  // Go — files ending with _test.go
  /_test\.go$/,

  // Python — test_*.py (pytest) or *_test.py (alternative)
  /(^|[/\\])test_[^/\\]*\.py$/,
  /_test\.py$/,

  // PHP — *Test.php (PHPUnit convention)
  /Test\.php$/,

  // Ruby — *_spec.rb (RSpec) or *_test.rb (Minitest)
  /_spec\.rb$/,
  /_test\.rb$/,
];

/**
 * Directory-based test file patterns.
 * Files living inside conventional test directories are considered test files
 * even when their filenames don't match the suffix-based patterns above.
 */
const TEST_DIR_PATTERNS = [
  // Python — any .py file inside a tests/ directory
  /(^|[/\\])tests[/\\].*\.py$/,

  // PHP — any .php file inside a tests/ directory
  /(^|[/\\])tests[/\\].*\.php$/,

  // Ruby — any .rb file inside a spec/ directory
  /(^|[/\\])spec[/\\].*\.rb$/,

  // Rust — any .rs file inside a tests/ directory (integration tests)
  /(^|[/\\])tests[/\\].*\.rs$/,
];

/**
 * Check whether a file path represents a test file.
 * Matches either filename-based patterns (e.g. *.spec.ts, *_test.go)
 * or directory-based patterns (e.g. tests/*.py, spec/*.rb).
 */
export function isTestFile(filePath: string): boolean {
  return (
    TEST_FILE_PATTERNS.some((pattern) => pattern.test(filePath)) ||
    TEST_DIR_PATTERNS.some((pattern) => pattern.test(filePath))
  );
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
