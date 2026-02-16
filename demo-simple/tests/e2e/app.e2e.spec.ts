import { test, expect } from '@playwright/test';
import type { Todo } from '../../src/models/todo.js';

test.describe('Todo App - Happy Path', () => {
  test('create and complete a todo', async ({ page }) => {
    await page.goto('/');

    // Create a new todo
    await page.getByTestId('todo-input').fill('Buy groceries');
    await page.getByTestId('add-todo-btn').click();

    // Verify it appears in the list
    await expect(page.getByTestId('todo-item').first()).toContainText('Buy groceries');

    // Complete the todo
    await page.getByTestId('complete-btn').first().click();

    // Verify completion state
    await expect(page.getByTestId('todo-item').first()).toHaveClass(/completed/);
  });

  test('shows empty state when no todos exist', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('empty-state')).toBeVisible();
  });

  // Intentionally failing test — for WhatBreaks blast radius demo
  test('todo count updates after deletion', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('todo-count')).toHaveText('0 items');
  });
});
