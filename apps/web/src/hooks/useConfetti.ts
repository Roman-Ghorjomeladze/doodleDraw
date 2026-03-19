import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useSocket } from '@/hooks/useSocket';
import { usePlayerStore } from '@/stores/playerStore';
import { useGameStore } from '@/stores/gameStore';

/**
 * Fires confetti on:
 * 1. Current player guesses correctly (small burst)
 * 2. Current player wins the game (full-screen gold cannon)
 */
export function useConfetti() {
  const { on } = useSocket();

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Small burst when current player guesses correctly
    // On mobile: blur input → scroll to canvas → delay → fire confetti
    unsubscribers.push(
      on('chat:correctGuess', ({ playerId }) => {
        const myId = usePlayerStore.getState().playerId;
        if (playerId !== myId) return;

        // Close mobile keyboard — create temporary focusable element to steal focus from input
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
          const tmp = document.createElement('input');
          tmp.setAttribute('type', 'text');
          tmp.setAttribute('readonly', 'true');
          tmp.style.position = 'fixed';
          tmp.style.opacity = '0';
          tmp.style.height = '0';
          tmp.style.fontSize = '16px'; // prevents iOS zoom
          document.body.appendChild(tmp);
          tmp.focus();
          tmp.blur();
          document.body.removeChild(tmp);
        }

        // Scroll canvas into view
        const canvas = document.querySelector('canvas');
        if (canvas) {
          canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Delay confetti so keyboard closes and scroll finishes
        setTimeout(() => {
          confetti({
            particleCount: 60,
            spread: 55,
            origin: { x: 0.5, y: 0.7 },
            colors: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b9d'],
            disableForReducedMotion: true,
          });
        }, 400);
      }),
    );

    // Full-screen gold confetti when game ends and current player is winner
    unsubscribers.push(
      on('game:end', ({ finalScores, winner }) => {
        const myId = usePlayerStore.getState().playerId;
        const mode = useGameStore.getState().mode;

        let isWinner = false;

        if (mode === 'classic') {
          // Winner is the player with highest score
          const sorted = [...finalScores].sort((a, b) => b.score - a.score);
          isWinner = sorted[0]?.playerId === myId;
        } else {
          // Team mode: winner is team name, check if current player is on winning team
          const me = finalScores.find((s) => s.playerId === myId);
          if (me && winner === me.team) {
            isWinner = true;
          }
        }

        if (isWinner) {
          // Multi-burst gold confetti from both sides
          const duration = 2500;
          const end = Date.now() + duration;
          const goldColors = ['#FFD700', '#FFA500', '#FF8C00', '#FFD700', '#FFDF00'];

          const frame = () => {
            confetti({
              particleCount: 3,
              angle: 60,
              spread: 55,
              origin: { x: 0, y: 0.6 },
              colors: goldColors,
              disableForReducedMotion: true,
            });
            confetti({
              particleCount: 3,
              angle: 120,
              spread: 55,
              origin: { x: 1, y: 0.6 },
              colors: goldColors,
              disableForReducedMotion: true,
            });
            if (Date.now() < end) {
              requestAnimationFrame(frame);
            }
          };
          frame();
        }
      }),
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [on]);
}
