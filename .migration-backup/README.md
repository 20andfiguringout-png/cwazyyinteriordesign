# Alvéo - Closet Configurator

> *Carved for you.* Custom closet layouts designed around your wardrobe, your life, your space.

## 🏠 Project Overview

Alvéo is an interactive closet configurator that generates custom storage layouts based on user's specific wardrobe inventory, space dimensions, and lifestyle needs. Think of it as a digital interior designer specializing in closet organization.

### The Vision
- **Phase 1**: Interactive closet configurator with real-time SVG previews
- **Phase 2**: AI suggestions, style customization, PDF exports
- **Phase 3**: Expand to pantries, offices, and other storage spaces

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Configure optional auth/cloud providers
copy .env.example .env.local

# Start development server
npm run dev

# Open http://localhost:3000
```

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom Brand System
- **Animations**: Framer Motion
- **Rendering**: SVG for closet elevations
- **Export**: jsPDF for professional layouts
- **Auth**: NextAuth (Credentials + optional Google/email magic-link)
- **Theme**: next-themes (light/dark mode)
- **Cloud Save**: Session-backed API with optional Supabase persistence

## 🔐 Auth & Cloud Setup

To enable accounts and cloud-saved designs across devices:

1. Set `NEXTAUTH_URL` and `NEXTAUTH_SECRET` in `.env.local`
2. Optional OAuth: set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
3. Optional email magic links: set `EMAIL_SERVER` and `EMAIL_FROM`
4. Optional Supabase persistence: set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DESIGNS_TABLE`

If Supabase is not configured, the app falls back to in-memory API storage for local development.

Optional monitoring:
- Set `MONITORING_WEBHOOK_URL` to receive JSON server-error reports from API handlers.
- Set `EVENTS_ADMIN_TOKEN` to protect analytics event reads (`/api/events`) and use it in `/admin/analytics`.

See release readiness steps in `docs/release-checklist.md`.

## ✅ Validation Commands

```bash
npm test
npm run type-check
```

## 🔒 Security Hardening

- Global security headers are applied in `middleware.ts`, including CSP, referrer policy, frame protection, and production HSTS.

## 📊 Internal Analytics

- Admin dashboard: `/admin/analytics`
- Pulls event stream from `/api/events` and shows top events + recent timeline.
- Optional token-based access control via `EVENTS_ADMIN_TOKEN`.
- Includes funnel drop-off visualization, date/event filters, and click-to-inspect event payloads.

## 🧠 Next Ideas

- See `docs/next-ideas.md` for the current prioritized build backlog.

## 🤝 Collaboration Notes

- Saved designs now support comments via `/api/design-comments`.
- In the Custom Export modal, open comments for a design using the comment icon.
- Collaboration supports role controls (viewer/editor), threaded replies, and @mentions.
- PDF exports now include top design comments when available.

### Brand System
Built on luxury interior design principles:
- **Typography**: Playfair Display (editorial serif) + Inter (clean sans-serif)
- **Colors**: Warm neutrals (cream, taupe, charcoal)
- **Feel**: Aspirational yet accessible, like AD magazine meets IKEA functionality

## 📐 Core Features

### User Journey
1. **Landing Page** - Brand story + user type selection
2. **Configurator** - Room dimensions + wardrobe inventory  
3. **Live Preview** - Real-time SVG elevation drawings
4. **Export** - PDF layouts ready for contractors/DIY

### Calculation Engine
The heart of Alvéo - converts user input into precise storage layouts:
- **Shoe Calculator**: Different heights for sneakers (5"), heels (6"), boots (12")
- **Hanging Zones**: Long hang (dresses), short hang (shirts), double hang
- **Smart Shelving**: Calculates optimal spacing based on actual item quantities
- **Utilization Score**: Measures how efficiently space is used

## 🎯 Project Status

**Feature Roadmap Status**
- ✅ Wizard draft persistence + share link hydration
- ✅ Real PDF download export (jsPDF + svg2pdf)
- ✅ Metric/imperial input support
- ✅ Mobile configure/preview tabs
- ✅ Testimonials, FAQ, footer, OG metadata
- ✅ Cost tab, cut-list tab with CSV export
- ✅ 3D isometric preview
- ✅ Design comparison modal
- ✅ Layout optimizer modal (shoe-first / hanging-first / balanced)
- ✅ Send via email with prefilled summary + share link
- ✅ Dark mode toggle + theme provider
- ✅ Session-backed cloud-saved designs API + NextAuth routes

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── configure/page.tsx    # Main configurator  
│   └── layout.tsx           # Root layout
├── components/
│   ├── ui/                  # Reusable UI components
│   ├── configurator/        # Configurator-specific components
│   └── [LandingSections]    # Landing page sections
├── types/closet.ts          # TypeScript interfaces
├── engine/                  # Layout calculation logic (coming)
└── renderer/               # SVG generation (coming)
```

## 🎨 Design Principles

1. **Intentionality** - Every shelf has a purpose
2. **Precision** - Measurements based on real items, not guesswork  
3. **Personhood** - Designed for individual users, not generic storage
4. **Beauty** - Functional layouts that look professionally designed
5. **Accessibility** - Luxury thinking available to everyone

---

*"Every object you love deserves a place. Every morning routine deserves ease. Every space deserves intention."*