import { describe, it, expect, beforeEach } from 'vitest';
import { registerUser, findUser, clearUsers } from '../src/services/userService.js';

describe('userService', () => {
  beforeEach(() => clearUsers());

  it('registers a user', () => {
    const user = registerUser('Alice', 'alice@test.com');
    expect(user.name).toBe('Alice');
  });

  it('finds user by email', () => {
    registerUser('Bob', 'bob@test.com');
    expect(findUser('bob@test.com')?.name).toBe('Bob');
  });

  it('returns undefined for unknown email', () => {
    expect(findUser('nope@test.com')).toBeUndefined();
  });
});
