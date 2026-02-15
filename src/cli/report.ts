import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { GraphIndex, loadGraph } from '../engine/graph.js';
import { analyzeRisk } from '../engine/risk.js';
import type { HealthReport, HotspotFile, FragileChain, CircularDep, RiskLevel } from '../types/graph.js';

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

function riskBadge(level: RiskLevel): string {
  const colorFn = riskColor(level);
  return colorFn(`[${level.toUpperCase()}]`);
}

function loadGraphOrExit(): { graph: ReturnType<typeof loadGraph>; index: GraphIndex } {
  const graphPath = resolve(process.cwd(), '.whatbreaks/graph.json');

  if (!existsSync(graphPath)) {
    console.error(chalk.red("\n  Graph not found. Run 'whatbreaks scan' first.\n"));
    process.exit(1);
  }

  const graph = loadGraph(graphPath);
  const index = new GraphIndex(graph);
  return { graph, index };
}

function printHotspots(hotspots: HotspotFile[], limit?: number): void {
  const items = limit ? hotspots.slice(0, limit) : hotspots;

  if (items.length === 0) {
    console.log(chalk.green('\n  No hotspots detected.\n'));
    return;
  }

  console.log(chalk.cyan.bold('\n  HOTSPOTS (highest blast-radius files)\n'));
  console.log(
    chalk.dim(
      `  ${'#'.padEnd(4)}${'File'.padEnd(50)}${'Fan-In'.padEnd(10)}${'Tests'.padEnd(10)}Risk`
    )
  );
  console.log(chalk.dim(`  ${''.padEnd(84, '\u2500')}`));

  items.forEach((h, i) => {
    const num = chalk.white.bold(`${i + 1}.`.padEnd(4));
    const file = h.file.padEnd(50);
    const fanIn = String(h.fanIn).padEnd(10);
    const tests = String(h.testsAtRisk).padEnd(10);
    const risk = riskBadge(h.riskLevel);
    console.log(`  ${num}${file}${fanIn}${tests}${risk}`);
    if (h.reason) {
      console.log(`  ${' '.repeat(4)}${chalk.dim(h.reason)}`);
    }
  });

  console.log();
}

function printCircularDeps(circular: CircularDep[]): void {
  if (circular.length === 0) {
    console.log(chalk.green('\n  No circular dependencies detected.\n'));
    return;
  }

  console.log(chalk.cyan.bold('\n  CIRCULAR DEPENDENCIES\n'));
  console.log(chalk.red(`  Found ${circular.length} circular dependency chain(s):\n`));

  circular.forEach((dep, i) => {
    console.log(chalk.white.bold(`  ${i + 1}. Cycle (${dep.cycle.length} files):`));
    const cycleStr = dep.cycle.map((f) => chalk.yellow(f)).join(chalk.dim(' -> '));
    console.log(`     ${cycleStr} ${chalk.dim('->')} ${chalk.yellow(dep.cycle[0])}`);
    console.log();
  });
}

function printFragileChains(chains: FragileChain[], limit?: number): void {
  const items = limit ? chains.slice(0, limit) : chains;

  if (items.length === 0) {
    console.log(chalk.green('\n  No fragile chains detected.\n'));
    return;
  }

  console.log(chalk.cyan.bold('\n  FRAGILE DEPENDENCY CHAINS (deepest first)\n'));
  console.log(
    chalk.dim(
      `  ${'#'.padEnd(4)}${'Test'.padEnd(40)}${'Depth'.padEnd(8)}${'Deepest Dependency'.padEnd(40)}`
    )
  );
  console.log(chalk.dim(`  ${''.padEnd(92, '\u2500')}`));

  items.forEach((chain, i) => {
    const num = chalk.white.bold(`${i + 1}.`.padEnd(4));
    const test = chain.test.padEnd(40);
    const depth = String(chain.chainDepth).padEnd(8);
    const deepest = chain.deepestDep.padEnd(40);
    console.log(`  ${num}${test}${depth}${deepest}`);
    if (chain.reason) {
      console.log(`  ${' '.repeat(4)}${chalk.dim(chain.reason)}`);
    }
  });

  console.log();
}

