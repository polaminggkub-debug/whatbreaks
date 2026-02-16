import { describe, it, expect } from 'vitest';
import { formatTodo, formatTodoList } from '../../src/utils/formatter.js';
import { createTodo } from '../../src/models/todo.js';

describe('formatter', () => {
  it('formats incomplete todo', () => {
    const todo = createTodo('Buy milk', 'user1');
    expect(formatTodo(todo)).toBe('[ ] Buy milk (medium)');
  });

  it('formats completed todo', () => {
    const todo = createTodo('Buy milk', 'user1');
    todo.completed = true;
    expect(formatTodo(todo)).toBe('[x] Buy milk (medium)');
  });

  it('formats a list', () => {
    const todos = [createTodo('A', 'u1'), createTodo('B', 'u1')];
    const result = formatTodoList(todos);
    expect(result).toContain('[ ] A');
    expect(result).toContain('[ ] B');
  });
});
