import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { import: importPlugin },
    rules: {
      "import/no-restricted-paths": ["error", {
        zones: [
          { target: "./src/core", from: "./src/(app|components|server|hooks|fixtures)" },
          { target: "./src/server", from: "./src/(app|components|hooks|fixtures)" },
          { target: "./src/components", from: "./src/(core|server|config)" },
          { target: "./src/config", from: "./src/(core|server|app|components|hooks|fixtures)" },
          { target: "./src/fixtures", from: "./src/(core|server|app|components|lib|hooks|config)" },
        ],
      }],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

  ]),
]);

export default eslintConfig;
