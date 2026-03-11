import { motion } from 'motion/react';

interface TimerProps {
  timeLeft: number;
  total?: number;
}

export default function Timer({ timeLeft, total = 80 }: TimerProps) {
  const progress = timeLeft / total;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const color = timeLeft > 30 ? '#22c55e' : timeLeft > 10 ? '#eab308' : '#ef4444';

  return (
    <motion.div
      animate={timeLeft <= 5 && timeLeft > 0 ? { scale: [1, 1.1, 1] } : {}}
      transition={{ repeat: Infinity, duration: 0.5 }}
      className="relative w-12 h-12 flex items-center justify-center"
    >
      <svg width="48" height="48" className="-rotate-90">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-surface-200 dark:text-surface-700"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>
        {timeLeft}
      </span>
    </motion.div>
  );
}
