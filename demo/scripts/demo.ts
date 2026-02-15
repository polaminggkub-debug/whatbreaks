#!/usr/bin/env tsx
/**
 * BattleVerse Demo Script
 *
 * Demonstrates chain reaction: 1 line change → 170+ test failures
 *
 * Usage: npm run demo
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const DEMO_DIR = resolve(import.meta.dirname, '..');
const DAMAGE_CALC = resolve(DEMO_DIR, 'src/core/damage/damageCalculator.ts');

const ORIGINAL_LINE = 'const rawDamage = input.baseDamage * levelBonus * elementMult * critMult;';
const BUGGED_LINE = 'const rawDamage = input.baseDamage + levelBonus * elementMult * critMult;';

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
  dim: '\x1b[2m',
};

function log(msg: string) {
  console.log(msg);
}

function header(msg: string) {
  log(`\n${COLORS.bold}${COLORS.cyan}${'='.repeat(60)}${COLORS.reset}`);
  log(`${COLORS.bold}${COLORS.cyan}  ${msg}${COLORS.reset}`);
  log(`${COLORS.bold}${COLORS.cyan}${'='.repeat(60)}${COLORS.reset}\n`);
}

function runTests(): { passed: number; failed: number; total: number } {
  try {
    const output = execSync('npx vitest run --reporter=json 2>/dev/null', {
      cwd: DEMO_DIR,
      encoding: 'utf-8',
      timeout: 60000,
    });
    const json = JSON.parse(output);
    return {
      passed: json.numPassedTests ?? 0,
      failed: json.numFailedTests ?? 0,
      total: json.numTotalTests ?? 0,
    };
  } catch (e: any) {
    // vitest exits with code 1 when tests fail, but still outputs JSON
    try {
      const output = e.stdout || '';
      const json = JSON.parse(output);
      return {
        passed: json.numPassedTests ?? 0,
        failed: json.numFailedTests ?? 0,
        total: json.numTotalTests ?? 0,
      };
    } catch {
      // Fallback: parse text output
      const stderr = (e.stderr || '') as string;
      const passMatch = stderr.match(/(\d+) passed/);
      const failMatch = stderr.match(/(\d+) failed/);
      const passed = passMatch ? parseInt(passMatch[1]) : 0;
      const failed = failMatch ? parseInt(failMatch[1]) : 0;
      return { passed, failed, total: passed + failed };
    }
  }
}

function injectBug() {
  const content = readFileSync(DAMAGE_CALC, 'utf-8');
  if (!content.includes(ORIGINAL_LINE)) {
    log(`${COLORS.red}ERROR: Could not find the target line in damageCalculator.ts${COLORS.reset}`);
    log(`${COLORS.dim}Expected: ${ORIGINAL_LINE}${COLORS.reset}`);
    process.exit(1);
  }
  writeFileSync(DAMAGE_CALC, content.replace(ORIGINAL_LINE, BUGGED_LINE));
}

function revertBug() {
  const content = readFileSync(DAMAGE_CALC, 'utf-8');
  writeFileSync(DAMAGE_CALC, content.replace(BUGGED_LINE, ORIGINAL_LINE));
}

async function main() {
  header('BattleVerse Demo: Chain Reaction');

  log(`${COLORS.dim}This demo shows how changing ONE line in a shared module`);
  log(`causes a cascade of test failures across the entire system.${COLORS.reset}\n`);

  // Step 1: Run tests (should be green)
  header('Step 1: Run All Tests (Before Bug)');
  log('Running tests...\n');
  const before = runTests();
  log(`${COLORS.green}${COLORS.bold}  ${before.passed} passed${COLORS.reset} / ${before.total} total`);

  if (before.failed > 0) {
    log(`${COLORS.red}  WARNING: ${before.failed} tests already failing!${COLORS.reset}`);
  }

  // Step 2: Inject bug
  header('Step 2: Inject Bug');
  log(`${COLORS.yellow}File: src/core/damage/damageCalculator.ts${COLORS.reset}`);
  log(`${COLORS.dim}Change: baseDamage * levelBonus → baseDamage + levelBonus${COLORS.reset}`);
  log(`${COLORS.dim}(Multiplication → Addition. Subtle. Compiles fine.)${COLORS.reset}\n`);
  injectBug();
  log(`${COLORS.red}${COLORS.bold}  Bug injected!${COLORS.reset}`);

  // Step 3: Run tests again
  header('Step 3: Run All Tests (After Bug)');
  log('Running tests...\n');
  const after = runTests();
  log(`${COLORS.red}${COLORS.bold}  ${after.failed} FAILED${COLORS.reset} / ${COLORS.green}${after.passed} passed${COLORS.reset} / ${after.total} total`);

  // Step 4: Show impact
  header('Step 4: Blast Radius');
  log(`${COLORS.yellow}One line changed. Here's the impact:${COLORS.reset}\n`);
  log(`  Tests broken:  ${COLORS.red}${COLORS.bold}${after.failed}${COLORS.reset}`);
  log(`  Tests safe:    ${COLORS.green}${after.passed}${COLORS.reset}`);
  log(`  Failure rate:  ${COLORS.red}${Math.round(after.failed / after.total * 100)}%${COLORS.reset}`);
  log('');
  log(`${COLORS.cyan}Now run WhatBreaks to visualize the dependency chain:${COLORS.reset}`);
  log(`${COLORS.bold}  whatbreaks scan demo/ && whatbreaks impact src/core/damage/damageCalculator.ts${COLORS.reset}`);

  // Step 5: Revert
  header('Step 5: Revert');
  revertBug();
  log(`${COLORS.green}  damageCalculator.ts restored to original.${COLORS.reset}\n`);

  log(`${COLORS.bold}${COLORS.cyan}Demo complete!${COLORS.reset}`);
}

main().catch(console.error);
