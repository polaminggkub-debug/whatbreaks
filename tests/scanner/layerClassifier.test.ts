import { describe, it, expect } from 'vitest';
import { classifyLayer } from '../../src/scanner/layerClassifier';

describe('layerClassifier', () => {
  it('classifies pages/Home.ts as page layer', () => {
    expect(classifyLayer('src/pages/Home.ts')).toBe('page');
  });

  it('classifies components/Button.ts as ui layer', () => {
    expect(classifyLayer('src/components/Button.ts')).toBe('ui');
  });

  it('classifies shared/utils.ts as shared layer', () => {
    expect(classifyLayer('src/shared/utils.ts')).toBe('shared');
  });

  it('classifies foo.test.ts as test layer', () => {
    expect(classifyLayer('src/foo.test.ts')).toBe('test');
  });

  it('classifies app.config.ts as config layer', () => {
    expect(classifyLayer('src/app.config.ts')).toBe('config');
  });
});
