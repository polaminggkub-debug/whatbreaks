import { someFn } from './b';
import defaultUtil, { namedUtil } from './utils';

export function main(): string {
  return someFn() + defaultUtil() + namedUtil();
}
