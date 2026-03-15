module.exports = {
  "src/**/*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "**/*.js": ["eslint --fix", "prettier --write"],
  "*.{json,md,css,scss}": ["prettier --write"],
};
