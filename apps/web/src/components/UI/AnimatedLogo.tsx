import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const PRIMARY = '#6366f1';
const ACCENT = '#f97316';

function interpolateColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

const sizeClasses = {
  sm: 'text-2xl font-bold',
  lg: 'text-5xl sm:text-6xl font-bold',
} as const;

const letterVariants = {
  hidden: {
    y: -40,
    scaleY: 1.4,
    scaleX: 0.85,
    opacity: 0,
  },
  visible: (i: number) => ({
    y: 0,
    scaleY: 1,
    scaleX: 1,
    opacity: 1,
    transition: {
      delay: i * 0.084,
      y: {
        type: 'spring' as const,
        stiffness: 180,
        damping: 13,
        mass: 1.1,
      },
      scaleY: {
        type: 'spring' as const,
        stiffness: 120,
        damping: 10,
        delay: i * 0.084 + 0.07,
      },
      scaleX: {
        type: 'spring' as const,
        stiffness: 150,
        damping: 12,
        delay: i * 0.084 + 0.042,
      },
      opacity: {
        duration: 0.21,
        delay: i * 0.084,
      },
    },
  }),
};

interface AnimatedLogoProps {
  text: string;
  size: 'sm' | 'lg';
  animationKey?: string | number;
}

export default function AnimatedLogo({ text, size, animationKey }: AnimatedLogoProps) {
  const shouldReduceMotion = useReducedMotion();
  const [clickCount, setClickCount] = useState(0);

  if (!text) return null;

  const letters = text.split('');
  const len = letters.length;

  if (shouldReduceMotion) {
    return (
      <span
        className={`${sizeClasses[size]} bg-gradient-to-r from-primary-500 ${size === 'lg' ? 'via-accent-500 ' : ''}to-accent-500 bg-clip-text text-transparent`}
      >
        {text}
      </span>
    );
  }

  return (
    <span
      key={`${animationKey}-${clickCount}`}
      className={`inline-flex cursor-pointer ${sizeClasses[size]}`}
      aria-label={text}
      onClick={() => setClickCount(c => c + 1)}
    >
      {letters.map((letter, i) => {
        const t =
          size === 'lg'
            ? i < len / 2
              ? i / (len / 2 - 1 || 1)
              : (len - 1 - i) / (len / 2 - 1 || 1)
            : i / (len - 1 || 1);

        const color = interpolateColor(PRIMARY, ACCENT, t);

        return (
          <motion.span
            key={`${i}-${letter}`}
            custom={i}
            variants={letterVariants}
            initial="hidden"
            animate="visible"
            aria-hidden="true"
            style={{
              color,
              display: 'inline-block',
              transformOrigin: 'center bottom',
              whiteSpace: 'pre',
            }}
          >
            {letter}
          </motion.span>
        );
      })}
    </span>
  );
}
