import { getAvatarDataUri } from '@/utils/avatars';

interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

export default function Avatar({ seed, size = 32, className = '' }: AvatarProps) {
  return (
    <img
      src={getAvatarDataUri(seed)}
      alt={seed}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
    />
  );
}
