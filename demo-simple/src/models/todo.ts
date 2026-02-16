export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  userId: string;
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
}

export function createTodo(title: string, userId: string, priority: Todo['priority'] = 'medium'): Todo {
  return {
    id: crypto.randomUUID(),
    title,
    completed: false,
    userId,
    createdAt: new Date().toISOString(),
    priority,
  };
}
