# Progressive Disclosure for Hub Nodes

**Date:** 2026-02-19
**Problem:** Hub nodes (e.g., `calculateFinalDamage.ts` with 55 edges) create visual clutter — starburst of arrows that's unreadable.
**Solution:** Hide hub edges by default, reveal on hover/click. Non-hub nodes unchanged.

---

## Section 1: Hub Detection & Badge

### Hub Threshold

- A node is a "hub" when **in-degree > 10**
- In-degree (not total degree) because in a dependency graph, "55 things depend on me" = hub, "I import 5 + 5 import me" = normal node
- Detection runs **after `layoutstop`**, not at init

### Hub Node Styling

- Class: `hub`
- **Border width** scales with degree: `Math.min(2 + Math.sqrt(inDegree), 8)`
  - degree 10 → 5px
  - degree 30 → 7.5px
  - degree 55 → 8px (capped)
- **Label** adds degree line using separate data field:
  ```
  calculateFinalDamage.ts
  55 deps
  ```
- Degree stored as `data.inDegree`, display label generated as `data.hubLabel`
- Original `data.label` is never mutated

### Hub Edge Hiding

- All edges connected to hub nodes get class `hub-edge-hidden`
- Style: `opacity: 0`, `events: no`
- **NOT `display: none`** — that breaks layout bounds, hit detection, and animations
- Non-hub edges (degree ≤ 10) behave exactly as today: bezier, `opacity: 0.38`

---

## Section 2: Hover & Click Reveal

### State Machine

Each hub node has 3 states:

| State | Hub edges | Trigger |
|---|---|---|
| `collapsed` | `opacity: 0, events: no` | Default |
| `previewing` | `opacity: 0.6` | Mouse enters hub node |
| `locked` | `opacity: 0.6, events: yes` | Click hub node |

### Hover (collapsed → previewing)

1. Mouse enters a `hub` node
2. Its connected edges: remove `hub-edge-hidden`, add `hub-edge-preview` (opacity 0.6)
3. All other nodes/edges get `hover-dimmed` (existing system)
4. Mouse leaves → remove `hub-edge-preview`, restore `hub-edge-hidden`

### Click (collapsed → locked)

1. Click a `hub` node
2. Its edges: remove `hub-edge-hidden`, add `hub-edge-locked` (persistent, survives mouseout)
3. Badge updates: `"55 deps"` → `"55 deps (pinned)"`
4. Click same node again OR click empty canvas → back to `collapsed`

### Rules

- **Only ONE hub can be locked at a time.** Clicking a second hub collapses the first.
- **Non-hub nodes:** Hover/click behavior stays exactly as-is. No changes.

---

## Section 3: Integration with Existing Systems

### Priority Order

```
Impact mode  >  Hub locked  >  Hub hover  >  Default
```

When impact analysis is active, hub disclosure is **suspended entirely**. Hub edges follow impact classification (`impact-path`, `impact-path-indirect`, `impact-unaffected`). When impact clears, hub edges return to `collapsed`.

### Class Layering

| Mode | Classes on hub edges |
|---|---|
| Default | `hub-edge-hidden` |
| Hover preview | `hub-edge-preview` (replaces hidden) |
| Click locked | `hub-edge-locked` (replaces preview) |
| Impact active | `impact-path` / `impact-unaffected` (hub classes removed) |

### Files to Change

| File | Change |
|---|---|
| `buildCytoscapeElements.ts` | Add `inDegree` to node data |
| `graphStyles.ts` | Add `hub`, `hub-edge-hidden`, `hub-edge-preview`, `hub-edge-locked` selectors + sqrt border scaling |
| `useGraphInteractions.ts` | Hub hover/click handlers, state machine, "only one locked hub" rule |
| `GraphView.vue` | Call `detectHubs()` in `layoutstop` callback |
| `highlightUtils.ts` | Strip hub classes before applying impact, restore on clear |

### What Doesn't Change

- Non-hub nodes (degree ≤ 10)
- Layout config (fcose/dagre)
- Edge animation (impact dashed lines)
- Impact analysis engine
- CLI commands
- Graph data format (graph.json)
