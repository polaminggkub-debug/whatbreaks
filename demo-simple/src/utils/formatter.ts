import type { Todo } from '../models/todo.js';

export function formatTodo(todo: Todo): string {
  const status = todo.completed ? '[x]' : '[ ]';
  return `${status} ${todo.title} (${todo.priority})`;
}

export function formatTodoList(todos: Todo[]): string {
  return todos.map(formatTodo).join('\n');
}
