import nextConfig from "eslint-config-next/core-web-vitals";

export default [
  ...nextConfig,
  {
    settings: {
      react: {
        version: "19.0.0",
      },
    },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];
