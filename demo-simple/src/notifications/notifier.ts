import type { Todo } from '../models/todo.js';
import type { User } from '../models/user.js';

export interface Notification {
  to: string;
  message: string;
}

export function notifyTodoAssigned(todo: Todo, user: User): Notification {
  return {
    to: user.email,
    message: `New todo assigned: "${todo.title}" (${todo.priority})`,
  };
}

export function notifyTodoCompleted(todo: Todo, user: User): Notification {
  return {
    to: user.email,
    message: `Todo completed: "${todo.title}"`,
  };
}
