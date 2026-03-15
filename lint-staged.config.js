module.exports = {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write", "tsc --noEmit"],
  "*.{js,jsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css,scss}": ["prettier --write"],
};
