import type { Todo } from '../models/todo.js';

export function validateTitle(title: string): boolean {
  return title.trim().length > 0 && title.length <= 200;
}

export function validateTodo(todo: Todo): string[] {
  const errors: string[] = [];
  if (!validateTitle(todo.title)) errors.push('Invalid title');
  if (!todo.userId) errors.push('Missing userId');
  return errors;
}
