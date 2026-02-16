import { registerUser, findUser } from '../services/userService.js';

export function handleRegister(name: string, email: string) {
  const existing = findUser(email);
  if (existing) return { success: false, error: 'Email taken' };
  const user = registerUser(name, email);
  return { success: true, user };
}

export function handleLookup(email: string) {
  const user = findUser(email);
  if (!user) return { success: false, error: 'Not found' };
  return { success: true, user };
}
