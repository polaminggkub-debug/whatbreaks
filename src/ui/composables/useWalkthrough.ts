import { ref, computed } from 'vue';
import type { Graph } from '../../types/graph.js';
import type cytoscape from 'cytoscape';

export interface WalkthroughStep {
  title: string;
  description: string;
  animate: (cy: cytoscape.Core) => void;
}

export interface WalkthroughContext {
  expandGroup: (cy: cytoscape.Core, groupId: string) => void;
  collapseGroup: (cy: cytoscape.Core, groupId: string) => void;
  showContextMenu: (cy: cytoscape.Core, nodeId: string, nodeLabel: string) => void;
}

const ALL_CLASSES = 'walkthrough-highlight walkthrough-dimmed walkthrough-impact-flash';

export function useWalkthrough(graph: () => Graph | null, ctx?: WalkthroughContext) {
  const isActive = ref(false);
  const currentStep = ref(0);
  const walkthroughExpandedGroups = new Set<string>();

  const steps = computed<WalkthroughStep[]>(() => {
    const g = graph();
    if (!g) return [];

    const sourceFiles = g.nodes.filter(n => n.type === 'source');
    const testFiles = g.nodes.filter(n => n.type === 'test');
    const groups = g.groups?.filter(gr => gr.level === 0) ?? [];

    // Find hub: node with highest fanIn
    let hub = sourceFiles[0];
    for (const n of sourceFiles) {
      if (n.fanIn > (hub?.fanIn ?? 0)) hub = n;
    }

    // BFS forward from hub to count affected tests
    const affectedTests = new Set<string>();
    if (hub) {
      const adjMap = new Map<string, string[]>();
      for (const e of g.edges) {
        if (!adjMap.has(e.target)) adjMap.set(e.target, []);
        adjMap.get(e.target)!.push(e.source);
      }
      const visited = new Set<string>();
      const queue = [hub.id];
      visited.add(hub.id);
      while (queue.length > 0) {
        const current = queue.shift()!;
        const node = g.nodes.find(n => n.id === current);
        if (node?.type === 'test') affectedTests.add(current);
        for (const neighbor of adjMap.get(current) ?? []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }

    function clearClasses(cy: cytoscape.Core) {
      cy.elements().removeClass(ALL_CLASSES);
    }

    function ensureVisible(cy: cytoscape.Core, nodeId: string) {
      if (!ctx) return;
      const node = cy.getElementById(nodeId);
      if (!node.length) return;
      const parent = node.parent('[type="group"]');
      if (parent.length && node.hasClass('collapsed-child')) {
        ctx.expandGroup(cy, parent.id());
        walkthroughExpandedGroups.add(parent.id());
      }
    }

    return [
      // Step 1: Overview
      {
        title: 'Your Project at a Glance',
        description: `${sourceFiles.length} source files, ${testFiles.length} tests, ${groups.length} modules`,
        animate: (cy: cytoscape.Core) => {
          clearClasses(cy);
          cy.animate({ fit: { eles: cy.elements(), padding: 40 }, duration: 600, easing: 'ease-out-cubic' });
        },
      },
      // Step 2: Main Modules — fit to groups only, dim rest
      {
        title: 'Your Main Modules',
        description: groups.length > 0
          ? groups.map(g => g.label).join(', ')
          : 'No module groups detected',
        animate: (cy: cytoscape.Core) => {
          clearClasses(cy);
          const groupNodes = cy.nodes('[type="group"]');
          groupNodes.addClass('walkthrough-highlight');
          cy.nodes().not(groupNodes).addClass('walkthrough-dimmed');
          cy.edges().addClass('walkthrough-dimmed');
          cy.animate({ fit: { eles: groupNodes, padding: 60 }, duration: 600, easing: 'ease-out-cubic' });
        },
      },
      // Step 3: Most Connected File — expand parent group if collapsed
      {
        title: 'Most Connected File',
        description: hub
          ? `${hub.label} — ${hub.fanIn} files depend on it`
          : 'No hub file detected',
        animate: (cy: cytoscape.Core) => {
          clearClasses(cy);
          if (hub) {
            ensureVisible(cy, hub.id);
            const hubNode = cy.getElementById(hub.id);
            if (hubNode.length) {
              cy.nodes().not(hubNode).not('[type="group"]').addClass('walkthrough-dimmed');
              cy.edges().addClass('walkthrough-dimmed');
              hubNode.addClass('walkthrough-highlight');
              cy.animate({ center: { eles: hubNode }, zoom: 1.5, duration: 600, easing: 'ease-out-cubic' });
            }
          }
        },
      },
      // Step 4: What If It Breaks? — expand parent group if collapsed
      {
        title: 'What If It Breaks?',
        description: hub
          ? `${affectedTests.size} tests could be affected`
          : 'Select a file to see impact',
        animate: (cy: cytoscape.Core) => {
          clearClasses(cy);
          if (hub) {
            ensureVisible(cy, hub.id);
            const hubNode = cy.getElementById(hub.id);
            if (hubNode.length) {
              cy.nodes().not(hubNode).not('[type="group"]').addClass('walkthrough-dimmed');
              cy.edges().addClass('walkthrough-dimmed');
              hubNode.addClass('walkthrough-impact-flash');
              cy.animate({ center: { eles: hubNode }, zoom: 1.5, duration: 600, easing: 'ease-out-cubic' });
            }
          }
        },
      },
      // Step 5: Right-Click for Power — open real context menu
      {
        title: 'Right-Click for Power',
        description: 'Right-click any file for "What breaks?", "Show importers", and "Copy path"',
        animate: (cy: cytoscape.Core) => {
          clearClasses(cy);
          if (hub) {
            ensureVisible(cy, hub.id);
            const hubNode = cy.getElementById(hub.id);
            if (hubNode.length) {
              cy.nodes().not(hubNode).not('[type="group"]').addClass('walkthrough-dimmed');
              cy.edges().addClass('walkthrough-dimmed');
              hubNode.addClass('walkthrough-highlight');
              cy.animate({
                center: { eles: hubNode },
                zoom: 1.5,
                duration: 600,
                easing: 'ease-out-cubic',
                complete: () => {
                  if (ctx) {
                    ctx.showContextMenu(cy, hub.id, hub.label);
                  }
                },
              } as cytoscape.AnimateOptions);
            }
          }
        },
      },
      // Step 6: Start Exploring — reset view, re-collapse expanded groups
      {
        title: 'Start Exploring',
        description: 'Click folders to expand, files for dependency chains, right-click for options',
        animate: (cy: cytoscape.Core) => {
          clearClasses(cy);
          recollapseExpandedGroups(cy);
          cy.animate({ fit: { eles: cy.elements(), padding: 40 }, duration: 600, easing: 'ease-out-cubic' });
        },
      },
    ];
  });

  const totalSteps = computed(() => steps.value.length);

  function recollapseExpandedGroups(cy: cytoscape.Core) {
    if (!ctx) return;
    for (const groupId of walkthroughExpandedGroups) {
      ctx.collapseGroup(cy, groupId);
    }
    walkthroughExpandedGroups.clear();
  }

  function start(cy?: cytoscape.Core) {
    walkthroughExpandedGroups.clear();
    isActive.value = true;
    currentStep.value = 0;
    if (cy) steps.value[0]?.animate(cy);
  }

  function next(cy?: cytoscape.Core) {
    if (currentStep.value < totalSteps.value - 1) {
      currentStep.value++;
      if (cy) steps.value[currentStep.value]?.animate(cy);
    } else {
      finish(cy);
    }
  }

  function previous(cy?: cytoscape.Core) {
    if (currentStep.value > 0) {
      currentStep.value--;
      if (cy) steps.value[currentStep.value]?.animate(cy);
    }
  }

  function finish(cy?: cytoscape.Core) {
    isActive.value = false;
    currentStep.value = 0;
    if (cy) {
      cy.elements().removeClass(ALL_CLASSES);
      recollapseExpandedGroups(cy);
      cy.animate({ fit: { eles: cy.elements(), padding: 40 }, duration: 400, easing: 'ease-out-cubic' });
    }
  }

  return { isActive, currentStep, totalSteps, steps, start, next, previous, finish };
}
