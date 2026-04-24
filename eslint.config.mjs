import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'public/**',
      'supabase/functions/**',
      '*.config.js',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // JSX con comillas tipográficas en copy en español — ruido sin beneficio aquí
      'react/no-unescaped-entities': 'off',
      'react/jsx-no-comment-textnodes': 'off',
    },
  },
];
