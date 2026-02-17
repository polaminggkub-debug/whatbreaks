import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { GraphIndex, loadGraph } from '../engine/graph.js';
import { computeForwardImpact, computeBackwardImpact } from '../engine/impact.js';
import type { ImpactResult } from '../types/graph.js';

function printImpactDirection(
  label: string,
  description: string,
  result: ImpactResult,
  index: GraphIndex
): void {
  console.log(chalk.cyan.bold(`  ${label}`));
  console.log(chalk.dim(`  ${description}\n`));

  if (result.nodes.length <= 1) {
    console.log(chalk.dim('    No dependencies found.\n'));
    return;
  }

  // Group by depth (skip depth 0 which is the file itself)
  const byDepth = new Map<number, string[]>();
  for (const { nodeId, depth } of result.nodes) {
    if (depth === 0) continue;
    const list = byDepth.get(depth) ?? [];
    list.push(nodeId);
    byDepth.set(depth, list);
  }

  const sortedDepths = Array.from(byDepth.keys()).sort((a, b) => a - b);

  for (const depth of sortedDepths) {
    const files = byDepth.get(depth)!;
    console.log(chalk.dim(`    Depth ${depth} (${files.length}):`));
    for (const file of files) {
      const node = index.getNode(file);
      const layer = node?.layer ? chalk.dim(` (${node.layer})`) : '';
      const typeTag = node?.type === 'test' ? chalk.magenta(' [test]') : '';
      console.log(`      ${chalk.yellow('\u2192')} ${file}${layer}${typeTag}`);
    }
  }

  console.log();

  // Affected tests
  if (result.affectedTests.length > 0) {
    console.log(chalk.cyan(`    Affected tests (${result.affectedTests.length}):`));
    for (const test of result.affectedTests) {
      console.log(`      ${chalk.red('\u2717')} ${test}`);
    }
    console.log();
  }
}

export function registerImpactCommand(program: Command): void {
  program
    .command('impact')
    .description('Analyze forward and backward impact of a file')
    .argument('<file>', 'The file to analyze')
    .option('--json', 'Output result as JSON')
    .option(
      '-d, --direction <dir>',
      'Direction: both, forward, backward',
      'both'
    )
    .action(async (file: string, opts: { json?: boolean; direction: string }) => {
      const graphPath = resolve(process.cwd(), '.whatbreaks/graph.json');

      if (!existsSync(graphPath)) {
        console.error(chalk.red("\n  Graph not found. Run 'whatbreaks scan' first.\n"));
        process.exit(1);
      }

      const direction = opts.direction as 'both' | 'forward' | 'backward';
      if (!['both', 'forward', 'backward'].includes(direction)) {
        console.error(chalk.red(`\n  Invalid direction: ${direction}. Use both, forward, or backward.\n`));
        process.exit(1);
      }

      const spinner = ora('Analyzing impact...').start();

      try {
        const graph = loadGraph(graphPath);
        const index = new GraphIndex(graph);

        const results: Record<string, ImpactResult> = {};

        if (direction === 'both' || direction === 'forward') {
          results.forward = computeForwardImpact(index, file);
        }
        if (direction === 'both' || direction === 'backward') {
          results.backward = computeBackwardImpact(index, file);
        }

        spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        console.log(chalk.cyan.bold(`\n  IMPACT ANALYSIS: ${file}\n`));

        if (results.forward) {
          printImpactDirection(
            'Forward Impact (who breaks if this changes)',
            'Files that directly or transitively depend on this file',
            results.forward,
            index
          );
        }

        if (results.backward) {
          printImpactDirection(
            'Backward Impact (what this depends on)',
            'Files that this file directly or transitively imports',
            results.backward,
            index
          );
        }
      } catch (err) {
        spinner.fail('Analysis failed');
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n  ${message}\n`));
        process.exit(1);
      }
    });
}
