/** Path-based layer colors (used for NodePanel badge) */
export const LAYER_COLORS: Record<string, string> = {
  page: '#6366f1',
  ui: '#3b82f6',
  feature: '#8b5cf6',
  entity: '#a855f7',
  shared: '#06b6d4',
  test: '#64748b',
  config: '#64748b',
};

/** Depth-based architectural layer colors (for graph nodes) */
export const DEPTH_LAYER_COLORS: Record<number, string> = {
  0: '#14b8a6',   // Foundation — Teal
  1: '#3b82f6',   // Core — Blue
  2: '#a855f7',   // Feature — Purple
  3: '#1e40af',   // Entry — Dark Blue
  [-1]: '#06b6d4', // Test — Cyan
};

/** Depth-based layer labels */
export const DEPTH_LAYER_LABELS: Record<number, string> = {
  0: 'Foundation',
  1: 'Core',
  2: 'Feature',
  3: 'Entry',
  [-1]: 'Test',
};

export const IMPACT_COLORS: Record<string, string> = {
  root: '#ef4444',
  direct: '#f59e0b',
  indirect: '#eab308',
  unaffected: '#64748b',
};

export const LAYERS = [
  { key: 'page', label: 'Page', color: '#6366f1' },
  { key: 'ui', label: 'UI', color: '#3b82f6' },
  { key: 'feature', label: 'Feature', color: '#8b5cf6' },
  { key: 'entity', label: 'Entity', color: '#a855f7' },
  { key: 'shared', label: 'Shared', color: '#06b6d4' },
  { key: 'test', label: 'Test', color: '#14b8a6' },
  { key: 'config', label: 'Config', color: '#64748b' },
] as const;

/** Depth-based layers for legend */
export const DEPTH_LAYERS = [
  { key: 0, label: 'Foundation', color: '#14b8a6' },
  { key: 1, label: 'Core', color: '#3b82f6' },
  { key: 2, label: 'Feature', color: '#a855f7' },
  { key: 3, label: 'Entry', color: '#1e40af' },
  { key: -1, label: 'Test', color: '#06b6d4' },
] as const;

export const IMPACTS = [
  { key: 'root', label: 'Root', color: '#ef4444' },
  { key: 'direct', label: 'Direct', color: '#f59e0b' },
  { key: 'indirect', label: 'Indirect', color: '#eab308' },
  { key: 'unaffected', label: 'Unaffected', color: '#64748b' },
] as const;