function printFullReport(report: HealthReport): void {
  console.log(chalk.cyan.bold('\n  ========================================'));
  console.log(chalk.cyan.bold('    WHATBREAKS HEALTH REPORT'));
  console.log(chalk.cyan.bold('  ========================================\n'));

  // Overview
  console.log(chalk.white.bold('  Overview:'));
  console.log(`    Source files:          ${chalk.bold(String(report.sourceFiles))}`);
  console.log(`    Test files:            ${chalk.bold(String(report.testFiles))}`);
  console.log(`    Dependency edges:      ${chalk.bold(String(report.edges))}`);

  const coverage =
    report.sourceFiles > 0
      ? ((report.testFiles / report.sourceFiles) * 100).toFixed(1)
      : '0.0';
  const coverageColor = parseFloat(coverage) > 50 ? chalk.green : chalk.yellow;
  console.log(`    Test/Source ratio:      ${coverageColor(`${coverage}%`)}`);
  console.log();

  // Overall health
  const highRiskCount = report.hotspots.filter((h) => h.riskLevel === 'high').length;
  const circularCount = report.circularDeps.length;
  let overallHealth: RiskLevel;
  if (highRiskCount > 3 || circularCount > 2) {
    overallHealth = 'high';
  } else if (highRiskCount > 0 || circularCount > 0) {
    overallHealth = 'medium';
  } else {
    overallHealth = 'low';
  }

  const healthLabel = overallHealth === 'low' ? 'HEALTHY' : `RISK: ${overallHealth.toUpperCase()}`;
  const healthColorFn = riskColor(overallHealth);
  console.log(`  Overall Health: ${healthColorFn(healthLabel)}`);

  if (highRiskCount > 0) {
    console.log(chalk.red(`    ${highRiskCount} high-risk hotspot(s)`));
  }
  if (circularCount > 0) {
    console.log(chalk.red(`    ${circularCount} circular dependency chain(s)`));
  }

  // Sections
  printHotspots(report.hotspots, 10);
  printFragileChains(report.fragileChains, 10);
  printCircularDeps(report.circularDeps);
}

export function registerReportCommands(program: Command): void {
  // Full report
  program
    .command('report')
    .description('Generate a full health report for the codebase')
    .option('--json', 'Output result as JSON')
    .action(async (opts: { json?: boolean }) => {
      const spinner = ora('Generating health report...').start();

      try {
        const { index } = loadGraphOrExit();
        const report = analyzeRisk(index);

        spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          printFullReport(report);
        }
      } catch (err) {
        spinner.fail('Report generation failed');
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n  ${message}\n`));
        process.exit(1);
      }
    });

  // Hotspots
  program
    .command('hotspots')
    .description('Show files with the highest blast radius')
    .option('--top <n>', 'Number of hotspots to show', '10')
    .option('--json', 'Output result as JSON')
    .action(async (opts: { top: string; json?: boolean }) => {
      const limit = parseInt(opts.top, 10);
      const spinner = ora('Finding hotspots...').start();

      try {
        const { index } = loadGraphOrExit();
        const report = analyzeRisk(index);

        spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(report.hotspots.slice(0, limit), null, 2));
        } else {
          printHotspots(report.hotspots, limit);
        }
      } catch (err) {
        spinner.fail('Analysis failed');
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n  ${message}\n`));
        process.exit(1);
      }
    });

  // Circular dependencies
  program
    .command('circular')
    .description('Detect and list circular dependencies')
    .option('--json', 'Output result as JSON')
    .action(async (opts: { json?: boolean }) => {
      const spinner = ora('Detecting circular dependencies...').start();

      try {
        const { index } = loadGraphOrExit();
        const report = analyzeRisk(index);

        spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(report.circularDeps, null, 2));
        } else {
          printCircularDeps(report.circularDeps);
        }
      } catch (err) {
        spinner.fail('Analysis failed');
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n  ${message}\n`));
        process.exit(1);
      }
    });

  // Fragile chains
  program
    .command('chains')
    .description('Show the deepest dependency chains')
    .option('--top <n>', 'Number of chains to show', '10')
    .option('--json', 'Output result as JSON')
    .action(async (opts: { top: string; json?: boolean }) => {
      const limit = parseInt(opts.top, 10);
      const spinner = ora('Analyzing dependency chains...').start();

      try {
        const { index } = loadGraphOrExit();
        const report = analyzeRisk(index);

        spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(report.fragileChains.slice(0, limit), null, 2));
        } else {
          printFragileChains(report.fragileChains, limit);
        }
      } catch (err) {
        spinner.fail('Analysis failed');
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n  ${message}\n`));
        process.exit(1);
      }
    });
}
