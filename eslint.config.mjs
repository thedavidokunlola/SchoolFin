import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "puppeteer",
              message: "Puppeteer runs in worker/ only. Never import it in src/.",
            },
            {
              name: "puppeteer-core",
              message: "Puppeteer runs in worker/ only.",
            },
            {
              name: "@sparticuz/chromium",
              message: "Chromium runs in worker/ only.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "prisma/migrations/**",
  ]),
]);

export default eslintConfig;
