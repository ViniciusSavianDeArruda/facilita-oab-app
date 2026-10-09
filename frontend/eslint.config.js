/**
 * ESLint flat config — React 18 + Vite 6 + JavaScript/JSX puro.
 *
 * Escopo: regras que previnem bug. Formatação é responsabilidade do
 * Prettier (.prettierrc.json), então nenhuma regra estilística entra aqui —
 * é o que evita os dois brigarem pelo mesmo arquivo.
 *
 * Sem regras de TypeScript: o projeto é JS puro.
 */

import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "public/**"],
  },

  js.configs.recommended,
  // `configs.flat` é a variante em flat config; `configs["recommended-latest"]`
  // na raiz ainda usa o formato eslintrc e o ESLint 10 rejeita.
  reactHooks.configs.flat["recommended-latest"],
  reactRefresh.configs.vite,

  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // Dependências de efeito como erro: foi exatamente o tipo de problema
      // que a auditoria apontou (closure obsoleta em Caderno.jsx).
      "react-hooks/exhaustive-deps": "error",

      // Variável não usada vira erro, mas `_algo` e o rest de desestruturação
      // continuam liberados — os dois padrões já aparecem no código.
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // console.error é usado de propósito em alguns catch de lib/.
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // Arquivos de configuração rodam em Node, não no navegador.
  {
    files: ["*.config.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
];
