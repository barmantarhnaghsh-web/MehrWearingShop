import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      // Deterministic dummy config for unit tests (env.ts validates on import).
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      JWT_ACCESS_SECRET: 'test-access-secret-0123456789abcdef',
      JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789abcdef',
      NODE_ENV: 'test',
    },
  },
});
