import { describe, it, expect } from 'vitest';
import { createTodo } from '../../src/models/todo.js';

describe('createTodo', () => {
  it('creates a todo with defaults', () => {
    const todo = createTodo('Buy milk', 'user1');
    expect(todo.title).toBe('Buy milk');
    expect(todo.completed).toBe(false);
    expect(todo.priority).toBe('medium');
  });

  it('accepts custom priority', () => {
    const todo = createTodo('Urgent', 'user1', 'high');
    expect(todo.priority).toBe('high');
  });
});
