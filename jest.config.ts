import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  moduleNameMapper: {
    // The 3D scene is decorative and cannot run in jsdom (no WebGL context).
    // Swap it for lightweight stubs in tests so section/page tests can focus
    // on real DOM content, accessibility, and data integrity instead.
    "^@react-three/fiber$": "<rootDir>/src/test/mocks/react-three-fiber.tsx",
    "^@react-three/drei$": "<rootDir>/src/test/mocks/react-three-drei.tsx",
    // See src/test/mocks/reveal.tsx for why the animated Reveal wrapper is
    // stubbed out in tests. Matched by suffix (not `^@/...`) because the
    // SWC transform already rewrites "@/..." imports to relative paths
    // before Jest's resolver ever sees them.
    "motion/Reveal$": "<rootDir>/src/test/mocks/reveal.tsx",
    // `jest.mock("@/...")` calls (as opposed to regular `import` statements)
    // are plain string literals SWC never rewrites, so the "@/" alias needs
    // an explicit fallback mapping here to resolve at all.
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
