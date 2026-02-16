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

/** Depth-based architectural layer colors (for graph nodes)
 * Semantic palette: each color communicates role at a glance.
 * Warm amber for entry = "top", cool teal for foundation = "base",
 * blue for core logic, purple for orchestration, muted gray for tests.
 */
export const DEPTH_LAYER_COLORS: Record<number, string> = {
  0: '#2dd4bf',   // Foundation — Teal-green (stable, base)
  1: '#3b82f6',   // Core — Blue (main logic, system brain)
  2: '#a855f7',   // Feature — Purple (orchestration, business logic)
  3: '#f59e0b',   // Entry — Amber (entry point, top layer)
  [-1]: '#94a3b8', // Test — Slate gray (quiet, doesn't compete)
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
  { key: 0, label: 'Foundation', color: '#2dd4bf' },
  { key: 1, label: 'Core', color: '#3b82f6' },
  { key: 2, label: 'Feature', color: '#a855f7' },
  { key: 3, label: 'Entry', color: '#f59e0b' },
  { key: -1, label: 'Test', color: '#94a3b8' },
] as const;

export const IMPACTS = [
  { key: 'root', label: 'Root', color: '#ef4444' },
  { key: 'direct', label: 'Direct', color: '#f59e0b' },
  { key: 'indirect', label: 'Indirect', color: '#eab308' },
  { key: 'unaffected', label: 'Unaffected', color: '#64748b' },
] as const;
