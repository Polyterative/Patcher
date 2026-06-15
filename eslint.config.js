const angularPlugin = require('@angular-eslint/eslint-plugin');
const angularTemplatePlugin = require('@angular-eslint/eslint-plugin-template');
const angularTemplateParser = require('@angular-eslint/template-parser');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  {
    ignores: [
      'projects/**/*',
      'src/backend/database.types.ts',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: [
          'tsconfig.json',
          'e2e/tsconfig.json',
        ],
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@angular-eslint': angularPlugin,
      '@angular-eslint/template': angularTemplatePlugin,
      '@typescript-eslint': tsPlugin,
    },
    processor: angularTemplatePlugin.processors['extract-inline-html'],
    rules: {
      semi: [
        'warn',
        'always',
      ],
      'prefer-const': 'warn',
      'prefer-template': 'warn',
      'no-var': 'warn',
      'no-duplicate-imports': 'warn',
      'no-duplicate-case': 'warn',
      'prefer-arrow-callback': 'warn',
      'max-depth': 'warn',
      'array-bracket-spacing': 'warn',
      'no-bitwise': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: [
            'app',
            'lib',
            'infoBox',
          ],
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: [
            'app',
            'lib',
            'flexbox',
          ],
          style: 'kebab-case',
        },
      ],
      eqeqeq: [
        'error',
        'smart',
      ],
      '@angular-eslint/prefer-inject': 'off',
      '@angular-eslint/prefer-standalone': 'off',
      '@angular-eslint/no-empty-lifecycle-method': 'off',
      '@angular-eslint/no-input-rename': 'off',
    },
  },
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: angularTemplateParser,
    },
    plugins: {
      '@angular-eslint/template': angularTemplatePlugin,
    },
    rules: {
      '@angular-eslint/template/eqeqeq': [
        'error',
        {
          allowNullOrUndefined: true,
        },
      ],
      '@angular-eslint/template/prefer-control-flow': 'off',
      '@angular-eslint/template/no-negated-async': 'off',
    },
  },
];
