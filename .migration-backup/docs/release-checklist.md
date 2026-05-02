# Release Checklist

## 1) Environment and Secrets

- Set `NEXTAUTH_URL`
- Set `NEXTAUTH_SECRET`
- Optional: set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Optional: set `EMAIL_SERVER` and `EMAIL_FROM`
- Optional: set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DESIGNS_TABLE`

## 2) Build and Validation

- Run `npm install`
- Run `npm run type-check`
- Run `npm run build`
- Verify no runtime errors in `/configure`, `/gallery`, `/about`, `/faq`

## 3) Core Flow Smoke Tests

- Configure a design and refresh: draft restores
- Copy share link and open in new tab: design hydrates
- Save design while signed in: appears after reload
- Remove design while signed in: removed after reload
- Export single and multi-design PDFs
- Generate cut-list CSV
- Open compare modal with two saved designs
- Open optimizer and apply each variant
- Send email flow opens with subject/body

## 4) Security and API Checks

- Confirm `/api/designs` returns 401 for unauthenticated requests
- Confirm rate-limit returns 429 after threshold bursts
- Confirm malformed `/api/designs` payload returns 400 with validation details
- Confirm `/api/events` accepts valid payload and rejects invalid payload

## 5) UX and Accessibility

- Verify mobile tab bar in configurator
- Verify keyboard shortcuts: Enter/ArrowRight/ArrowLeft/Backspace/Escape
- Verify dark mode toggle on desktop and mobile nav
- Verify footer links and social links

## 6) Metadata and Sharing

- Validate OG image appears for home/about/gallery shares
- Validate title and description metadata on each key page

## 7) Observability

- Confirm app errors render the `app/error.tsx` fallback
- Confirm analytics events are accepted at `/api/events`
- Confirm local analytics buffer stored in browser (`alveo-analytics-buffer`)

## 8) Go-Live Controls

- Enable production domain in NextAuth provider settings
- Configure managed database policies for Supabase table `designs`
- Add scheduled backups for designs table
- Configure monitoring alert for API 5xx spike
