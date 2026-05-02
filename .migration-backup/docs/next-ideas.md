# Next Build Ideas

A focused ideation backlog to keep shipping in measurable slices.

## Prioritized Ideas

1. Conversion Funnel Instrumentation
- Add a dedicated funnel panel that tracks `landing -> configure_start -> preview_opened -> pdf_exported` conversion percentages.
- Why: directly ties product UX changes to business outcomes.
- Status: In progress. Funnel cards + date/event filters are now live at `/admin/analytics`, with landing/configure/preview instrumentation added.

2. Saved Design Collaboration
- Add per-design share permissions and comments.
- Why: enables designer/client workflows and revision loops.
- Status: Expanded. Added comments, role controls (viewer/editor), threaded replies, @mentions, and comment snippets in PDF export.

3. Materials and Finish Pricing Engine
- Introduce SKU-level material costs and hardware multipliers.
- Why: turns estimates into procurement-ready pricing.

4. Accessibility and Keyboard Audits
- Add color-contrast checks, focus-visible states, and ARIA review for configurator controls.
- Why: improves inclusivity and enterprise readiness.

5. Deployment Health Panel
- Expose runtime checks for env readiness, webhook health, and provider connectivity.
- Why: lowers operational risk before go-live.
