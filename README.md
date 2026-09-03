# D3-SG Website

A modern, premium marketing website for D3-SG — a Singapore-based IT
solutions provider focused on **Data** (Analytics, ML & AI), **Dynamics**
(365 & Power Platform), and **Digital** (application development).

Built with [Next.js](https://nextjs.org) (App Router), TypeScript, and
Tailwind CSS.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available scripts

| Script             | Description                                   |
| ------------------ | ---------------------------------------------- |
| `npm run dev`       | Start the development server (Turbopack).      |
| `npm run build`     | Create a production build.                     |
| `npm run start`     | Serve the production build.                    |
| `npm run lint`      | Run ESLint.                                    |
| `npm run test`      | Run the Jest + React Testing Library test suite. |
| `npm run test:watch`| Run tests in watch mode.                       |

## Project structure

```
src/
  app/            Route segments (App Router): pages, layout, SEO route
                  handlers (sitemap.ts, robots.ts), generated icon/OG image.
  components/
    ui/           Small, reusable, presentation-only building blocks
                  (Button, Container, SectionHeading, Reveal, TiltCard, ...).
    layout/       Site chrome (Header, Footer).
    sections/     Page-level sections composed from ui/ + data.
    forms/        Client components with local state + validation.
  data/           Static content (site info, nav, services, team, pillars).
  hooks/          Small reusable client hooks (scroll reveal, pointer tilt).
  lib/            Framework-agnostic helpers (form validation).
  types/          Shared TypeScript types.
__tests__/        Jest + React Testing Library tests.
docs/             (parent repo) reference screenshots of the previous site —
                  used only to source accurate copy, not UI design.
```

## Design notes

- **No new UI/animation library** was introduced. Scroll-reveal and the 3D
  hover-tilt effect on service cards are implemented with a small
  `IntersectionObserver` hook and pointer events + CSS custom properties,
  keeping the bundle lean and respecting `prefers-reduced-motion`.
- **No logo/photo assets** were copied from the old site — the wordmark and
  team avatars are rendered as markup/CSS instead of images.
- **Content accuracy**: company description, service portfolio, and team
  bios are sourced from the reference screenshots under `/docs` so no
  business information is lost in the redesign.
- **Contact form**: there is currently no documented backend contact
  endpoint (see `scripts/.env.dev`), so submitting the validated form opens
  the visitor's email client with the message pre-filled. Replace
  `buildMailto` in `src/components/forms/ContactForm.tsx` with a real
  `fetch` call once a contact API is documented under `/docs`.
