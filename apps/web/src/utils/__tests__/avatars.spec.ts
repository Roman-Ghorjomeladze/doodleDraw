import { describe, it, expect, vi } from 'vitest';

// The setup file mocks @/utils/avatars - unmock it here so we test the real module.
vi.unmock('@/utils/avatars');

const { getAvatarDataUri, getAvatarSvg, AVATAR_SEEDS } = await import('@/utils/avatars');

describe('avatars utility', () => {
  it('AVATAR_SEEDS is exported as a non-empty array', () => {
    expect(Array.isArray(AVATAR_SEEDS)).toBe(true);
    expect(AVATAR_SEEDS.length).toBeGreaterThan(0);
  });

  it('getAvatarDataUri returns an SVG data URI string', () => {
    const uri = getAvatarDataUri('seed-1');
    expect(typeof uri).toBe('string');
    expect(uri.startsWith('data:image/svg+xml;utf8,')).toBe(true);
    expect(uri.length).toBeGreaterThan('data:image/svg+xml;utf8,'.length);
  });

  it('getAvatarDataUri caches identical input (returns same string)', () => {
    const a = getAvatarDataUri('cache-seed');
    const b = getAvatarDataUri('cache-seed');
    expect(a).toBe(b);
  });

  it('different seeds produce different data URIs', () => {
    const a = getAvatarDataUri('seed-A');
    const b = getAvatarDataUri('seed-B');
    expect(a).not.toBe(b);
  });

  it('getAvatarSvg returns an SVG string', () => {
    const svg = getAvatarSvg('svg-seed');
    expect(typeof svg).toBe('string');
    expect(svg).toContain('<svg');
  });

  it('strips the optional "adventurer:" prefix from seed input', () => {
    // Both forms should produce identical output since the prefix is stripped
    // before being passed to dicebear.
    const withPrefix = getAvatarSvg('adventurer:prefixed-seed');
    const withoutPrefix = getAvatarSvg('prefixed-seed');
    expect(withPrefix).toBe(withoutPrefix);
  });
});
