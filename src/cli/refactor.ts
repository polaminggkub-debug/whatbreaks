import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { GraphIndex, loadGraph } from '../engine/graph.js';
import { analyzeRefactorImpact } from '../engine/refactor.js';
import type { RefactorResult, RiskLevel } from '../types/graph.js';

function riskColor(level: RiskLevel): (text: string) => string {
  switch (level) {
    case 'high':
      return chalk.red;
    case 'medium':
      return chalk.yellow;
    case 'low':
      return chalk.green;
  }
}

function printRefactorResult(result: RefactorResult): void {
  const colorFn = riskColor(result.risk_level);

  console.log(chalk.cyan.bold(`\n  REFACTOR IMPACT: ${result.file}\n`));
  console.log(
    `  Risk: ${colorFn(result.risk_level.toUpperCase())} ${chalk.dim(`- ${result.risk_reason}`)}\n`
  );

  console.log(chalk.white.bold('  If you change this file:\n'));

  // Affected files
  console.log(
    chalk.cyan(`    Files affected (${result.affected_files}):`)
  );

  if (result.direct_importers.length > 0) {
    console.log(
      chalk.dim(`      Direct importers (${result.direct_importers.length}):`)
    );
    for (const file of result.direct_importers) {
      console.log(`        ${chalk.yellow('\u2192')} ${file}`);
    }
  }

  if (result.transitive_affected.length > 0) {
    console.log(
      chalk.dim(`      Indirect (${result.transitive_affected.length}):`)
    );
    for (const file of result.transitive_affected) {
      console.log(`        ${chalk.yellow('\u2192')} ${file}`);
    }
  }

  console.log();

  // Tests to run
  console.log(
    chalk.cyan(`    Tests to run (${result.affected_tests}):`)
  );
  for (const test of result.tests_to_run) {
    console.log(`      ${chalk.yellow('\u2192')} ${test}`);
  }

  // Suggested command
  if (result.suggested_test_command) {
    console.log(chalk.cyan('\n    Suggested test command:'));
    console.log(`      ${chalk.green(result.suggested_test_command)}`);
  }

  console.log();
}

function printTestsOnly(result: RefactorResult): void {
  console.log(chalk.cyan.bold(`\n  Tests for: ${result.file}\n`));

  if (result.tests_to_run.length === 0) {
    console.log(chalk.yellow('  No tests found for this file.\n'));
    return;
  }

  for (const test of result.tests_to_run) {
    console.log(`  ${chalk.yellow('\u2192')} ${test}`);
  }

  if (result.suggested_test_command) {
    console.log(chalk.cyan('\n  Run:'));
    console.log(`  ${chalk.green(result.suggested_test_command)}\n`);
  }
}

export function registerRefactorCommand(program: Command): void {
  program
    .command('refactor')
    .description('Analyze the blast radius of refactoring a file')
    .argument('<file>', 'The file you plan to refactor')
    .option('--json', 'Output result as JSON')
    .option('--tests-only', 'Only show affected tests and suggested command')
    .action(async (file: string, opts: { json?: boolean; testsOnly?: boolean }) => {
      const graphPath = resolve(process.cwd(), '.whatbreaks/graph.json');

      if (!existsSync(graphPath)) {
        console.error(chalk.red("\n  Graph not found. Run 'whatbreaks scan' first.\n"));
        process.exit(1);
      }

      const spinner = ora('Analyzing refactor impact...').start();

      try {
        const graph = loadGraph(graphPath);
        const index = new GraphIndex(graph);
        const result = analyzeRefactorImpact(index, file);

        spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else if (opts.testsOnly) {
          printTestsOnly(result);
        } else {
          printRefactorResult(result);
        }
      } catch (err) {
        spinner.fail('Analysis failed');
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n  ${message}\n`));
        process.exit(1);
      }
    });
}
