# sblite

## Dev tips

- use `cargo` to build and test this project
- use `npm` and `vite` to build and test the frontend web/

## Frontend Style Guide

When modifying the React frontend (`web/` directory), please adhere to the following modern UI style guide:
- **Theme:** Use a highly polished, minimalist dark theme primarily utilizing Tailwind's `zinc` palette (e.g., `bg-[#09090b]`, `text-zinc-100`, `zinc-800/50` for borders).
- **Icons:** Use the `lucide-react` library for consistent, clean SVG icons.
- **Base Components** Use daisyUI and tailwindcss as possible
- **Borders & Shadows:**
  - *Structural layout dividers* (e.g., sidebars, main navigation bars) should use solid, slightly lighter gray borders (like `border-zinc-700`) and subtle drop shadows to create depth and clear separation from the main content.
  - *Internal elements* (e.g., cards, widgets, subtle horizontal dividers) should continue to use softer, semi-transparent borders (like `border-zinc-800/50`) and soft shadows over harsh lines.
- **Navigation:** Use React Router's `NavLink` to provide distinct active states for navigation menus, utilizing a soft accent color (e.g., `indigo-500/10` background with `indigo-400` text).

## PR instructions

- always run `cargo fmt` to format the rust code
- always run `npm run lint` in web/ to lint the frontend code
