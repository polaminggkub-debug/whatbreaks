import type cytoscape from 'cytoscape';

/**
 * Cytoscape stylesheet for the dependency graph visualization.
 * Extracted from GraphView.vue to keep component under 500 LOC.
 */
export function getStylesheet(): cytoscape.Stylesheet[] {
  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'background-image': 'data(icon)',
        'background-fit': 'contain',
        'background-clip': 'node',
        'background-width': '70%',
        'background-height': '70%',
        'background-opacity': 0.15,
        'label': 'data(label)',
        'color': '#e2e8f0',
        'font-size': '11px',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 6,
        'text-background-color': '#0f172a',
        'text-background-opacity': 0.75,
        'text-background-padding': '2px',
        'width': 'data(nodeSize)',
        'height': 36,
        'shape': 'roundrectangle',
        'border-width': 2,
        'border-color': 'data(color)',
        'border-opacity': 0.8,
        'text-wrap': 'ellipsis',
        'text-max-width': '80px',
        'overlay-padding': 4,
        'transition-property': 'background-color, border-color, opacity, border-width',
        'transition-duration': 150,
      } as unknown as cytoscape.Css.Node,
    },
    // Feature group (level 0) — strong container, solid border
    {
      selector: 'node[type="group"]',
      style: {
        'shape': 'roundrectangle',
        'background-color': 'data(color)',
        'background-opacity': 0.10,
        'border-width': 2.5,
        'border-style': 'solid',
        'border-color': 'data(color)',
        'border-opacity': 0.6,
        'label': 'data(label)',
        'color': '#cbd5e1',
        'font-size': '13px',
        'font-weight': 600,
        'text-transform': 'uppercase',
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': -6,
        'padding': '16px',
        'text-max-width': '200px',
        'text-wrap': 'none',
        'text-background-color': '#0f172a',
        'text-background-opacity': 0.9,
        'text-background-padding': '3px',
      } as unknown as cytoscape.Css.Node,
    },
    // Subgroup (level 1) — faint container, dashed border, smaller label
    {
      selector: 'node[type="group"][level=1]',
      style: {
        'background-opacity': 0.03,
        'border-width': 1,
        'border-style': 'dashed',
        'border-opacity': 0.35,
        'font-size': '10px',
        'font-weight': 500,
        'color': '#64748b',
        'padding': '10px',
        'text-margin-y': -4,
      } as unknown as cytoscape.Css.Node,
    },
    // Focus mode — group highlighted
    {
      selector: 'node[type="group"].group-focused',
      style: {
        'border-color': 'data(color)',
        'border-opacity': 0.9,
        'border-width': 3,
        'background-opacity': 0.15,
      } as unknown as cytoscape.Css.Node,
    },
    // Focus mode — other groups dimmed
    {
      selector: 'node[type="group"].group-dimmed',
      style: {
        'opacity': 0.15,
        'border-opacity': 0.1,
      } as unknown as cytoscape.Css.Node,
    },
    // Focus mode — non-member nodes/edges faded
    {
      selector: 'node.group-faded',
      style: {
        'opacity': 0.12,
        'color': '#475569',
        'font-size': '8px',
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'edge.group-faded',
      style: {
        'opacity': 0.06,
        'width': 0.5,
      } as unknown as cytoscape.Css.Edge,
    },
    // Glow effect for high fan-in nodes (hub files)
    {
      selector: 'node[fanIn >= 4]',
      style: {
        'border-width': 3,
        'border-opacity': 1,
        'background-opacity': 0.25,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node[fanIn >= 6]',
      style: {
        'border-width': 4,
        'border-opacity': 1,
        'background-opacity': 0.35,
        'font-weight': 700,
      } as unknown as cytoscape.Css.Node,
    },
    // Test nodes use structural layer color (border) — test level is encoded by icon shape
    {
      selector: 'node:active',
      style: {
        'overlay-color': '#6366f1',
        'overlay-opacity': 0.15,
      } as unknown as cytoscape.Css.Node,
    },
    // Hover focus — 3-tier model: focus node, connected, dimmed
    {
      selector: 'node.hover-focus',
      style: {
        'opacity': 1,
        'background-opacity': 0.4,
        'border-width': 3,
        'z-index': 999,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.hover-neighbor',
      style: {
        'opacity': 0.95,
        'background-opacity': 0.3,
        'z-index': 998,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.hover-dimmed',
      style: {
        'opacity': 0.15,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'edge.hover-dimmed',
      style: {
        'opacity': 0.08,
      } as unknown as cytoscape.Css.Edge,
    },
    {
      selector: 'node.selected-node',
      style: {
        'background-color': '#334155',
        'border-width': 3,
        'border-color': '#ffffff',
        'z-index': 999,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.selected-neighbor',
      style: {
        'background-color': '#334155',
        'border-width': 3,
        'z-index': 998,
      } as unknown as cytoscape.Css.Node,
    },
    // Click-to-focus — dimmed nodes/edges/groups outside the chain
    {
      selector: 'node.selected-dimmed',
      style: {
        'opacity': 0.12,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node[type="group"].selected-dimmed',
      style: {
        'opacity': 0.12,
        'border-opacity': 0.1,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'edge.selected-dimmed',
      style: {
        'opacity': 0.06,
      } as unknown as cytoscape.Css.Edge,
    },
    // Impact styles — 3-color tiers using border + overlay (preserves icons/labels)
    {
      selector: 'node.impact-root',
      style: {
        'border-width': 4,
        'border-color': '#ffffff',
        'border-opacity': 1,
        'width': 64,
        'height': 44,
        'font-size': '13px',
        'font-weight': 700,
        'color': '#ffffff',
        'text-max-width': '160px',
        'z-index': 999,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.impact-direct',
      style: {
        'border-width': 3,
        'border-color': '#ef4444',
        'border-opacity': 1,
        'overlay-color': '#ef4444',
        'overlay-opacity': 0.25,
        'overlay-padding': 6,
        'background-opacity': 0.35,
        'font-size': '12px',
        'color': '#fca5a5',
        'text-max-width': '120px',
        'z-index': 998,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.impact-indirect',
      style: {
        'border-width': 2,
        'border-color': '#f59e0b',
        'border-opacity': 0.9,
        'overlay-color': '#f59e0b',
        'overlay-opacity': 0.15,
        'overlay-padding': 4,
        'background-opacity': 0.3,
        'font-size': '11px',
        'color': '#fcd34d',
        'text-max-width': '100px',
        'z-index': 997,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.impact-unaffected',
      style: {
        'opacity': 0.12,
        'color': '#475569',
        'font-size': '8px',
      } as unknown as cytoscape.Css.Node,
    },
    // Impact mode hover — additive highlight, doesn't override impact colors
    {
      selector: 'node.impact-hover',
      style: {
        'overlay-color': '#ffffff',
        'overlay-opacity': 0.3,
        'overlay-padding': 10,
        'border-width': 4,
        'border-color': '#ffffff',
        'border-opacity': 1,
        'z-index': 1000,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node[type="group"].impact-group-visible',
      style: {
        'border-opacity': 0.5,
        'background-opacity': 0,
        'color': '#64748b',
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'edge',
      style: {
        'events': 'no',
        'width': 2,
        'line-color': '#475569',
        'target-arrow-color': '#475569',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.8,
        'curve-style': 'bezier',
        'control-point-step-size': 40,
        'opacity': 0.35,
        'z-index': 1,
        'transition-property': 'line-color, target-arrow-color, opacity, width',
        'transition-duration': 150,
      } as unknown as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.hover-connected',
      style: {
        'line-color': '#94a3b8',
        'target-arrow-color': '#94a3b8',
        'opacity': 1,
        'width': 3,
        'z-index': 999,
      } as unknown as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.selected-connected',
      style: {
        'line-color': '#94a3b8',
        'target-arrow-color': '#94a3b8',
        'opacity': 0.9,
        'width': 2,
        'z-index': 998,
      } as unknown as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.impact-path',
      style: {
        'line-color': '#ef4444',
        'target-arrow-color': '#ef4444',
        'opacity': 0.9,
        'width': 2,
        'z-index': 998,
        'line-style': 'dashed',
        'line-dash-pattern': [8, 4],
        'line-dash-offset': 0,
      } as unknown as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.impact-path-indirect',
      style: {
        'line-color': '#f59e0b',
        'target-arrow-color': '#f59e0b',
        'opacity': 0.6,
        'width': 1.5,
        'z-index': 997,
        'line-style': 'dashed',
        'line-dash-pattern': [6, 4],
        'line-dash-offset': 0,
      } as unknown as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.impact-unaffected',
      style: {
        'opacity': 0.1,
        'width': 0.5,
      } as unknown as cytoscape.Css.Edge,
    },
    // Cycle highlight — circular dependency visualization
    {
      selector: 'node.cycle-highlight',
      style: {
        'overlay-color': '#f59e0b',
        'overlay-opacity': 0.3,
        'overlay-padding': 6,
        'border-width': 3,
        'border-color': '#f59e0b',
        'z-index': 999,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'edge.cycle-highlight',
      style: {
        'line-color': '#f59e0b',
        'target-arrow-color': '#f59e0b',
        'opacity': 1,
        'width': 2.5,
        'z-index': 999,
      } as unknown as cytoscape.Css.Edge,
    },
    {
      selector: 'node.cycle-dimmed',
      style: {
        'opacity': 0.2,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'edge.cycle-dimmed',
      style: {
        'opacity': 0.08,
      } as unknown as cytoscape.Css.Edge,
    },
    // Path trace highlight — single edge highlight on hover
    {
      selector: 'edge.path-highlight',
      style: {
        'line-color': '#e2e8f0',
        'target-arrow-color': '#e2e8f0',
        'opacity': 1,
        'width': 3,
        'z-index': 1000,
      } as unknown as cytoscape.Css.Edge,
    },
    {
      selector: 'edge[edgeType="test-covers"]',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [6, 3],
      } as unknown as cytoscape.Css.Edge,
    },
  ];
}
