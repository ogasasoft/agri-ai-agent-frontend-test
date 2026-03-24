module.exports = {
  "src/**/*.{ts,tsx}": ["eslint --fix || true", "prettier --write"],
  "**/*.js": ["eslint --fix || true", "prettier --write"],
  "*.{json,md,css,scss}": ["prettier --write"],
};
