import { createTodo, type Todo } from '../models/todo.js';
import { validateTitle } from '../utils/validator.js';

const store: Todo[] = [];

export function addTodo(title: string, userId: string, priority: Todo['priority'] = 'medium'): Todo {
  if (!validateTitle(title)) throw new Error('Invalid title');
  const todo = createTodo(title, userId, priority);
  store.push(todo);
  return todo;
}

export function getTodos(): Todo[] {
  return [...store];
}

export function completeTodo(id: string): Todo | undefined {
  const todo = store.find(t => t.id === id);
  if (todo) todo.completed = true;
  return todo;
}

export function getTodosByUser(userId: string): Todo[] {
  return store.filter(t => t.userId === userId);
}

export function clearStore(): void {
  store.length = 0;
}
