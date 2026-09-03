import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
  {
    // React Three Fiber's scene graph is intentionally imperative: mutating
    // `camera`/mesh/material properties inside `useFrame` every tick (rather
    // than via React state) is the documented, correct way to drive a
    // performant 60fps 3D scene, and memoizing one-time randomised particle
    // geometry in `useMemo` is a standard, safe pattern. The React Compiler
    // "purity"/"immutability" hook rules can't distinguish this from actual
    // React state bugs, so they're relaxed for this directory only.
    files: ["src/components/three/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
