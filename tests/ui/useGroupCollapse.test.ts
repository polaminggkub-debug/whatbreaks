import { describe, it, expect } from 'vitest';
import {
  getCollapsedGroups,
  shouldShowAggregateEdge,
} from '../../src/ui/composables/useGroupCollapse';

describe('useGroupCollapse', () => {
  describe('shouldShowAggregateEdge', () => {
    const groupIds = new Set(['group-a', 'group-b', 'group-c']);

    it('shows edge when both groups are collapsed', () => {
      const collapsed = new Set(['group-a', 'group-b']);
      expect(shouldShowAggregateEdge('group-a', 'group-b', collapsed, groupIds)).toBe(true);
    });

    it('shows edge when one group is collapsed and other end is a node', () => {
      const collapsed = new Set(['group-a']);
      expect(shouldShowAggregateEdge('group-a', 'src/main.ts', collapsed, groupIds)).toBe(true);
    });

    it('hides edge when source group is expanded', () => {
      const collapsed = new Set(['group-b']);
      expect(shouldShowAggregateEdge('group-a', 'group-b', collapsed, groupIds)).toBe(false);
    });

    it('hides edge when no groups are collapsed', () => {
      const collapsed = new Set<string>();
      expect(shouldShowAggregateEdge('group-a', 'group-b', collapsed, groupIds)).toBe(false);
    });
  });

  describe('getCollapsedGroups', () => {
    it('returns the current set', () => {
      const set = getCollapsedGroups();
      expect(set).toBeInstanceOf(Set);
    });
  });
});
