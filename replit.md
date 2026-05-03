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
- **Auth**: JWT (30d tokens via bcryptjs hashing) + legacy Replit OIDC session fallback
- **Build**: esbuild (CJS bundle)

## Artifacts

### `artifacts/alveo` — Alvéo Closet Configurator (react-vite, preview: `/`)
A closet design configurator app for interior designers with:
- Homepage with hero, how it works, testimonials sections
- Interactive closet configurator (type, dimensions, style, accessories)
- Gallery page for browsing designs
- **Auth**: Register/Login/Logout with email+password (JWT, `AuthContext.tsx`)
- **Designer Dashboard** (`/dashboard`): project cards, design list, approval status, quick links
- **Project management**: Create/edit/delete projects, link designs to projects
- **Client Approval Portal** (`/portal/:token`): shareable link for client to review+approve/reject design
- **Send for Approval**: button in LivePreview generates portal link with design snapshot
- **Duplicate Design**: button in LivePreview to save a copy of current design
- **Builder persistence**: free-draw builder state auto-saves to localStorage
- Clients management page
- About, FAQ pages
- PDF export and design sharing features
- Dark/light mode support

### `artifacts/api-server` — Express API Server (preview: `/api`)
Backend with routes for:
- `/api/auth/register` — email+password signup (bcryptjs)
- `/api/auth/login` — email+password login → JWT
- `/api/auth/me` — get current user from JWT Bearer
- `/api/designs` — save/load closet designs per user
- `/api/projects` — CRUD for designer projects (groups designs)
- `/api/approvals/send` — create client approval request with design snapshot
- `/api/approvals/portal/:token` — public portal read (no auth)
- `/api/approvals/portal/:token/respond` — client approve/reject
- `/api/approvals` — list all approvals for authenticated designer
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
- `PORT=22495 BASE_PATH=/ pnpm --filter @workspace/alveo run dev` — run frontend locally

## Workflows

- **Start application**: `PORT=22495 BASE_PATH=/ pnpm --filter @workspace/alveo run dev` → port 22495 (webview)
- **API Server**: `PORT=8080 pnpm --filter @workspace/api-server run dev` → port 8080 (console)

## Database Schema

Tables in PostgreSQL (managed via Drizzle ORM in `lib/db/src/schema/`):
- `alveo_designs` — user closet designs (JSON config)
- `alveo_events` — analytics events
- `alveo_design_comments` — collaborative comments
- `alveo_design_permissions` — design sharing permissions
- `alveo_mention_reads` — comment mention read tracking
- `alveo_design_audit` — audit log for design changes
- `alveo_clients` — client management records
- `alveo_projects` — designer projects (groups designs)
- `alveo_design_approvals` — client approval requests with design snapshots
- `users` — auth users (email, bcrypt password_hash, profile info)
- `sessions` — OIDC session store

## Security Hardening (completed)

- `helmet` security headers on all responses (HSTS, CSP, X-Frame-Options, etc.)
- CORS restricted to known Replit domain + localhost
- Brute-force rate limiting on auth routes (10 req / 15 min per IP)
- JWT signed with strong random `JWT_SECRET` (set via Replit env vars)
- Constant-time bcrypt comparison on login to prevent timing attacks
- All user-supplied values HTML-escaped in outgoing email templates
- SQL injection prevented — all queries fully parameterised; sort-column allowlist in comments route
- Audit trail written to `alveo_audit_log` for every auth, design, client, project and approval mutation
- Rate limiting uses `req.ip` (trust-proxy normalised) not raw `x-forwarded-for`
- Request body capped at 15 MB

## Required Environment Variables

### `artifacts/api-server`
| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (provided by Replit DB integration) |
| `JWT_SECRET` | **Yes** | Secret for signing JWT tokens — generated and stored as a Replit env var. Server refuses to start in production without it. |
| `EVENTS_ADMIN_TOKEN` | No | Token for admin-only routes (`GET /api/events`, `PATCH /design-comments` mention-ack). Set this before going live if you want to use analytics or comment admin features. |
| `SMTP_HOST` | No | SMTP server hostname for quote email sending. Quote emails silently no-op without this. |
| `SMTP_USER` | No | SMTP auth username. |
| `SMTP_PASS` | No | SMTP auth password. |
| `SMTP_PORT` | No | SMTP port (default: 587). |
| `SMTP_SECURE` | No | `"true"` to use TLS (default: false / STARTTLS). |
| `SMTP_FROM` | No | From address for outgoing emails (defaults to `SMTP_USER`). |

### `artifacts/alveo`
| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Set by Replit workflow env; Vite dev server listens on this port. |
| `BASE_PATH` | Yes | Set by Replit workflow env; used as Vite `base` for asset paths. |

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
