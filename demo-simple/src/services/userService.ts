import { createUser, type User } from '../models/user.js';

const users: User[] = [];

export function registerUser(name: string, email: string): User {
  const user = createUser(name, email);
  users.push(user);
  return user;
}

export function findUser(email: string): User | undefined {
  return users.find(u => u.email === email);
}

export function getUsers(): User[] {
  return [...users];
}

export function clearUsers(): void {
  users.length = 0;
}
