import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dev-dist',
      'coverage',
      'playwright-report',
      'test-results',
      'docs',
      '.specify',
      '.claude',
      'supabase',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      // Limite entre módulos: só a API pública (index.ts) de outro módulo pode ser importada.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modules/*/*', '!@/modules/*/index'],
              message:
                'Importe apenas a API pública do módulo (@/modules/<modulo>). Ver docs/arquitetura.md.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/modules/*/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', '@supabase/*', '@/shared/ui/*', '@/app/*'],
              message: 'O domínio deve ser TypeScript puro (sem React, Supabase ou UI).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['*.config.{ts,js}', 'e2e/**/*.ts', 'e2e-supabase/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
