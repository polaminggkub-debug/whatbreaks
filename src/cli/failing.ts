import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { GraphIndex, loadGraph } from '../engine/graph.js';
import { analyzeFailingTest } from '../engine/failing.js';
import type { FailingResult } from '../types/graph.js';

function printFailingResult(result: FailingResult): void {
  console.log(chalk.red.bold(`\n  TEST: ${result.test} (FAILED)\n`));

  // Directly tests
  if (result.directlyTests.length > 0) {
    console.log(chalk.cyan('  Directly tests:'));
    for (const file of result.directlyTests) {
      const node = result.chain.find((n) => n.nodeId === file);
      const layer = node?.layer ? ` (${node.layer})` : '';
      console.log(`    ${chalk.yellow('\u2192')} ${file}${chalk.dim(layer)}`);
    }
    console.log();
  }

  // Deep dependencies
  if (result.deepDependencies.length > 0) {
    console.log(chalk.cyan('  Which depend on:'));
    for (const dep of result.deepDependencies) {
      const node = result.chain.find((n) => n.nodeId === dep);
      const layer = node?.layer ? ` (${node.layer})` : '';
      const isDeepest =
        dep === result.filesToInvestigate[0];
      const suffix = isDeepest
        ? chalk.red.bold(' \u2190 LIKELY ROOT CAUSE (deepest dependency)')
        : '';
      console.log(
        `    ${chalk.yellow('\u2192')} ${dep}${chalk.dim(layer)}${suffix}`
      );
    }
    console.log();
  }

  // Files to investigate
  if (result.filesToInvestigate.length > 0) {
    console.log(chalk.cyan('  Files to investigate (deepest-first):'));
    result.filesToInvestigate.forEach((file, i) => {
      console.log(`    ${chalk.white.bold(`${i + 1}.`)} ${file}`);
    });
    console.log();
  }

  // Other tests at risk
  if (result.otherTestsAtRisk.length > 0) {
    console.log(chalk.cyan('  Other tests that would also fail:'));
    for (const test of result.otherTestsAtRisk) {
      console.log(`    ${chalk.red('\u2717')} ${test}`);
    }
    console.log();
  } else {
    console.log(chalk.green('  No other tests at risk.\n'));
  }
}

export function registerFailingCommand(program: Command): void {
  program
    .command('failing')
    .description('Analyze a failing test to find root cause')
    .argument('<test-file>', 'The failing test file')
    .option('--json', 'Output result as JSON')
    .action(async (testFile: string, opts: { json?: boolean }) => {
      const graphPath = resolve(process.cwd(), '.whatbreaks/graph.json');

      if (!existsSync(graphPath)) {
        console.error(chalk.red("\n  Graph not found. Run 'whatbreaks scan' first.\n"));
        process.exit(1);
      }

      const spinner = ora('Analyzing failing test...').start();

      try {
        const graph = loadGraph(graphPath);
        const index = new GraphIndex(graph);
        const result = analyzeFailingTest(index, testFile);

        spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          printFailingResult(result);
        }
      } catch (err) {
        spinner.fail('Analysis failed');
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n  ${message}\n`));
        process.exit(1);
      }
    });
}
