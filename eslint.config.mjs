import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";
import nextEslint from "next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Fusión de configuraciones
const eslintConfig = [
  // Configuraciones base de Next.js y TypeScript
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  
  // Reglas recomendadas generales y Next.js
  nextEslint,
  eslint.configs.recommended,

  // Configuración específica para TypeScript
  {
    files: ["**/*.ts", "**/*.tsx"], // Solo en archivos TypeScript
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // Desactivar regla genérica y activar la específica de TypeScript
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn", // Cambia a "error" si quieres que falle la compilación
        {
          args: "all",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];

export default eslintConfig;
