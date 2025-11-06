import globals from 'globals';
import eslint from '@eslint/js';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import markdown from 'eslint-plugin-markdown';
import * as regexp from 'eslint-plugin-regexp';
import yml from 'eslint-plugin-yml';

export default [
  {
    ignores: [
      'app/*/dist/**',
      'app/**/test/**',
      'app/**/localService/**',
      'eslint.config.mjs',
      'gen/**',
      'test/**',
      'srv/external/**',
      '**/.husky/**',
      '**/mta_archives/**',
      '**/coverage/**',
      '**/node_modules/**',
      'scripts/**', // Ignore validation scripts themselves
    ],
  },
  {
    languageOptions: { sourceType: 'commonjs' },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        sap: 'readonly',
        jQuery: 'readonly',
        SELECT: 'readonly',
        INSERT: 'readonly',
        UPDATE: 'readonly',
        DELETE: 'readonly',
        UPSERT: 'readonly',
        clients: 'readonly',
      },
    },
  },
  eslint.configs.recommended,
  {
    rules: {
      'no-var': 'error',

      // Pre-commit quality checks - Prevent unused variables and imports
      'no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Pre-commit quality checks - Prevent console statements
      'no-console': [
        'error',
        {
          allow: ['warn', 'error'],
        },
      ],

      // Prevent debugger statements
      'no-debugger': 'error',

      // Prevent alert statements
      'no-alert': 'error',

      // Disallow unused expressions
      'no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true,
        },
      ],

      // Enforce return statements in getters
      'getter-return': 'error',

      // Disallow assignment in conditional expressions
      'no-cond-assign': 'error',

      // Disallow duplicate arguments in function definitions
      'no-dupe-args': 'error',

      // Disallow duplicate keys in object literals
      'no-dupe-keys': 'error',

      // Disallow duplicate case labels
      'no-duplicate-case': 'error',

      // Disallow empty block statements
      'no-empty': [
        'error',
        {
          allowEmptyCatch: false,
        },
      ],

      // Disallow unnecessary semicolons
      'no-extra-semi': 'error',

      // Disallow reassigning function declarations
      'no-func-assign': 'error',

      // Disallow variable or function declarations in nested blocks
      'no-inner-declarations': 'error',

      // Disallow invalid regular expressions
      'no-invalid-regexp': 'error',

      // Disallow irregular whitespace
      'no-irregular-whitespace': 'error',

      // Disallow unreachable code after return, throw, continue, and break
      'no-unreachable': 'error',

      // Require calls to isNaN() when checking for NaN
      'use-isnan': 'error',

      // Enforce comparing typeof expressions against valid strings
      'valid-typeof': 'error',
    },
  },
  ...markdown.configs.recommended,
  ...yml.configs['flat/recommended'],
  {
    rules: {
      'yml/no-empty-mapping-value': 'off',
    },
  },
  ...yml.configs['flat/prettier'],
  comments.recommended,
  regexp.configs['flat/recommended'],
];
