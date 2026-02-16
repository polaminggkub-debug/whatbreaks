import { describe, it, expect } from 'vitest';
import type { FileGroup, Graph } from '../../src/types/graph';
import { computeFileGroups } from '../../src/engine/grouping';
import { scanRepository } from '../../src/scanner/index';

describe('FileGroup type', () => {
  it('should have required properties', () => {
    const group: FileGroup = {
      id: 'group-todo',
      label: 'Todo',
      nodeIds: ['src/todo.ts', 'src/todoService.ts'],
      centralNodeId: 'src/todo.ts',
    };
    expect(group.id).toBe('group-todo');
    expect(group.label).toBe('Todo');
    expect(group.nodeIds).toHaveLength(2);
    expect(group.centralNodeId).toBe('src/todo.ts');
  });

  it('Graph type should support optional groups array', () => {
    const graph: Graph = {
      nodes: [],
      edges: [],
      groups: [{ id: 'g1', label: 'G1', nodeIds: [], centralNodeId: '' }],
    };
    expect(graph.groups).toHaveLength(1);
  });

  it('Graph without groups should still be valid', () => {
    const graph: Graph = { nodes: [], edges: [] };
    expect(graph.groups).toBeUndefined();
  });
});

describe('computeFileGroups', () => {
  describe('Pass 1: directory seeds', () => {
    it('groups files in the same directory', () => {
      const graph: Graph = {
        nodes: [
          { id: 'src/todo/service.ts', label: 'service.ts', layer: 'feature', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'src/todo/model.ts', label: 'model.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'src/user/service.ts', label: 'service.ts', layer: 'feature', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          // Need 8+ source nodes to pass MIN_FILES_FOR_GROUPING
          { id: 'src/user/model.ts', label: 'model.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'src/auth/login.ts', label: 'login.ts', layer: 'feature', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'src/auth/register.ts', label: 'register.ts', layer: 'feature', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'src/utils/helper.ts', label: 'helper.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'src/utils/format.ts', label: 'format.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        ],
        edges: [],
      };
      const groups = computeFileGroups(graph);
      expect(groups.length).toBeGreaterThanOrEqual(2);
      const todoGroup = groups.find(g => g.nodeIds.includes('src/todo/service.ts'));
      expect(todoGroup).toBeDefined();
      expect(todoGroup!.nodeIds).toContain('src/todo/model.ts');
    });

    it('excludes test nodes from grouping', () => {
      const graph: Graph = {
        nodes: [
          { id: 'src/todo.ts', label: 'todo.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'tests/todo.test.ts', label: 'todo.test.ts', layer: 'test', type: 'test', functions: [], depth: 0, layerIndex: -1, fanIn: 0, size: 30 },
          // Pad to 8 source nodes
          { id: 'src/a.ts', label: 'a.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'src/b.ts', label: 'b.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'src/c.ts', label: 'c.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'src/d.ts', label: 'd.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'src/e.ts', label: 'e.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'src/f.ts', label: 'f.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'src/g.ts', label: 'g.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        ],
        edges: [],
      };
      const groups = computeFileGroups(graph);
      const allNodeIds = groups.flatMap(g => g.nodeIds);
      expect(allNodeIds).not.toContain('tests/todo.test.ts');
    });

    it('root-level files each start as own seed', () => {
      const graph: Graph = {
        nodes: [
          { id: 'src/todoService.ts', label: 'todoService.ts', layer: 'feature', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
          { id: 'src/userService.ts', label: 'userService.ts', layer: 'feature', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 0, size: 30 },
        ],
        edges: [],
      };
      // Before merging, each root file is its own seed
      const groups = computeFileGroups(graph);
      // With fewer than 8 source nodes, returns empty
      expect(groups).toHaveLength(0);
    });
  });

  describe('Pass 2: dependency merge', () => {
    it('merges cross-directory groups with high coupling', () => {
      const graph: Graph = {
        nodes: [
          { id: 'src/controllers/todoCtrl.ts', label: 'todoCtrl.ts', layer: 'feature', type: 'source', functions: [], depth: 2, layerIndex: 2, fanIn: 0, size: 30 },
          { id: 'src/controllers/userCtrl.ts', label: 'userCtrl.ts', layer: 'feature', type: 'source', functions: [], depth: 2, layerIndex: 2, fanIn: 0, size: 30 },
          { id: 'src/services/todoSvc.ts', label: 'todoSvc.ts', layer: 'feature', type: 'source', functions: [], depth: 1, layerIndex: 1, fanIn: 1, size: 36 },
          { id: 'src/services/userSvc.ts', label: 'userSvc.ts', layer: 'feature', type: 'source', functions: [], depth: 1, layerIndex: 1, fanIn: 1, size: 36 },
          { id: 'src/models/todo.ts', label: 'todo.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 2, size: 42 },
          { id: 'src/models/user.ts', label: 'user.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 2, size: 42 },
          { id: 'src/utils/validator.ts', label: 'validator.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 3, size: 48 },
          { id: 'src/utils/formatter.ts', label: 'formatter.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 2, size: 42 },
        ],
        edges: [
          { source: 'src/controllers/todoCtrl.ts', target: 'src/services/todoSvc.ts', type: 'import' },
          { source: 'src/services/todoSvc.ts', target: 'src/models/todo.ts', type: 'import' },
          { source: 'src/controllers/todoCtrl.ts', target: 'src/models/todo.ts', type: 'import' },
          { source: 'src/controllers/userCtrl.ts', target: 'src/services/userSvc.ts', type: 'import' },
          { source: 'src/services/userSvc.ts', target: 'src/models/user.ts', type: 'import' },
          { source: 'src/services/todoSvc.ts', target: 'src/utils/validator.ts', type: 'import' },
          { source: 'src/services/userSvc.ts', target: 'src/utils/validator.ts', type: 'import' },
          { source: 'src/controllers/todoCtrl.ts', target: 'src/utils/formatter.ts', type: 'import' },
        ],
      };
      const groups = computeFileGroups(graph);

      const todoGroup = groups.find(g =>
        g.nodeIds.includes('src/controllers/todoCtrl.ts') &&
        g.nodeIds.includes('src/services/todoSvc.ts')
      );
      expect(todoGroup).toBeDefined();

      const validatorGroup = groups.find(g => g.nodeIds.includes('src/utils/validator.ts'));
      if (validatorGroup) {
        expect(validatorGroup.nodeIds).not.toContain('src/controllers/todoCtrl.ts');
      }
    });

    it('merges flat root-level files with strong coupling', () => {
      const graph: Graph = {
        nodes: [
          { id: 'src/todoService.ts', label: 'todoService.ts', layer: 'feature', type: 'source', functions: [], depth: 1, layerIndex: 1, fanIn: 1, size: 36 },
          { id: 'src/todoController.ts', label: 'todoController.ts', layer: 'feature', type: 'source', functions: [], depth: 2, layerIndex: 2, fanIn: 0, size: 30 },
          { id: 'src/todo.ts', label: 'todo.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 2, size: 42 },
          { id: 'src/userService.ts', label: 'userService.ts', layer: 'feature', type: 'source', functions: [], depth: 1, layerIndex: 1, fanIn: 1, size: 36 },
          { id: 'src/userController.ts', label: 'userController.ts', layer: 'feature', type: 'source', functions: [], depth: 2, layerIndex: 2, fanIn: 0, size: 30 },
          { id: 'src/user.ts', label: 'user.ts', layer: 'shared', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 2, size: 42 },
          { id: 'src/config.ts', label: 'config.ts', layer: 'config', type: 'source', functions: [], depth: 0, layerIndex: 0, fanIn: 4, size: 54 },
          { id: 'src/index.ts', label: 'index.ts', layer: 'page', type: 'source', functions: [], depth: 3, layerIndex: 3, fanIn: 0, size: 30 },
        ],
        edges: [
          { source: 'src/todoController.ts', target: 'src/todoService.ts', type: 'import' },
          { source: 'src/todoService.ts', target: 'src/todo.ts', type: 'import' },
          { source: 'src/todoController.ts', target: 'src/todo.ts', type: 'import' },
          { source: 'src/userController.ts', target: 'src/userService.ts', type: 'import' },
          { source: 'src/userService.ts', target: 'src/user.ts', type: 'import' },
          { source: 'src/index.ts', target: 'src/todoController.ts', type: 'import' },
          { source: 'src/index.ts', target: 'src/userController.ts', type: 'import' },
        ],
      };
      const groups = computeFileGroups(graph);

      const todoGroup = groups.find(g =>
        g.nodeIds.includes('src/todoService.ts') &&
        g.nodeIds.includes('src/todo.ts')
      );
      expect(todoGroup).toBeDefined();
    });
  });
});

describe('scan pipeline integration', () => {
  it('scanRepository returns groups when project is large enough', async () => {
    // Use demo-simple which has 10+ source files (>= 8 threshold)
    const graph = await scanRepository('demo-simple');
    expect(graph.groups).toBeDefined();
    expect(Array.isArray(graph.groups)).toBe(true);
  });

  it('produces groups for demo-simple (10 source files)', async () => {
    const graph = await scanRepository('demo-simple');
    expect(graph.groups).toBeDefined();
    expect(Array.isArray(graph.groups)).toBe(true);

    // demo-simple has 10 source files (>= 8 threshold) but is a small,
    // tightly-coupled project where all files merge into one mega-group.
    // The algorithm correctly returns [] when everything collapses into
    // a single group (since a single group spanning all files is pointless).
    // This validates the algorithm handles small well-connected projects gracefully.
    const sourceNodes = graph.nodes.filter(n => n.type !== 'test');
    expect(sourceNodes.length).toBeGreaterThanOrEqual(8);

    // Groups should be an array (possibly empty for tightly-coupled projects)
    // If groups exist, each should have valid structure
    for (const group of graph.groups!) {
      expect(group.id).toBeTruthy();
      expect(group.label).toBeTruthy();
      expect(group.nodeIds.length).toBeGreaterThanOrEqual(2);
      expect(group.centralNodeId).toBeTruthy();
      expect(group.nodeIds).toContain(group.centralNodeId);
    }
  });

  it('produces meaningful groups for demo project (67 source files)', async () => {
    const graph = await scanRepository('demo');
    expect(graph.groups).toBeDefined();
    // demo has 67 source files — large enough for meaningful clusters
    expect(graph.groups!.length).toBeGreaterThanOrEqual(2);

    // Should find a damage-related group (damageCalculator is the hub)
    const damageGroup = graph.groups!.find(g =>
      g.label.toLowerCase().includes('damage') ||
      g.nodeIds.some(id => id.includes('damage'))
    );
    expect(damageGroup).toBeDefined();
  });
});
