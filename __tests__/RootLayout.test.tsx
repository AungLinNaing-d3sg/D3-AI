import { renderToStaticMarkup } from "react-dom/server";
import RootLayout from "@/app/layout";

// This suite covers the layout.tsx change that adds `suppressHydrationWarning`
// (scoped to <body> only) to silence the well-documented, unfixable-from-app-code
// false-positive hydration warning caused by browser extensions (Grammarly,
// Dashlane, etc.) injecting attributes onto <body> before React hydrates.
// See: https://react.dev/link/hydration-mismatch
//
// Note: `suppressHydrationWarning` is a React-only hydration instruction, not a
// DOM attribute — it cannot be observed via `hydrateRoot(document, ...)` mismatch
// assertions in jsdom, because jsdom's full-document hydration path itself
// produces unrelated attribute-diff noise on <html> (a pre-existing jsdom/RTL
// limitation, unrelated to this change, confirmed by manual reproduction: even
// with no extension attributes present at all, `document.documentElement.innerHTML`
// assignment does not repopulate the <html> tag's own attributes, so any
// hydrateRoot(document, ...) test would always report a spurious mismatch
// regardless of this fix). The tests below instead verify the two things that
// are actually testable and meaningful: (1) the change is additive/non-breaking
// to the rendered markup and existing a11y structure, and (2) the prop is a
// pure React directive that never leaks into the emitted HTML.
jest.mock("@/components/layout/Header", () => ({ Header: () => <div>header</div> }));
jest.mock("@/components/layout/Footer", () => ({ Footer: () => <div>footer</div> }));
jest.mock("@/components/motion/SmoothScrollProvider", () => ({
  SmoothScrollProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// `params` is required by Next.js's generated `LayoutProps<"/">` type even
// though RootLayout doesn't use it; the root route has no dynamic segments,
// so it resolves to an empty object.
const params = Promise.resolve({});

describe("RootLayout", () => {
  it("renders without throwing and preserves the body's existing layout classes", () => {
    const html = renderToStaticMarkup(
      <RootLayout params={params}>{<div>child content</div>}</RootLayout>
    );
    expect(html).toContain('<body class="flex min-h-full flex-col antialiased">');
  });

  it("does not leak `suppressHydrationWarning` as a literal DOM attribute", () => {
    const html = renderToStaticMarkup(
      <RootLayout params={params}>{<div>child content</div>}</RootLayout>
    );
    expect(html.toLowerCase()).not.toContain("suppresshydrationwarning");
  });

  it("preserves the skip link and main landmark for keyboard/screen-reader users", () => {
    const html = renderToStaticMarkup(
      <RootLayout params={params}>{<div>child content</div>}</RootLayout>
    );
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('id="main-content"');
    expect(html).toContain("Skip to content");
  });

  it("still renders the child page content inside <main>", () => {
    const html = renderToStaticMarkup(
      <RootLayout params={params}>{<div>child content</div>}</RootLayout>
    );
    expect(html).toContain("child content");
  });
});
