import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import { config as nextConfig } from 'next/core-web-vitals'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  nextConfig,
  {
    ignores: ['.next/', 'node_modules/', 'dist/', 'build/'],
  },
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]
