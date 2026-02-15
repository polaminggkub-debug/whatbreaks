import type { NodeLayer } from '../types/graph.js';
import { isTestFile } from './testMapper.js';

/**
 * Classify a file into a layer based on its path conventions.
 * Checks are ordered by specificity — test files first, then
 * FSD-style layer directories, then config patterns, with
 * 'shared' as the default fallback.
 */
export function classifyLayer(filePath: string): NodeLayer {
  // Normalize separators for consistent matching
  const normalized = filePath.replace(/\\/g, '/');

  // Test files take highest priority
  if (isTestFile(normalized)) {
    return 'test';
  }

  // FSD layer detection by path segment
  if (normalized.includes('/pages/')) {
    return 'page';
  }

  if (normalized.includes('/widgets/') || normalized.includes('/components/')) {
    return 'ui';
  }

  if (normalized.includes('/features/')) {
    return 'feature';
  }

  if (normalized.includes('/entities/')) {
    return 'entity';
  }

  if (
    normalized.includes('/shared/') ||
    normalized.includes('/lib/') ||
    normalized.includes('/utils/')
  ) {
    return 'shared';
  }

  // Config files
  if (normalized.includes('config') || normalized.includes('.config.')) {
    return 'config';
  }

  // Default fallback
  return 'shared';
}
