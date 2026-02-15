import { Command } from 'commander';
import { resolve, dirname } from 'path';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import express from 'express';
import open from 'open';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function registerServeCommand(program: Command): void {
  program
    .command('serve')
    .description('Start the WhatBreaks visualization UI')
    .option('-p, --port <port>', 'Port to serve on', '4567')
    .option('--highlight <file>', 'Highlight a specific file in the graph')
    .option('--failing <test>', 'Show failing test analysis')
    .option('--refactor <file>', 'Show refactor impact analysis')
    .action(async (opts: { port: string; highlight?: string; failing?: string; refactor?: string }) => {
      const port = parseInt(opts.port, 10);
      const graphPath = resolve(process.cwd(), '.whatbreaks/graph.json');
      const uiPath = resolve(__dirname, '../ui');

      if (!existsSync(graphPath)) {
        console.error(chalk.red("\n  Graph not found. Run 'whatbreaks scan' first.\n"));
        process.exit(1);
      }

      if (!existsSync(uiPath)) {
        console.error(chalk.red('\n  UI build not found. Run the build step first.\n'));
        process.exit(1);
      }

      const app = express();

      // Serve the graph data
      app.get('/api/graph', (_req, res) => {
        try {
          const graphData = readFileSync(graphPath, 'utf-8');
          res.type('application/json').send(graphData);
        } catch {
          res.status(500).json({ error: 'Failed to read graph data' });
        }
      });

      // Serve optional config for highlight/failing/refactor modes
      if (opts.highlight || opts.failing || opts.refactor) {
        const config: Record<string, string> = {};
        if (opts.highlight) config.highlight = opts.highlight;
        if (opts.failing) config.failing = opts.failing;
        if (opts.refactor) config.refactor = opts.refactor;

        app.get('/api/config', (_req, res) => {
          res.json(config);
        });
      }

      // Serve static UI files
      app.use(express.static(uiPath));

      // SPA fallback
      app.get('*', (_req, res) => {
        res.sendFile(resolve(uiPath, 'index.html'));
      });

      app.listen(port, () => {
        const url = `http://localhost:${port}`;
        console.log(chalk.cyan.bold('\n  WhatBreaks UI\n'));
        console.log(`  ${chalk.green('Running at:')}  ${chalk.underline(url)}`);

        if (opts.highlight) {
          console.log(`  ${chalk.yellow('Highlight:')}   ${opts.highlight}`);
        }
        if (opts.failing) {
          console.log(`  ${chalk.red('Failing:')}     ${opts.failing}`);
        }
        if (opts.refactor) {
          console.log(`  ${chalk.magenta('Refactor:')}    ${opts.refactor}`);
        }

        console.log(chalk.dim('\n  Press Ctrl+C to stop\n'));

        open(url).catch(() => {
          // Silently ignore if browser can't be opened
        });
      });
    });
}
