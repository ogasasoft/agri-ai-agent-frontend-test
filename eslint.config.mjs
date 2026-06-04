import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    ignores: ["node_modules/", ".next/", "coverage/"],
  },
];

export default eslintConfig;
