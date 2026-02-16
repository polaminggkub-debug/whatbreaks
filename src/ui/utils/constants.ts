/** Test pyramid level colors — typed with TestLevel for safety */
import type { TestLevel } from '../../types/graph.js';

/**
 * Color palette design: 3 separate hue families, no overlap.
 *
 * STRUCTURE (Layers)  → Cool spectrum: teal, blue, purple, pink
 * TEST TYPE (Pyramid) → Warm spectrum: red, amber, yellow
 * FAILURE IMPACT      → Red monochrome scale: dark red → light red → gray
 */

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
 * Cool spectrum: each hue is distinct, no collision with warm test colors.
 */
export const DEPTH_LAYER_COLORS: Record<number, string> = {
  0: '#14b8a6',   // Foundation — Teal (stable, base)
  1: '#3b82f6',   // Core — Blue (main logic)
  2: '#8b5cf6',   // Feature — Purple (orchestration)
  3: '#ec4899',   // Entry — Pink (entry point, top layer)
  [-1]: '#64748b', // Test — Slate gray (overridden by testLevel colors)
};

/** Depth-based layer labels */
export const DEPTH_LAYER_LABELS: Record<number, string> = {
  0: 'Foundation',
  1: 'Core',
  2: 'Feature',
  3: 'Entry',
  [-1]: 'Test',
};

/** Impact colors — red monochrome scale (darker = higher impact) */
export const IMPACT_COLORS: Record<string, string> = {
  root: '#ffffff',       // White — root cause (stands out)
  direct: '#ef4444',     // Red — directly affected
  indirect: '#f59e0b',   // Amber — indirectly affected
  unaffected: '#6b7280', // Gray — not affected
};

export const LAYERS = [
  { key: 'page', label: 'Page', color: '#6366f1' },
  { key: 'ui', label: 'UI', color: '#3b82f6' },
  { key: 'feature', label: 'Feature', color: '#8b5cf6' },
  { key: 'entity', label: 'Entity', color: '#a855f7' },
  { key: 'shared', label: 'Shared', color: '#06b6d4' },
  { key: 'test', label: 'Test', color: '#64748b' },
  { key: 'config', label: 'Config', color: '#64748b' },
] as const;

/** Depth-based layers for legend — labeled "Structure" */
export const DEPTH_LAYERS = [
  { key: 0, label: 'Foundation', color: '#14b8a6' },
  { key: 1, label: 'Core', color: '#3b82f6' },
  { key: 2, label: 'Feature', color: '#8b5cf6' },
  { key: 3, label: 'Entry', color: '#ec4899' },
] as const;

/** Impact legend — labeled "Failure Impact" */
export const IMPACTS = [
  { key: 'root', label: 'Root', color: '#ffffff' },
  { key: 'direct', label: 'Direct', color: '#ef4444' },
  { key: 'indirect', label: 'Indirect', color: '#f59e0b' },
  { key: 'unaffected', label: 'Unaffected', color: '#6b7280' },
] as const;

/** Test pyramid colors — red is reserved for impact only */
export const TEST_LEVEL_COLORS: Record<TestLevel, string> = {
  unit: '#94a3b8',        // Gray — bulk of pyramid
  integration: '#f59e0b', // Amber — middle layer
  e2e: '#a855f7',         // Purple — top of pyramid, no conflict with impact red
};

/** Test pyramid legend items — ordered top-to-bottom (E2E first = top of pyramid) */
export const TEST_PYRAMID_LEGEND = [
  { key: 'e2e', label: 'E2E', color: '#a855f7' },
  { key: 'integration', label: 'Integration', color: '#f59e0b' },
  { key: 'unit', label: 'Unit', color: '#94a3b8' },
] as const;
