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
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### `artifacts/alveo` — Alvéo Closet Configurator (react-vite, preview: `/`)
A closet design configurator app with:
- Homepage with hero, how it works, testimonials sections
- Interactive closet configurator (type, dimensions, style, accessories)
- Gallery page for browsing designs
- Clients management page
- About, FAQ pages
- PDF export and design sharing features
- Dark/light mode support

### `artifacts/api-server` — Express API Server (preview: `/api`)
Backend with routes for:
- `/api/designs` — save/load closet designs per user
- `/api/events` — analytics event tracking
- `/api/designComments` — collaborative comments on designs
- `/api/clients` — client management
- `/api/healthz` — health check

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

Tables in PostgreSQL (managed via Drizzle ORM in `lib/db/src/schema/`):
- `alveo_designs` — user closet designs (JSON config)
- `alveo_events` — analytics events
- `alveo_design_comments` — collaborative comments
- `alveo_design_permissions` — design sharing permissions
- `alveo_mention_reads` — comment mention read tracking
- `alveo_design_audit` — audit log for design changes
- `alveo_clients` — client management records

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
