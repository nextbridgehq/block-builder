import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Only the pure, testable modules. Components and endpoints need a
      // Payload/React harness that doesn't exist yet, and including them would
      // make the thresholds meaningless rather than protective.
      include: [
        'src/builder/**',
        'src/validation/**',
        'src/utils/**',
        'src/block-builder/lib/**',
      ],
      // Type-only modules and re-export barrels have no executable statements;
      // counting them just dilutes the numbers.
      exclude: ['**/types.ts', '**/index.ts'],
      // A ratchet, not a target: set just below what the suite currently
      // achieves so CI fails on a regression rather than failing on day one.
      // Raise these as coverage improves -- the biggest remaining gaps are
      // schemaValidator (~46%) and normalizer (~46%).
      thresholds: {
        statements: 60,
        branches: 52,
        functions: 70,
        lines: 63,
      },
    },
  },
})
