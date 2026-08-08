import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "_deprecated_backend/**",
      "backend/**",
      "test.js",
    ],
  },
  ...nextVitals,
  ...nextTs,
];

export default eslintConfig;
