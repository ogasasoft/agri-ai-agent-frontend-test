module.exports = {
  "src/**/*.{ts,tsx}": ["eslint --fix", "prettier --write", "tsc --noEmit"],
  "**/*.js": ["eslint --fix", "prettier --write"],
  "*.{json,md,css,scss}": ["prettier --write"],
};
