import { createAvatar } from '@dicebear/core';
import { funEmoji, adventurer } from '@dicebear/collection';
import { AVATAR_SEEDS, PERSON_AVATAR_SEEDS } from '@doodledraw/shared';

const svgCache = new Map<string, string>();

export function parseAvatarKey(key: string): { seed: string; style: 'funEmoji' | 'adventurer' } {
  if (key.startsWith('adventurer:')) {
    return { seed: key.slice('adventurer:'.length), style: 'adventurer' };
  }
  return { seed: key, style: 'funEmoji' };
}

export function getAvatarSvg(key: string): string {
  const cached = svgCache.get(key);
  if (cached) return cached;

  const { seed, style } = parseAvatarKey(key);
  const avatar = style === 'adventurer'
    ? createAvatar(adventurer, { seed, size: 64 })
    : createAvatar(funEmoji, { seed, size: 64 });
  const svg = avatar.toString();
  svgCache.set(key, svg);
  return svg;
}

export function getAvatarDataUri(key: string): string {
  const svg = getAvatarSvg(key);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export { AVATAR_SEEDS, PERSON_AVATAR_SEEDS };
