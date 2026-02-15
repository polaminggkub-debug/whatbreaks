import { Command } from 'commander';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import chalk from 'chalk';
import express from 'express';
import open from 'open';
import { WebSocketServer, WebSocket } from 'ws';
import { GraphIndex, loadGraph } from '../engine/graph.js';
import { analyzeFailingTest } from '../engine/failing.js';
import type { FailingResult } from '../types/graph.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function registerDevCommand(program: Command): void {
  program
    .command('dev')
    .description('Start WhatBreaks dev server with live failure tracking')
    .option('-p, --port <port>', 'Port to serve on', '4567')
    .action(async (opts: { port: string }) => {
      const port = parseInt(opts.port, 10);
      const graphPath = resolve(process.cwd(), '.whatbreaks/graph.json');

      const distUiPath = resolve(__dirname, '../../dist/ui');
      const srcUiPath = resolve(__dirname, '../ui');
      const uiPath = existsSync(resolve(distUiPath, 'index.html')) ? distUiPath : srcUiPath;

      if (!existsSync(graphPath)) {
        console.error(chalk.red("\n  Graph not found. Run 'whatbreaks scan' first.\n"));
        process.exit(1);
      }

      if (!existsSync(uiPath)) {
        console.error(chalk.red('\n  UI build not found. Run the build step first.\n'));
        process.exit(1);
      }

      // Load graph into memory at startup
      const graph = loadGraph(graphPath);
      const graphIndex = new GraphIndex(graph);

      // In-memory state
      let currentFailure: FailingResult | null = null;

      const app = express();
      app.use(express.json());

      // GET /api/graph — raw graph data (compatible with serve mode)
      app.get('/api/graph', (_req, res) => {
        res.json(graph);
      });

      // POST /api/fail — compute failure impact and store in memory
      app.post('/api/fail', (req, res) => {
        const { file } = req.body;

        if (!file || typeof file !== 'string') {
          res.status(400).json({ error: 'Missing or invalid "file" field' });
          return;
        }

        const node = graphIndex.getNode(file);
        if (!node) {
          res.status(404).json({ error: `File not found in graph: ${file}` });
          return;
        }

        try {
          currentFailure = analyzeFailingTest(graphIndex, file);
          console.log(chalk.yellow(`  \u2717 Test failed: ${file}`));

          // Broadcast to all WebSocket clients
          broadcast({ type: 'failure-update', payload: currentFailure });

          res.json(currentFailure);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          res.status(500).json({ error: message });
        }
      });

      // GET /api/state — current server state
      app.get('/api/state', (_req, res) => {
        res.json({
          graph,
          currentFailure,
        });
      });

      // Serve static UI files
      app.use(express.static(uiPath));

      // SPA fallback
      app.get('*', (_req, res) => {
        res.sendFile(resolve(uiPath, 'index.html'));
      });

      // Create HTTP server and attach WebSocket
      const server = createServer(app);
      const wss = new WebSocketServer({ server });

      function broadcast(message: object): void {
        const data = JSON.stringify(message);
        for (const client of wss.clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(data);
          }
        }
      }

      wss.on('connection', (ws) => {
        console.log(chalk.dim('  WebSocket client connected'));

        // Send current state immediately
        ws.send(JSON.stringify({
          type: 'state',
          payload: { graph, currentFailure },
        }));

        ws.on('close', () => {
          console.log(chalk.dim('  WebSocket client disconnected'));
        });
      });

      server.listen(port, () => {
        const url = `http://localhost:${port}`;
        console.log(chalk.cyan.bold('\n  WhatBreaks Dev Server\n'));
        console.log(`  ${chalk.green('Running at:')}  ${chalk.underline(url)}`);
        console.log(`  ${chalk.dim('Mode:')}        ${chalk.magenta('dev')} (stateful + WebSocket)`);
        console.log();
        console.log(chalk.dim('  Endpoints:'));
        console.log(chalk.dim('    POST /api/fail    \u2014 report a test failure'));
        console.log(chalk.dim('    GET  /api/state   \u2014 get current state'));
        console.log(chalk.dim('    GET  /api/graph   \u2014 get graph data'));
        console.log(chalk.dim('    WS   ws://localhost:' + port + ' \u2014 live updates'));
        console.log(chalk.dim('\n  Press Ctrl+C to stop\n'));

        open(url).catch(() => {});
      });
    });
}
