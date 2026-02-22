import type cytoscape from 'cytoscape';

/** Set of currently collapsed group IDs. Module-level state (like lockedHubId). */
const collapsedGroups = new Set<string>();

/** IDs of groups that were auto-expanded for impact mode. */
const impactExpandedGroups = new Set<string>();

/** All group IDs in the current graph, set during init. */
let allGroupIds = new Set<string>();

/** Read-only access to collapsed state. */
export function getCollapsedGroups(): ReadonlySet<string> {
  return collapsedGroups;
}

/** Initialize: discover all group IDs from the Cytoscape instance. */
export function initGroupCollapse(instance: cytoscape.Core): void {
  allGroupIds = new Set<string>();
  instance.nodes('[type="group"]').forEach((g: cytoscape.NodeSingular) => {
    if (g.data('level') === 0 || !g.data('parentGroupId')) {
      allGroupIds.add(g.id());
    }
  });
}

/** Collapse all top-level groups (default state after layout). */
export function collapseAllGroups(instance: cytoscape.Core): void {
  for (const groupId of allGroupIds) {
    collapseGroup(instance, groupId);
  }
}

/** Collapse a single group. */
export function collapseGroup(instance: cytoscape.Core, groupId: string): void {
  if (collapsedGroups.has(groupId)) return;
  collapsedGroups.add(groupId);

  const group = instance.getElementById(groupId) as cytoscape.NodeSingular;
  if (!group.length) return;

  // Hide all descendants (includes subgroups + their children)
  const descendants = group.descendants().not('[type="group"]');
  descendants.addClass('collapsed-child');

  // Also hide subgroup containers
  group.descendants('[type="group"]').addClass('collapsed-child');

  // Hide real edges touching hidden nodes
  descendants.connectedEdges().not('.aggregate-edge').addClass('collapsed-edge');

  // Update group label
  const originalLabel = group.data('label') as string;
  group.data('collapsedLabel', `${originalLabel}\n${descendants.length} files`);
  group.addClass('group-collapsed');

  // Update aggregate edge visibility globally
  refreshAggregateEdges(instance);
}

/** Expand a single group. */
export function expandGroup(instance: cytoscape.Core, groupId: string): void {
  if (!collapsedGroups.has(groupId)) return;
  collapsedGroups.delete(groupId);

  const group = instance.getElementById(groupId) as cytoscape.NodeSingular;
  if (!group.length) return;

  // Show descendants
  const descendants = group.descendants().not('[type="group"]');
  descendants.removeClass('collapsed-child');

  // Show subgroup containers
  group.descendants('[type="group"]').removeClass('collapsed-child');

  // Restore real edges — show only if BOTH endpoints are visible
  descendants.connectedEdges().not('.aggregate-edge').forEach((e: cytoscape.EdgeSingular) => {
    const srcVisible = !e.source().hasClass('collapsed-child');
    const tgtVisible = !e.target().hasClass('collapsed-child');
    if (srcVisible && tgtVisible) {
      e.removeClass('collapsed-edge');
    }
  });

  group.removeClass('group-collapsed');

  refreshAggregateEdges(instance);

  // Fit viewport to expanded group so it doesn't stretch off-screen
  const expandedEles = group.add(descendants);
  instance.animate({
    fit: { eles: expandedEles, padding: 60 },
    duration: 300,
    easing: 'ease-out-cubic',
  });
}

/** Toggle collapse/expand for a group. */
export function toggleGroup(instance: cytoscape.Core, groupId: string): void {
  if (collapsedGroups.has(groupId)) {
    expandGroup(instance, groupId);
  } else {
    collapseGroup(instance, groupId);
  }
}

/** Recalculate which aggregate edges should be visible. */
function refreshAggregateEdges(instance: cytoscape.Core): void {
  instance.edges('.aggregate-edge').forEach((e: cytoscape.EdgeSingular) => {
    const src = e.data('source') as string;
    const tgt = e.data('target') as string;
    if (shouldShowAggregateEdge(src, tgt, collapsedGroups, allGroupIds)) {
      e.addClass('aggregate-visible');
    } else {
      e.removeClass('aggregate-visible');
    }
  });
}

/**
 * Determines if an aggregate edge should be visible.
 * An aggregate edge is shown when at least one of its group endpoints is collapsed.
 * If a group endpoint is expanded, the edge stays hidden (real edges are visible instead).
 * Exported for unit testing.
 */
export function shouldShowAggregateEdge(
  src: string,
  tgt: string,
  collapsed: ReadonlySet<string>,
  groupIds: ReadonlySet<string>,
): boolean {
  const srcIsGroup = groupIds.has(src);
  const tgtIsGroup = groupIds.has(tgt);

  // At least one end must be a group
  if (!srcIsGroup && !tgtIsGroup) return false;

  // If a group end exists but is NOT collapsed, hide this aggregate
  if (srcIsGroup && !collapsed.has(src)) return false;
  if (tgtIsGroup && !collapsed.has(tgt)) return false;

  return true;
}

// ── Impact mode integration ───────────────────────────────────────────

/**
 * Auto-expand groups containing affected nodes before impact highlighting.
 * Stores which groups were expanded so they can be re-collapsed on clear.
 */
export function expandGroupsForImpact(
  instance: cytoscape.Core,
  affectedNodeIds: Set<string>,
): void {
  impactExpandedGroups.clear();

  for (const groupId of collapsedGroups) {
    const group = instance.getElementById(groupId) as cytoscape.NodeSingular;
    if (!group.length) continue;

    // Check if any affected node is a descendant of this group
    const hasAffected = group.descendants().some(
      (n: cytoscape.NodeSingular) => affectedNodeIds.has(n.id()),
    );

    if (hasAffected) {
      impactExpandedGroups.add(groupId);
    }
  }

  // Expand affected groups (iterate copy since expandGroup modifies the set)
  for (const groupId of impactExpandedGroups) {
    expandGroup(instance, groupId);
  }
}

/**
 * Re-collapse groups that were auto-expanded for impact mode.
 */
export function restoreGroupsAfterImpact(instance: cytoscape.Core): void {
  for (const groupId of impactExpandedGroups) {
    collapseGroup(instance, groupId);
  }
  impactExpandedGroups.clear();
}

/**
 * Reset all collapse state. Called when graph is reinitialized.
 */
export function resetCollapseState(): void {
  collapsedGroups.clear();
  impactExpandedGroups.clear();
  allGroupIds.clear();
}
