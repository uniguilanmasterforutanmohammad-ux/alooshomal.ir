import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/**
 * Flat ESLint config for the API (NestJS + TypeScript).
 * Run with `npm run lint` (auto-fix) — formatting is owned by Prettier.
 */
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'prisma/generated/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
