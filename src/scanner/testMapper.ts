import fs from 'node:fs';
import path from 'node:path';
import micromatch from 'micromatch';
import type { ParsedFile } from './importParser.js';
import type { GraphEdge, TestLevel } from '../types/graph.js';

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

// --- Test level classification ---

interface TestLevelConfig {
  testLevels?: Record<string, TestLevel>;
}

let cachedConfig: TestLevelConfig | null = null;
let configLoadedForRoot: string | null = null;

function loadTestLevelConfig(projectRoot: string): TestLevelConfig {
  if (cachedConfig && configLoadedForRoot === projectRoot) return cachedConfig;

  const configPath = path.join(projectRoot, '.whatbreaks.config.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(raw) as TestLevelConfig;
  } catch {
    cachedConfig = {};
  }
  configLoadedForRoot = projectRoot;
  return cachedConfig;
}

// Layer 2: Directory convention
const DIR_E2E = /[/\\](e2e|e2e-tests|cypress|playwright)[/\\]/;
const DIR_INTEGRATION = /[/\\](integration|integration-tests)[/\\]/;
const DIR_UNIT = /[/\\](unit|unit-tests|__tests__)[/\\]/;

// Layer 3: Filename convention
const FILE_E2E = /\.e2e\.(spec|test)\.\w+$|\.e2e\.\w+$/;
const FILE_INTEGRATION = /\.(integration|int)\.(spec|test)\.\w+$/;

// Layer 4: Import heuristic — known framework packages
const E2E_IMPORTS = ['@playwright/test', 'cypress', 'puppeteer', 'webdriverio'];
const INTEGRATION_IMPORTS = ['supertest', '@nestjs/testing', 'superagent'];

/**
 * Classify a test file's pyramid level.
 * Uses a 5-layer detection chain: config > directory > filename > imports > default.
 */
export function classifyTestLevel(
  filePath: string,
  imports: string[],
  projectRoot?: string,
): TestLevel {
  // Layer 1: Config glob override
  if (projectRoot) {
    const config = loadTestLevelConfig(projectRoot);
    if (config.testLevels) {
      const relativePath = path.relative(projectRoot, filePath);
      for (const [glob, level] of Object.entries(config.testLevels)) {
        if (micromatch.isMatch(relativePath, glob)) return level;
      }
    }
  }

  // Layer 2: Directory convention
  if (DIR_E2E.test(filePath)) return 'e2e';
  if (DIR_INTEGRATION.test(filePath)) return 'integration';
  if (DIR_UNIT.test(filePath)) return 'unit';

  // Layer 3: Filename convention
  if (FILE_E2E.test(filePath)) return 'e2e';
  if (FILE_INTEGRATION.test(filePath)) return 'integration';

  // Layer 4: Import heuristic (from already-parsed imports, no extra fs reads)
  for (const imp of imports) {
    if (E2E_IMPORTS.some((pkg) => imp.includes(pkg))) return 'e2e';
    if (INTEGRATION_IMPORTS.some((pkg) => imp.includes(pkg))) return 'integration';
  }

  // Layer 5: Default
  return 'unit';
}
