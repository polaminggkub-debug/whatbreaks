import { describe, it, expect, beforeEach } from 'vitest';
import { handleAddTodo, handleListTodos, handleCompleteTodo } from '../../src/api/todoController.js';
import { clearStore } from '../../src/services/todoService.js';

describe('todoController', () => {
  beforeEach(() => clearStore());

  it('adds and lists todos', () => {
    handleAddTodo('Test', 'user1');
    const result = handleListTodos();
    expect(result.todos).toHaveLength(1);
    expect(result.display).toContain('Test');
  });

  it('completes a todo', () => {
    const { todo } = handleAddTodo('Test', 'user1');
    const result = handleCompleteTodo(todo.id);
    expect(result.success).toBe(true);
  });

  it('returns error for missing todo', () => {
    const result = handleCompleteTodo('nonexistent');
    expect(result.success).toBe(false);
  });
});
