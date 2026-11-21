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
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "scripts/**",
      // next-pwa'nın build sırasında ürettiği service worker / workbox dosyaları
      "public/**",
    ],
  },
  {
    rules: {
      // 2026-11: kod tabanında ~530 `any` var; tiplemesi ayrı bir iş. Görünür kalsın, build'i durdurmasın.
      "@typescript-eslint/no-explicit-any": "warn",

      // Aşağıdakiler temizlendi (0 bulgu) → yeni ihlal build'i durdurur
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
          ignoreRestSiblings: true,
        },
      ],
      // Eksik bağımlılık = bayat closure. Fonksiyonları useCallback ile sarın; bilinçli istisnada
      // satır üstüne `// eslint-disable-next-line react-hooks/exhaustive-deps` + gerekçe yazın.
      "react-hooks/exhaustive-deps": "error",
      "react/no-unescaped-entities": "error",
      "prefer-const": "error",
    },
  },
];

export default eslintConfig;
