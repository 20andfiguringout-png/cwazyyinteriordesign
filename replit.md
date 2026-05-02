# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild (ESM bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
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
- **No auth**: Next-auth removed; localStorage/sessionStorage for draft + userType
- **API calls**: Hit `/api/*` routes on the API server for events, designs, comments

### `artifacts/api-server` — Express API Server
- **Port**: 8080 (set by `PORT` env var)
- **Routes**:
  - `GET/POST /api/events` — analytics event store (in-memory, last 1000)
  - `GET/POST/DELETE /api/designs` — per-user saved designs (in-memory)
  - `GET/POST/PATCH /api/design-comments` — design comments with mentions, permissions, audit trail
  - `GET /api/health` — health check
- **Auth**: Optional `EVENTS_ADMIN_TOKEN` env var gates admin endpoints
- **Storage**: All in-memory via `globalThis` stores (no DB required for closet features)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
