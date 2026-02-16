export type NodeLayer = 'ui' | 'feature' | 'shared' | 'entity' | 'page' | 'test' | 'config';
export type NodeType = 'source' | 'test' | 'type-only';
export type EdgeType = 'import' | 'test-covers';
export type TestLevel = 'unit' | 'integration' | 'e2e';
export type AnalysisMode = 'failing' | 'refactor';
export type RiskLevel = 'high' | 'medium' | 'low';

export interface GraphNode {
  id: string;
  label: string;
  layer: NodeLayer;
  type: NodeType;
  testLevel?: TestLevel;
  functions: string[];
  depth: number;
  layerIndex: number;
  fanIn: number;
  size: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
}

export interface FileGroup {
  id: string;
  label: string;
  nodeIds: string[];
  centralNodeId: string;
  parentGroupId?: string;
  level: number;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  groups?: FileGroup[];
}

export interface ImpactNode {
  nodeId: string;
  depth: number;
  layer?: NodeLayer;
}

export interface FailingResult {
  test: string;
  mode: 'failing';
  chain: ImpactNode[];
  directlyTests: string[];
  deepDependencies: string[];
  filesToInvestigate: string[];
  otherTestsAtRisk: string[];
}

export interface RefactorResult {
  file: string;
  mode: 'refactor';
  affected_files: number;
  affected_tests: number;
  direct_importers: string[];
  transitive_affected: string[];
  tests_to_run: string[];
  suggested_test_command: string;
  risk_level: RiskLevel;
  risk_reason: string;
}

export interface HotspotFile {
  file: string;
  fanIn: number;
  testsAtRisk: number;
  riskLevel: RiskLevel;
  reason: string;
}

export interface FragileChain {
  test: string;
  chainDepth: number;
  deepestDep: string;
  reason: string;
}

export interface CircularDep {
  cycle: string[];
}

export interface HealthReport {
  sourceFiles: number;
  testFiles: number;
  edges: number;
  hotspots: HotspotFile[];
  fragileChains: FragileChain[];
  circularDeps: CircularDep[];
}

export interface ScanConfig {
  include: string[];
  exclude: string[];
  testPatterns: string[];
  layerMappings: Record<string, NodeLayer>;
}
