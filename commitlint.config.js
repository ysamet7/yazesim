/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'web',
        'api',
        'worker',
        'ai',
        'personas',
        'ui',
        'contracts',
        'shared',
        'server',
        'database',
        'test-support',
        'config',
        'scripts',
        'infra',
        'tooling',
        'github',
        'ci',
        'deps',
        'docs',
        'release',
      ],
    ],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
