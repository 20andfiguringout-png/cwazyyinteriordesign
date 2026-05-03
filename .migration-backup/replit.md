# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL (Replit built-in, accessed via `pg` Pool)
- **Validation**: Zod
- **Build**: esbuild (ESM bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/alveo run dev` — run Alvéo frontend locally

## Artifacts

### `artifacts/alveo` — Alvéo Closet Configurator (React + Vite)
- **Preview path**: `/` (port 22495)
- **Stack**: React 19, Vite 7, Wouter (routing), TanStack Query, Tailwind v4, Framer Motion, next-themes
- **6 pages**: Home, Configure, Gallery, About, FAQ, Admin/Analytics
- **Key libs**: `lz-string` (share links), `jspdf` + `svg2pdf.js` (PDF export)
- **Fonts**: Inter + Playfair Display (Google Fonts in `index.html`)
- **Brand colors**: `cream-*`, `taupe-*`, `charcoal-*` defined in `src/index.css` `@theme` block
- **No auth**: email from `localStorage("alveo-user-email")`; sent as `x-user-email` header
- **API calls**: Hit `/api/*` routes on the API server for events, designs, comments

### `artifacts/api-server` — Express API Server
- **Port**: 8080 (set by `PORT` env var)
- **Routes**:
  - `GET/POST /api/events` — analytics event store (in-memory, last 1000)
  - `GET/POST/DELETE /api/designs` — per-user saved designs (**PostgreSQL-backed**)
  - `GET/POST/PATCH /api/design-comments` — design comments (**PostgreSQL-backed**)
  - `GET /api/health` — health check
- **Auth**: Optional `EVENTS_ADMIN_TOKEN` env var gates admin endpoints; `x-user-email` header for user identity
- **Database**: `pg` Pool connecting to `DATABASE_URL`; tables `alveo_designs`, `alveo_design_comments`, `alveo_events`

## Database Schema

Tables in the Replit PostgreSQL database:

```sql
alveo_designs       (user_email, id, name, config jsonb, saved_at)
alveo_design_comments (design_id, id, user_email, author_name, text, parent_id, mentions[], mention_read, created_at)
alveo_events        (id serial, event_name, properties jsonb, session_id, created_at)
```

## Layout Engine (`artifacts/alveo/src/engine/ClosetLayoutEngine.ts`)

- Inputs normalised in constructor: dimensions clamped, wardrobe/shoe counts rounded to non-negative integers
- `distributeWidthsSafe()` guarantees `longW + shortW + shoeW === W` exactly
- Shoe shelves ordered bottom → top (ascending `height` relative to `zone.y`)
- `calcDrawerStackHeight()` capped at 60% of usable height
- Per-zone AFF annotations, aisle warnings, and utilisation score

## SVG Renderer (`artifacts/alveo/src/renderer/ClosetSVGRenderer.ts`)

- `cy(in_)` converts inches-from-floor to SVG Y: higher AFF → smaller SVG Y (higher on screen)
- **Shoe bay fix**: bay for shoe[i] is the space ABOVE shelf board i, up to the underside of shelf[i+1].
  `bayTopY = cy(zone.y + nextShelfAFF)` (smaller SVG Y, higher on screen),
  `bayBotY = cy(zone.y + shelf.height) + shelfThicknessPx` (larger SVG Y),
  `bayH = bayBotY - bayTopY > 0` ✓
- `safeH(a, b) = Math.max(0, a - b)` used throughout to prevent negative SVG heights
- `calcDrawHeight()` also checks zone ceilings (not just rod heights) so frame is never undersized

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
