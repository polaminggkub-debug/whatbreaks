/**
 * Tooltip utilities for graph interactions (group and edge tooltips).
 */

// ── Group tooltip (right-click to collapse hint) ────────────────────
let groupTooltip: HTMLDivElement | null = null;

function getGroupTooltip(): HTMLDivElement {
  if (!groupTooltip) {
    groupTooltip = document.createElement('div');
    groupTooltip.className = 'wb-group-tooltip';
    groupTooltip.textContent = 'Right-click to collapse';
    Object.assign(groupTooltip.style, {
      position: 'fixed',
      pointerEvents: 'none',
      background: 'rgba(15, 23, 42, 0.9)',
      color: '#94a3b8',
      fontSize: '11px',
      padding: '4px 8px',
      borderRadius: '4px',
      border: '1px solid rgba(100, 116, 139, 0.3)',
      zIndex: '9999',
      display: 'none',
      whiteSpace: 'nowrap',
    });
    document.body.appendChild(groupTooltip);
  }
  return groupTooltip;
}

export function showGroupTooltip(x: number, y: number): void {
  const tip = getGroupTooltip();
  tip.style.left = `${x + 12}px`;
  tip.style.top = `${y - 8}px`;
  tip.style.display = 'block';
}

export function hideGroupTooltip(): void {
  if (groupTooltip) groupTooltip.style.display = 'none';
}

// ── Edge tooltip (aggregate edge hover) ──────────────────────────────
let edgeTooltip: HTMLDivElement | null = null;

function getEdgeTooltip(): HTMLDivElement {
  if (!edgeTooltip) {
    edgeTooltip = document.createElement('div');
    edgeTooltip.className = 'wb-edge-tooltip';
    Object.assign(edgeTooltip.style, {
      position: 'fixed',
      pointerEvents: 'none',
      background: 'rgba(15, 23, 42, 0.95)',
      color: '#e2e8f0',
      fontSize: '12px',
      padding: '6px 10px',
      borderRadius: '6px',
      border: '1px solid rgba(99, 102, 241, 0.4)',
      zIndex: '9999',
      display: 'none',
      whiteSpace: 'nowrap',
      maxWidth: '300px',
    });
    document.body.appendChild(edgeTooltip);
  }
  return edgeTooltip;
}

export function showEdgeTooltip(x: number, y: number, text: string): void {
  const tip = getEdgeTooltip();
  tip.textContent = text;
  tip.style.left = `${x + 12}px`;
  tip.style.top = `${y - 8}px`;
  tip.style.display = 'block';
}

export function hideEdgeTooltip(): void {
  if (edgeTooltip) edgeTooltip.style.display = 'none';
}
