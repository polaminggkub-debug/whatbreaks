import { describe, it, expect } from 'vitest';
import { validateTitle, validateTodo } from '../../src/utils/validator.js';
import { createTodo } from '../../src/models/todo.js';

describe('validator', () => {
  it('accepts valid title', () => {
    expect(validateTitle('Buy milk')).toBe(true);
  });

  it('rejects empty title', () => {
    expect(validateTitle('')).toBe(false);
    expect(validateTitle('   ')).toBe(false);
  });

  it('validates a complete todo', () => {
    const todo = createTodo('Test', 'user1');
    expect(validateTodo(todo)).toEqual([]);
  });
});
