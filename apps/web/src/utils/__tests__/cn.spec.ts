import { describe, it, expect } from 'vitest';
import { cn } from '@/utils/cn';

describe('cn utility', () => {
  it('merges multiple class strings', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
  });

  it('skips undefined, null and false values', () => {
    expect(cn('foo', undefined, null, false, 'bar')).toBe('foo bar');
  });

  it('resolves Tailwind conflicts so that the last one wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm text-lg')).toBe('text-lg');
  });

  it('returns an empty string when given no inputs', () => {
    expect(cn()).toBe('');
  });

  it('handles conditional objects from clsx', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active');
  });
});
