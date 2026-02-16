import { describe, it, expect, beforeEach } from 'vitest';
import { addTodo, getTodos, completeTodo, getTodosByUser, clearStore } from '../src/services/todoService.js';

describe('todoService', () => {
  beforeEach(() => clearStore());

  it('adds a todo', () => {
    const todo = addTodo('Test', 'user1');
    expect(todo.title).toBe('Test');
    expect(getTodos()).toHaveLength(1);
  });

  it('rejects empty title', () => {
    expect(() => addTodo('', 'user1')).toThrow('Invalid title');
  });

  it('completes a todo', () => {
    const todo = addTodo('Test', 'user1');
    completeTodo(todo.id);
    expect(getTodos()[0].completed).toBe(true);
  });

  it('filters by user', () => {
    addTodo('A', 'user1');
    addTodo('B', 'user2');
    expect(getTodosByUser('user1')).toHaveLength(1);
  });
});
