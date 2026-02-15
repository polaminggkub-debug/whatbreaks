import { Command } from 'commander';
import { resolve, dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { scanRepository } from '../scanner/index.js';
import { saveGraph } from '../engine/graph.js';

export function registerScanCommand(program: Command): void {
  program
    .command('scan')
    .description('Scan a directory and build the dependency graph')
    .argument('<dir>', 'Directory to scan')
    .option('-o, --output <path>', 'Output path for graph file', '.whatbreaks/graph.json')
    .action(async (dir: string, opts: { output: string }) => {
      const resolvedDir = resolve(process.cwd(), dir);
      const outputPath = resolve(process.cwd(), opts.output);
      const outputDir = dirname(outputPath);

      if (!existsSync(resolvedDir)) {
        console.error(chalk.red(`Error: Directory not found: ${resolvedDir}`));
        process.exit(1);
      }

      console.log(chalk.cyan.bold('\n  WhatBreaks Scanner\n'));
      console.log(chalk.dim(`  Target:  ${resolvedDir}`));
      console.log(chalk.dim(`  Output:  ${outputPath}\n`));

      const spinner = ora('Scanning repository...').start();

      try {
        const graph = await scanRepository(resolvedDir);

        spinner.text = 'Saving dependency graph...';

        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }

        saveGraph(graph, outputPath);
        spinner.succeed('Scan complete!\n');

        const sourceFiles = graph.nodes.filter((n) => n.type === 'source').length;
        const testFiles = graph.nodes.filter((n) => n.type === 'test').length;
        const importEdges = graph.edges.filter((e) => e.type === 'import').length;
        const testMappings = graph.edges.filter((e) => e.type === 'test-covers').length;

        console.log(chalk.green('  Summary:'));
        console.log(`    ${chalk.bold(String(sourceFiles))} source files`);
        console.log(`    ${chalk.bold(String(testFiles))} test files`);
        console.log(`    ${chalk.bold(String(importEdges))} import edges`);
        console.log(`    ${chalk.bold(String(testMappings))} test mappings`);
        console.log(
          chalk.dim(`\n  Graph saved to ${opts.output}\n`)
        );
      } catch (err) {
        spinner.fail('Scan failed');
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n  ${message}\n`));
        process.exit(1);
      }
    });
}
