import nextJsConfig from 'eslint-config-next';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
