import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: [".next/**", "node_modules/**", "data/**", "next-env.d.ts"]
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly"
      }
    }
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json"
      },
      globals: {
        React: "readonly",
        JSX: "readonly",
        File: "readonly",
        FormData: "readonly",
        Response: "readonly",
        Request: "readonly",
        ReadableStream: "readonly",
        Buffer: "readonly",
        alert: "readonly",
        confirm: "readonly",
        fetch: "readonly",
        window: "readonly",
        console: "readonly",
        process: "readonly"
      }
    },
    plugins: {
      "@next/next": nextPlugin,
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "@next/next/no-img-element": "off",
      "no-undef": "off"
    }
  }
];
