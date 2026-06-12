/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'test',
        'refactor',
        'style',
        'docs',
        'chore',
        'ci',
        'build',
        'perf',
        'revert'
      ]
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']]
  }
};

module.exports = config;
