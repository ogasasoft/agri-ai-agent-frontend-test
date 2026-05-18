module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: ["next/core-web-vitals", "plugin:@typescript-eslint/recommended", "plugin:react-hooks/recommended"],
  ignorePatterns: [".next/", "node_modules/"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "@typescript-eslint/no-explicit-any": "warn",
  },
};
