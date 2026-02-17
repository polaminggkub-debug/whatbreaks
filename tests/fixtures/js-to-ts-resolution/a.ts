import { foo } from './b.js';

export function useFoo(): string {
  return foo();
}
