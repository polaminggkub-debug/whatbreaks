export const LAYER_COLORS: Record<string, string> = {
  page: '#6366f1',
  ui: '#3b82f6',
  feature: '#8b5cf6',
  entity: '#a855f7',
  shared: '#06b6d4',
  test: '#14b8a6',
  config: '#64748b',
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

export const IMPACTS = [
  { key: 'root', label: 'Root', color: '#ef4444' },
  { key: 'direct', label: 'Direct', color: '#f59e0b' },
  { key: 'indirect', label: 'Indirect', color: '#eab308' },
] as const;
