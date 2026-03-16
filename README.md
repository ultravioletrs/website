# Ultraviolet Website

Marketing site and content hub for Ultraviolet, built with Astro and Tailwind CSS.

## Stack

- Astro
- Tailwind CSS
- TypeScript
- Sharp for image optimization

## Project Structure

```text
/
├── content/            # Long-form blog content and media
├── public/             # Static assets served as-is
├── src/
│   ├── assets/         # Optimized local images and logos
│   ├── components/     # Reusable Astro components
│   ├── content/        # Astro content collection config
│   ├── layouts/        # Shared page layouts
│   ├── pages/          # Route entrypoints
│   └── styles/         # Global styles
├── astro.config.mjs
└── package.json
```

## Commands

Run commands from the repository root:

| Command | Action |
| :-- | :-- |
| `pnpm install` | Install dependencies |
| `pnpm run dev` | Start the local Astro development server |
| `pnpm run build` | Build the production site |
| `pnpm run preview` | Preview the production build locally |
| `pnpm run check` | Run Astro and TypeScript checks |

## Content Notes

- Page routes live in `src/pages/`.
- Shared layout and UI primitives live in `src/layouts/` and `src/components/`.
- Blog collection schema is defined in `src/content/config.ts`.
- Static brand assets and icons live in `public/`.
