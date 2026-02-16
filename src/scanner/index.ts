import path from 'node:path';
import type {
  Graph,
  GraphNode,
  GraphEdge,
  NodeType,
  ScanConfig,
} from '../types/graph.js';
import { scanFiles } from './fileScanner.js';
import type { ParsedFile } from './importParser.js';
import { isTestFile, mapTestCoverage, classifyTestLevel } from './testMapper.js';
import { classifyLayer } from './layerClassifier.js';
import { computeVisualMetrics } from '../engine/metrics.js';
import { getParserForFile } from './parsers/index.js';

export { scanFiles } from './fileScanner.js';
export { parseImports } from './importParser.js';
export type { ParsedFile } from './importParser.js';
export { parseVueFile } from './vueParser.js';
export { isTestFile, mapTestCoverage, classifyTestLevel } from './testMapper.js';
export { classifyLayer } from './layerClassifier.js';
export { getParserForFile } from './parsers/index.js';
export type { LanguageParser } from './parsers/index.js';

/**
 * Scan a repository directory and build a complete dependency graph.
 *
 * 1. Discovers all supported source files
 * 2. Parses each file for imports and exports
 * 3. Classifies files into architectural layers
 * 4. Creates graph nodes and edges (import + test-covers)
 */
export async function scanRepository(
  dir: string,
  config?: Partial<ScanConfig>,
): Promise<Graph> {
  const projectRoot = path.resolve(dir);

  // Step 1: Discover files
  const filePaths = await scanFiles(projectRoot, config);

  // Step 2: Parse each file
  const parsedFiles = new Map<string, ParsedFile>();

  for (const filePath of filePaths) {
    try {
      const parser = getParserForFile(filePath);
      if (!parser) {
        // No parser for this extension — skip
        continue;
      }

      const parsed = parser.parseFile(filePath, projectRoot);
      parsedFiles.set(filePath, parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[whatbreaks] Failed to parse ${filePath}: ${message}`);
    }
  }

  // Step 3: Build nodes
  const nodes: GraphNode[] = [];

  // Count filenames to detect duplicates — use parent dir in label for disambiguation
  const nameCount = new Map<string, number>();
  for (const filePath of parsedFiles.keys()) {
    const base = path.basename(filePath);
    nameCount.set(base, (nameCount.get(base) ?? 0) + 1);
  }

  for (const [filePath, parsed] of parsedFiles) {
    const layer = classifyLayer(filePath);
    const fileIsTest = isTestFile(filePath);

    const nodeType: NodeType = fileIsTest ? 'test' : 'source';
    const testLevel = fileIsTest
      ? classifyTestLevel(filePath, parsed.imports, projectRoot)
      : undefined;

    // Extract function names from exports for the node
    const functions = parsed.exports;

    const baseName = path.basename(filePath);
    // If filename is ambiguous (e.g. many index.ts), include parent dir
    const label = (nameCount.get(baseName) ?? 0) > 1
      ? path.join(path.basename(path.dirname(filePath)), baseName)
      : baseName;

    nodes.push({
      id: filePath,
      label,
      layer,
      type: nodeType,
      testLevel,
      functions,
      depth: 0,
      layerIndex: 0,
      fanIn: 0,
      size: 30,
    });
  }

  // Step 4: Build import edges (skip test files — they get test-covers edges instead)
  const importEdges: GraphEdge[] = [];

  for (const [filePath, parsed] of parsedFiles) {
    if (isTestFile(filePath)) continue;

    for (const importedPath of parsed.imports) {
      // Only create edges to files that exist in our scanned set
      if (!parsedFiles.has(importedPath)) continue;

      importEdges.push({
        source: filePath,
        target: importedPath,
        type: 'import',
      });
    }
  }

  // Step 5: Build test-covers edges
  const testEdges = mapTestCoverage(parsedFiles);

  // Step 6: Combine and compute visual metrics
  const edges = [...importEdges, ...testEdges];
  const graph: Graph = { nodes, edges };

  computeVisualMetrics(graph);

  return graph;
}
