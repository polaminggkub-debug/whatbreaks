/**
 * WhatBreaks Playwright Reporter
 *
 * Automatically reports test failures to the WhatBreaks dev server.
 * When a test fails, it POSTs the file path to POST /api/fail,
 * which triggers live impact highlighting in the UI via WebSocket.
 *
 * Usage in playwright.config.ts:
 *
 *   reporter: [
 *     ['list'],
 *     ['whatbreaks/reporter']
 *   ]
 *
 * Or with a local path:
 *
 *   reporter: [
 *     ['list'],
 *     ['./node_modules/whatbreaks/dist/playwright/whatbreaks-reporter.js']
 *   ]
 */

const WHATBREAKS_URL = process.env.WHATBREAKS_URL ?? 'http://localhost:4567';

interface TestCase {
  location?: { file: string; line: number; column: number };
  title: string;
}

interface TestResult {
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
}

class WhatBreaksReporter {
  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== 'failed') return;
    if (!test.location?.file) return;

    const file = test.location.file;

    fetch(`${WHATBREAKS_URL}/api/fail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file }),
    }).catch(() => {
      // Dev server not running — silently ignore
    });
  }
}

export default WhatBreaksReporter;
