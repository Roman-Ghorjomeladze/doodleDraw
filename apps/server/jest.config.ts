import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  moduleNameMapper: {
    '@doodledraw/shared': '<rootDir>/../../packages/shared/src',
  },
  coverageDirectory: './coverage',
  collectCoverageFrom: [
    'src/auth/auth.service.ts',
    'src/auth/auth.controller.ts',
    'src/game/friend.service.ts',
    'src/game/friends.controller.ts',
    'src/game/online-tracker.service.ts',
    'src/game/profile.service.ts',
    'src/game/drawing.service.ts',
    'src/game/classic-mode.service.ts',
    'src/game/team-mode.service.ts',
    'src/game/utils/scoring.ts',
    'src/game/utils/levenshtein.ts',
    'src/game/utils/elo.ts',
    'src/game/utils/validation.ts',
    'src/game/utils/hints.ts',
    'src/words/words.service.ts',
    'src/game/bot/bot-player.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};

export default config;
