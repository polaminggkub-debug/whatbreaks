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
        'background-clip': 'none',
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
        'transition-duration': 250,
      } as unknown as cytoscape.Css.Node,
    },
    // Group (compound parent) node styles
    {
      selector: 'node[type="group"]',
      style: {
        'shape': 'roundrectangle',
        'background-color': '#1e293b',
        'background-opacity': 0.6,
        'border-width': 1,
        'border-style': 'dashed',
        'border-color': '#475569',
        'border-opacity': 0.5,
        'label': 'data(label)',
        'color': '#94a3b8',
        'font-size': '10px',
        'font-weight': 600,
        'text-transform': 'uppercase',
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': -4,
        'padding': '16px',
        'text-max-width': '200px',
        'text-wrap': 'none',
        'text-background-color': '#1e293b',
        'text-background-opacity': 0.9,
        'text-background-padding': '3px',
      } as unknown as cytoscape.Css.Node,
    },
    // Subgroup (nested compound) node styles — subtler than parent groups
    {
      selector: 'node[type="group"][level=1]',
      style: {
        'background-color': '#1e293b',
        'background-opacity': 0.4,
        'border-width': 1,
        'border-style': 'dotted',
        'border-color': '#334155',
        'border-opacity': 0.5,
        'font-size': '9px',
        'padding': '12px',
        'text-margin-y': -3,
      } as unknown as cytoscape.Css.Node,
    },
    // Focus mode — group highlighted
    {
      selector: 'node[type="group"].group-focused',
      style: {
        'border-color': '#6366f1',
        'border-opacity': 0.8,
        'border-width': 2,
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
    {
      selector: 'node.hover',
      style: {
        'background-color': '#334155',
        'border-width': 3,
        'z-index': 999,
      } as unknown as cytoscape.Css.Node,
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
    // Impact styles — overlay/glow channel (preserves structural border color)
    {
      selector: 'node.impact-root',
      style: {
        'overlay-color': '#dc2626',
        'overlay-opacity': 0.35,
        'overlay-padding': 8,
        'border-width': 4,
        'width': 60,
        'height': 42,
        'font-size': '12px',
        'font-weight': 700,
        'color': '#fca5a5',
        'z-index': 999,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.impact-direct',
      style: {
        'overlay-color': '#f87171',
        'overlay-opacity': 0.25,
        'overlay-padding': 6,
        'border-width': 3,
        'color': '#fecaca',
        'z-index': 998,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.impact-indirect',
      style: {
        'overlay-color': '#fecaca',
        'overlay-opacity': 0.15,
        'overlay-padding': 4,
        'border-width': 2,
        'color': '#fecaca',
        'z-index': 997,
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'node.impact-unaffected',
      style: {
        'opacity': 0.25,
        'color': '#475569',
        'font-size': '8px',
      } as unknown as cytoscape.Css.Node,
    },
    {
      selector: 'edge',
      style: {
        'width': 1.2,
        'line-color': '#475569',
        'target-arrow-color': '#475569',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.8,
        'curve-style': 'bezier',
        'opacity': 0.4,
        'transition-property': 'line-color, target-arrow-color, opacity, width',
        'transition-duration': 250,
      } as unknown as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.hover-connected',
      style: {
        'line-color': '#94a3b8',
        'target-arrow-color': '#94a3b8',
        'opacity': 0.9,
        'width': 2,
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
        'line-color': '#dc2626',
        'target-arrow-color': '#dc2626',
        'opacity': 1,
        'width': 2.5,
        'z-index': 998,
        'line-style': 'dashed',
        'line-dash-pattern': [8, 4],
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
    {
      selector: 'edge[edgeType="test-covers"]',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [6, 3],
      } as unknown as cytoscape.Css.Edge,
    },
  ];
}
