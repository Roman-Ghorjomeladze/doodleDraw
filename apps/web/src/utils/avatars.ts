import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';
import { AVATAR_SEEDS } from '@doodledraw/shared';

const svgCache = new Map<string, string>();

/** Strip the optional "adventurer:" prefix to get the raw seed. */
function parseSeed(key: string): string {
  return key.startsWith('adventurer:') ? key.slice('adventurer:'.length) : key;
}

export function getAvatarSvg(key: string): string {
  const cached = svgCache.get(key);
  if (cached) return cached;

  const seed = parseSeed(key);
  const avatar = createAvatar(adventurer, { seed, size: 64 });
  const svg = avatar.toString();
  svgCache.set(key, svg);
  return svg;
}

export function getAvatarDataUri(key: string): string {
  const svg = getAvatarSvg(key);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export { AVATAR_SEEDS };
