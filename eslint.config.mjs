import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
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
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "prisma/migrations/**",
    ],
  },
];

export default eslintConfig;
