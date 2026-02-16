import { Command } from 'commander';
import { resolve } from 'path';
import chalk from 'chalk';
import { loadGraph } from '../engine/graph.js';

export function registerGroupsCommand(program: Command): void {
  program
    .command('groups')
    .description('Show file groups from the dependency graph')
    .option('-i, --input <path>', 'Path to graph file', '.whatbreaks/graph.json')
    .option('--json', 'Output as JSON')
    .action((opts: { input: string; json?: boolean }) => {
      const graphPath = resolve(process.cwd(), opts.input);

      try {
        const graph = loadGraph(graphPath);
        const groups = graph.groups ?? [];

        if (opts.json) {
          console.log(JSON.stringify(groups, null, 2));
          return;
        }

        if (groups.length === 0) {
          console.log(chalk.dim('\n  No file groups found.\n'));
          console.log(chalk.dim('  This can happen if the project has fewer than 8 source files.\n'));
          return;
        }

        console.log(chalk.cyan.bold(`\n  File Groups (${groups.length})\n`));

        for (const group of groups) {
          console.log(chalk.bold(`  ${group.label}`));
          console.log(chalk.dim(`  Central: ${group.centralNodeId}`));
          for (const nodeId of group.nodeIds) {
            const marker = nodeId === group.centralNodeId ? chalk.yellow('*') : ' ';
            console.log(`    ${marker} ${nodeId}`);
          }
          console.log();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n  Error: ${message}\n`));
        console.error(chalk.dim('  Run "whatbreaks scan <dir>" first.\n'));
        process.exit(1);
      }
    });
}
