import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Fusión de configuraciones
const eslintConfig = [
  // Ignorar carpetas legacy/no incluidas en tsconfig para typed-lint
  {
    ignores: [
      "components/**",
      "pages/**",
      "src/**",
      "deprecated/**",
    ],
  },
  // Configuraciones base de Next.js y TypeScript
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  
  // Reglas recomendadas generales
  eslint.configs.recommended,

  // Configuración específica para TypeScript
  {
    // Solo activar typed-lint en rutas cubiertas por tsconfig.json
    files: [
      "app/**/*.ts",
      "app/**/*.tsx",
      "lib/**/*.ts",
      "lib/**/*.tsx",
      "test/**/*.ts",
      "test/**/*.tsx",
      "middleware.ts",
    ],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
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
      // Suavizar reglas ruidosas para el sprint actual
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/prefer-as-const": "warn",
      "prefer-const": "warn",
      "no-unused-expressions": "warn",
  "@typescript-eslint/no-unused-expressions": "warn",
      "no-constant-condition": "warn",
      // Con TS no se necesita esta regla y genera falsos positivos (React 17+ runtime automático)
      "no-undef": "off",
      // Evitar fallos por bloques vacíos temporales en rutas experimentales
      "no-empty": "warn",
      // En entornos Node/TSX, permitir require puntuales durante migraciones
      "@typescript-eslint/no-require-imports": "warn",
      // Algunas cadenas con regex/patrones contienen escapes intencionales
      "no-useless-escape": "off",
    },
  },
  // Regla de hooks: no aplica en archivos de servicios Node (no-React)
  {
    files: ["lib/services/**/*.ts", "lib/**/index.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "warn",
    },
  },
];

export default eslintConfig;
