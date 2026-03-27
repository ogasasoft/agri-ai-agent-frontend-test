module.exports = {
  'src/**/*.{ts,tsx}': ['eslint --fix --config eslint.config.mjs', 'prettier --write'],
  '**/*.js': ['eslint --fix --config eslint.config.mjs', 'prettier --write'],
  '*.{json,md,css,scss}': ['prettier --write'],
};
