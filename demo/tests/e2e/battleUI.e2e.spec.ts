import { test, expect } from '@playwright/test';
import type { DamageInput } from '../../src/core/damage/types.js';
import type { Character } from '../../src/characters/characterTypes.js';

test.describe('BattleVerse UI - Happy Path', () => {
  test('complete a full battle flow', async ({ page }) => {
    await page.goto('/battle');

    // Select characters
    await page.getByTestId('character-select-p1').selectOption('warrior');
    await page.getByTestId('character-select-p2').selectOption('mage');

    // Start battle
    await page.getByTestId('start-battle-btn').click();

    // Verify battle completes with a winner
    await expect(page.getByTestId('battle-log')).toBeVisible();
    await expect(page.getByTestId('winner-display')).toBeVisible();
  });

  test('show damage breakdown in results', async ({ page }) => {
    await page.goto('/battle');

    await page.getByTestId('character-select-p1').selectOption('assassin');
    await page.getByTestId('character-select-p2').selectOption('healer');
    await page.getByTestId('start-battle-btn').click();

    // Verify damage breakdown panel
    await expect(page.getByTestId('damage-breakdown')).toBeVisible();
    await expect(page.getByTestId('round-count')).not.toHaveText('0');
  });

  // Intentionally failing test — for WhatBreaks blast radius demo
  test('battle history persists after page reload', async ({ page }) => {
    await page.goto('/battle/history');
    await expect(page.getByTestId('history-list')).toHaveCount(5);
  });
});
