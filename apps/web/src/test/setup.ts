import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useFriendStore } from '@/stores/friendStore';

// Cleanup DOM after each test.
afterEach(() => {
  cleanup();
  useFriendStore.getState().reset();
});

// Mock motion/react to render children without animation.
vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      // Return a forwardRef component for any HTML element (motion.div, motion.button, etc.)
      const Component = ({ children, ...props }: any) => {
        // Strip motion-specific props.
        const htmlProps = { ...props };
        delete htmlProps.initial;
        delete htmlProps.animate;
        delete htmlProps.exit;
        delete htmlProps.transition;
        delete htmlProps.whileHover;
        delete htmlProps.whileTap;
        delete htmlProps.drag;
        delete htmlProps.dragConstraints;
        delete htmlProps.dragElastic;
        delete htmlProps.dragControls;
        delete htmlProps.dragListener;
        delete htmlProps.onDragEnd;
        delete htmlProps.layoutId;
        delete htmlProps.style;
        return vi.importActual('react').then((React: any) => {
          // Can't use async in render, so just use createElement directly
        }) as any;
      };
      // Simpler approach: just return the element type
      return (props: any) => {
        const { children, initial, animate, exit, transition, whileHover, whileTap,
          drag, dragConstraints, dragElastic, onDragEnd, dragControls, dragListener, layoutId, ...rest } = props;
        const React = require('react');
        return React.createElement(prop as string, rest, children);
      };
    },
  }),
  AnimatePresence: ({ children }: any) => children,
  useDragControls: () => ({ start: vi.fn() }),
}));

// Mock i18n to return the key.
vi.mock('@/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  translate: (key: string) => key,
}));

// Mock avatar utility.
vi.mock('@/utils/avatars', () => ({
  getAvatarDataUri: (seed: string) => `avatar://${seed}`,
}));
