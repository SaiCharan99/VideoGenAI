/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 100],
    'scope-enum': [
      2,
      'always',
      ['pipeline', 'web', 'db', 'channels', 'types', 'remotion', 'ci', 'deps', 'repo'],
    ],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'refactor', 'test', 'perf', 'style', 'build', 'revert'],
    ],
  },
};
