import { addTodo, getTodos, completeTodo } from '../services/todoService.js';
import { formatTodoList } from '../utils/formatter.js';

export function handleAddTodo(title: string, userId: string) {
  const todo = addTodo(title, userId);
  return { success: true, todo };
}

export function handleListTodos() {
  const todos = getTodos();
  return { todos, display: formatTodoList(todos) };
}

export function handleCompleteTodo(id: string) {
  const todo = completeTodo(id);
  if (!todo) return { success: false, error: 'Not found' };
  return { success: true, todo };
}
