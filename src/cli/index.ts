import { Command } from 'commander';
import { registerScanCommand } from './scan.js';
import { registerServeCommand } from './serve.js';
import { registerDevCommand } from './dev.js';
import { registerFailingCommand } from './failing.js';
import { registerRefactorCommand } from './refactor.js';
import { registerImpactCommand } from './impact.js';
import { registerReportCommands } from './report.js';

const program = new Command();

program
  .name('whatbreaks')
  .description('AI-Powered Codebase Intelligence Map — see blast radius in 2 seconds')
  .version('0.1.0');

registerScanCommand(program);
registerServeCommand(program);
registerDevCommand(program);
registerFailingCommand(program);
registerRefactorCommand(program);
registerImpactCommand(program);
registerReportCommands(program);

program.parse(process.argv);
