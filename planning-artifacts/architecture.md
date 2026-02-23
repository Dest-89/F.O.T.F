---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: complete
completedAt: '2026-02-17'
inputDocuments: ['planning-artifacts/prd.md', 'planning-artifacts/ux-design-specification.md']
workflowType: 'architecture'
project_name: 'Direct Marketing Mastery School'
user_name: 'Mister Dest'
date: '2026-02-17'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

Nine functional domains, each with distinct data flows and API surface:

1. **Authentication** — Register, login, password reset, JWT sessions, protected routes, admin vs. student role separation
2. **Course & Lesson System** — Courses with lessons, progress tracking, free previews (lead magnet), visual curriculum map (Research → Traffic → Funnels → Email → Advanced)
3. **Student Dashboard** — Journey Path Map (flagship), streak counter, course progress cards, activity feed, upsell surface, blog feed
4. **Blog** — Public, SEO-first, no auth required, primary organic traffic channel
5. **Services / Consulting** — Static page + Cal.com embed + webhook handler (BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED)
6. **Payments** — Stripe Checkout (one-time), webhook handler (checkout.session.completed, payment_intent.payment_failed), processor-agnostic abstraction
7. **Email System** — Dual system: Emailit (6 transactional types) + Encharge (9 lifecycle automation triggers), both fired from Worker
8. **Admin Dashboard** — Course/blog management, student CRM with journey timeline, revenue attribution report, basic analytics
9. **Customer Journey Tracking** — UTM capture (first-touch + last-touch), GTM data layer (7 event types), attribution stored on users and user_purchases

**Non-Functional Requirements:**

| NFR | Requirement | Source |
|-----|-------------|--------|
| Performance | Near-instant loads — static HTML + Cloudflare CDN; "Speed is respect" | UX spec |
| Accessibility | WCAG 2.1 Level AA throughout | UX spec |
| SEO | Meta tags, sitemap, clean slugs, OpenGraph — all public pages from day one | PRD |
| Security | JWT auth, sanitized WYSIWYG HTML, Stripe webhook signature verification, password hashing | PRD |
| Observability | Cloudflare observability enabled from day one; Stripe failures → admin Emailit alert | PRD |
| Scalability | D1 read replicas planned for scale; activity log 90-day retention policy | PRD |
| No offline | Cloudflare CDN covers global latency; offline adds complexity with no gain | UX spec |
| No native app | Web-first, mobile-responsive — discovery mobile, learning desktop | UX spec |

**Scale & Complexity:**

- Primary domain: **Full-stack web application** — static frontend + serverless backend + SQLite + 5 third-party integrations
- Complexity level: **Medium** — well-scoped, no real-time/collaborative features, known integrations, single operator
- Estimated architectural components: ~12 (Worker route groups, D1 schema, R2 asset handling, Auth module, Stripe lib, Email lib, Cal lib, GTM layer, Admin router, CSS token system, Journey Path Map, Dark mode system)
- Database tables: ~9 core (users, courses, lessons, lesson_progress, user_purchases, blog_posts, consultation_bookings, student_activity_log + future community tables)

### Technical Constraints & Dependencies

**Stack is locked — all Cloudflare:**
- Frontend: Static HTML + Alpine.js → Cloudflare Pages (no build step, no framework)
- Backend: Cloudflare Worker (TypeScript) — all business logic, API, webhooks
- Database: Cloudflare D1 (SQLite) — staging + production environments, migrations on staging first
- Storage: Cloudflare R2 — images, cover assets
- No CSS framework — custom neumorphic CSS token system only
- Admin: Single `admin.js` with router pattern — vanilla JS, no framework
- WYSIWYG: Quill.js or TipTap (open question — decide before admin build)

**Third-party integrations (fixed):**
- Stripe (payments), Emailit (transactional email), Encharge (lifecycle automation), Cal.com (booking), Google Tag Manager (analytics)

**Deployment:**
- GitHub → Cloudflare Pages (CI/CD)
- Staging environment for D1 migration verification before production

### Cross-Cutting Concerns Identified

1. **Auth/Authorization** — JWT issued by Worker, validated on every protected route. Student and admin roles require separate route guards. Admin is a distinct surface with its own auth check.
2. **Webhook Security** — Stripe requires signature verification (`stripe-signature` header). Cal.com webhooks require payload validation. Both handled in Worker before any business logic executes.
3. **Dual Email Orchestration** — Every significant user event triggers both Emailit (immediate transactional) and Encharge (sequence enrollment via tag addition). These must not conflict and must fail gracefully independently. **Critical constraint:** The Encharge LTD plan does not include the event-based Ingest API. All Encharge interactions use the REST API only — `upsertContact`, `addTag`, and `removeTag`. Flows in Encharge are built with "Tag Added" triggers, not event triggers. Re-engagement sequences (day 3/7/14 inactivity) are handled by Encharge's time-based segment rules — no Worker action required.
4. **UTM Attribution** — First-touch captured in JS on page load, stored in `localStorage`, sent to Worker on registration. Last-touch captured on purchase. Coordination between client JS, Worker, and D1 schema required.
5. **HTML Sanitization** — All WYSIWYG content (Quill/TipTap output) must be sanitized in the Worker before storing in D1. Never trust client-provided HTML.
6. **SEO** — Meta tags, OpenGraph, Twitter Card, canonical URLs, and XML sitemap required on every public page from day one. Not an afterthought.
7. **Progress Sync** — Lesson completion must update DB state, animate UI, then trigger Encharge milestone check — in that order. UI feedback must fire before email, never after a delay.
8. **Dark Mode** — `[data-theme="dark"]` on `<html>` element. Entire design token system flips via CSS variable overrides. Alpine.js handles the toggle; `localStorage` persists preference.
9. **Page-Type Theming** — `page--dashboard`, `page--lesson`, `page--blog`, `page--marketing` classes control layout rules and shadow weight per the hybrid design direction.

---

## Starter Template & Project Structure

### Primary Technology Domain

Full-stack web application — static frontend + Cloudflare Worker API backend. No framework-based starter applies. The Worker is initialized via `npm create cloudflare@latest`; the static frontend is plain HTML managed directly.

### Starter Options Considered

| Option | Description | Verdict |
|--------|-------------|---------|
| `npm create cloudflare@latest` (Worker) | Official Cloudflare scaffold — TypeScript Worker, Wrangler config, D1 bindings | ✅ Selected for Worker |
| Cloudflare Pages Functions co-location | Worker logic lives inside `/functions/` alongside static assets | ❌ Rejected — Worker is too substantial to treat as page functions |
| Vite / Next.js / SvelteKit | Framework starters | ❌ Incompatible — stack requires no build step, static HTML only |

### Selected Approach: Monorepo with Separate Worker and Public Directories

**Rationale:** The Worker is a full API surface — auth, webhooks, email orchestration, DB access. Co-locating it as Pages Functions would obscure that architectural weight. A clear `/worker` + `/public` split gives a clean, unambiguous boundary: API logic in `/worker/src`, frontend in `/public`.

### Initialization Commands

```bash
# Worker
npm create cloudflare@latest worker -- --type=hello-world --lang=ts --no-deploy

# D1 databases
wrangler d1 create fotf-platform-staging
wrangler d1 create fotf-platform-production
```

### Project Structure

```
/
  worker/
    src/
      index.ts                    ← Router entry point
      routes/                     ← Route handlers by domain
        auth.ts
        courses.ts
        lessons.ts
        blog.ts
        webhooks/
          stripe.ts
          cal.ts
        admin/
      lib/
        stripe.ts                 ← Payment abstraction (processor-agnostic)
        emailit.ts                ← Transactional email
        encharge.ts               ← Lifecycle automation (tag-based REST API: upsertContact, addTag, removeTag)
        auth.ts                   ← JWT helpers
        sanitize.ts               ← HTML sanitization
      db/
        schema.ts                 ← D1 type definitions
        queries/                  ← Typed query helpers
    wrangler.toml
    package.json
    tsconfig.json
  public/
    index.html
    courses/
    dashboard/
    blog/
    admin/
      index.html
      admin.js                    ← Router + shared components
    css/
      tokens.css                  ← Design system variables (light + dark)
      main.css
    js/
      utm.js                      ← UTM capture + localStorage
      auth.js                     ← Session handling
      components/                 ← Reusable Alpine x-data definitions
  migrations/
    0001_initial_schema.sql
  .github/
    workflows/
      deploy.yml                  ← Deploy Worker on push to main
  README.md
```

### Architectural Decisions Established by Structure

| Decision | Choice |
|----------|--------|
| Language (Worker) | TypeScript |
| Language (Frontend) | Vanilla JS (ES modules, no build step) |
| Styling | Custom CSS variables only — no framework |
| Admin approach | Single `admin.js` with client-side router — vanilla JS |
| Testing | Vitest for Worker unit tests; manual for frontend |
| Deployment | GitHub → Cloudflare Pages (frontend) + `wrangler deploy` (Worker) |
| Environment config | `wrangler.toml` vars for staging; Cloudflare dashboard secrets for production |
| Secret management | `STRIPE_SECRET_KEY`, `EMAILIT_API_KEY`, `ENCHARGE_API_KEY`, `JWT_SECRET` — never in code |

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- HTTP router for Worker: Hono
- JWT storage: localStorage
- Password hashing: Web Crypto API (PBKDF2)
- Admin auth: JWT with `role` claim
- WYSIWYG editor: Quill.js
- SEO meta rendering: Worker SSR (meta injection only)

**Important Decisions (Shape Architecture):**
- SQL approach: Raw D1 SQL (no query builder)
- API error format: `{ "error": { "code": "...", "message": "..." } }`
- Rate limiting: Cloudflare dashboard rules (no custom Worker logic in MVP)
- Alpine.js state: `Alpine.store()` for session + theme; local `x-data` for everything else
- Admin routing: Hash-based client-side router in `admin.js`

**Deferred Decisions (Post-MVP):**
- D1 caching: Add only if latency becomes measurable issue
- D1 read replicas: Phase 3 scaling decision
- Paid discovery call tier: After 3+ testimonials acquired

---

### Data Architecture

**Database:** Cloudflare D1 (SQLite) — raw SQL via D1 binding API. No ORM or query builder.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Query approach | Raw D1 SQL | No build step dependency; schema is stable and complexity is low; D1's prepare/bind API is clean |
| Type definitions | `worker/src/db/schema.ts` — TypeScript interfaces matching D1 columns | Single source of truth for column names and types |
| Query helpers | `worker/src/db/queries/` — thin typed functions wrapping D1 calls | Prevents raw SQL duplication across route handlers |
| Migrations | `wrangler d1 migrations create/apply` — numbered SQL files in `/migrations/` | Staged: staging first, verified, then production |
| Caching | None in MVP — Cloudflare CDN handles static assets; D1 reads are fast | Add KV caching only if latency becomes measurable |

---

### Authentication & Security

| Decision | Choice | Rationale |
|----------|--------|-----------|
| JWT storage | `localStorage` | Alpine.js reads it directly; XSS risk mitigated by Worker-side HTML sanitization; httpOnly cookie adds complexity (CORS, refresh flow) for no clear gain on a single-operator platform |
| JWT signing | `JWT_SECRET` environment secret in Worker | HS256 via Web Crypto API |
| JWT expiry | 7 days | Balance between security and re-auth friction for a learning platform |
| Password hashing | Web Crypto API — PBKDF2 | Built-in to Workers runtime, zero dependencies, NIST-approved, no bcrypt compatibility issues |
| Admin auth | Same JWT with `role: "admin"` claim | One auth system. Admin routes check `jwt.role === 'admin'` before handler. No separate admin login. |
| Webhook security | Stripe: `stripe-signature` header HMAC verification. Cal.com: shared secret in header. Both verified before any business logic. | Standard webhook security pattern |
| HTML sanitization | Worker-side before D1 write — WYSIWYG output never trusted from client | Prevents stored XSS via lesson/blog content |
| Password reset | Secure random token (Web Crypto `getRandomValues`), stored in D1 with 1hr expiry, single-use | Standard reset token pattern |

---

### API & Communication Patterns

**HTTP Router:** [Hono](https://hono.dev) — TypeScript-first, Cloudflare Workers native, middleware support.

| Decision | Choice |
|----------|--------|
| Router | Hono (`hono/tiny` build for Workers) |
| Auth middleware | Hono middleware — reads `Authorization: Bearer <token>`, verifies JWT, attaches user to context |
| Admin middleware | Extends auth middleware — additionally checks `ctx.user.role === 'admin'`, returns 403 otherwise |
| Error response format | `{ "error": { "code": "SNAKE_CASE_CODE", "message": "Human readable message" } }` with appropriate HTTP status |
| Success response format | Direct JSON body (no wrapper) — `{ "user": {...} }` or `{ "courses": [...] }` |
| Date format in JSON | ISO 8601 strings: `"2026-02-17T01:23:00Z"` — never timestamps |
| API prefix | All Worker routes: `/api/...` — Pages serves everything else |
| Webhook routes | `/api/webhooks/stripe`, `/api/webhooks/cal` — signature verification runs first |
| Rate limiting | Cloudflare WAF rules on `/api/auth/login` and `/api/auth/register` — no custom Worker logic |
| SEO meta rendering | Worker intercepts `GET /blog/:slug` and `GET /courses/:slug` — fetches record from D1, injects `<title>`, `<meta>`, and OpenGraph tags into static HTML before response. All other routes served directly by Pages. |

---

### Encharge Tag Vocabulary

All Encharge automation is triggered by tag changes via `lib/encharge.ts`. No Ingest API events are used. Encharge flows use "Tag Added" as the trigger condition. `removeTag` must be called on state transitions to keep contacts out of multiple flows simultaneously.

| Lifecycle Event | Tag Added | Tag Removed | Encharge Flow Trigger |
|----------------|-----------|-------------|----------------------|
| User registers | `Lead` | — | "Tag Added: Lead" → Welcome sequence |
| Course purchased | `Customer`, `Course-[courseSlug]` | `Lead` | "Tag Added: Customer" → Course onboarding |
| Call booked | `Call-Booked` | — | "Tag Added: Call-Booked" → Pre-call nurture |
| Post-call follow-up | `Post-Call` | — | "Tag Added: Post-Call" → Proposal + payment link |
| Milestone 25% | `Milestone-25-[courseSlug]` | — | "Tag Added: Milestone-25-*" → Milestone email |
| Milestone 50% | `Milestone-50-[courseSlug]` | — | "Tag Added: Milestone-50-*" → Milestone email |
| Milestone 75% | `Milestone-75-[courseSlug]` | — | "Tag Added: Milestone-75-*" → Milestone email |
| Milestone 100% | `Milestone-100-[courseSlug]` | — | "Tag Added: Milestone-100-*" → Completion email |
| Payment failed | `Payment-Failed` | — | "Tag Added: Payment-Failed" → Dunning sequence |
| Cart abandoned | `Cart-Abandoned` | — | "Tag Added: Cart-Abandoned" → Recovery email (1hr) |
| Gone cold (re-engagement) | — | — | Encharge time-based segment — no Worker action needed |

**Milestone idempotency:** All milestone tags are guarded by the `milestones_sent` D1 table before the tag call fires. A contact is never re-tagged for the same milestone on the same course.

---

### Frontend Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Reactivity | Alpine.js (CDN import) | No build step; works with static HTML; sufficient for all interactions needed |
| Global state | `Alpine.store('auth', { user, token })` + `Alpine.store('theme', { mode })` | Session and theme must be accessible across components; all else is local |
| Dark mode persistence | `localStorage('theme')` — read on page load, applied as `[data-theme]` on `<html>` before paint | Prevents flash of wrong theme |
| WYSIWYG editor | Quill.js (CDN) | Simpler than TipTap, predictable HTML output, no build step, sufficient for lesson + blog editing |
| Admin routing | Hash-based: `window.addEventListener('hashchange')` in `admin.js` | No dependency, works with static HTML, simple to implement |
| Fetch pattern | `async/await fetch()` — Alpine `x-data` methods call Worker `/api/` endpoints, handle errors inline | No abstraction layer needed for this volume of requests |
| UTM capture | `utm.js` runs on every public page — captures params, stores in `localStorage('utm_first_touch')` — sent to Worker on registration | First-touch only; already in localStorage so survives navigation |

---

### Infrastructure & Deployment

| Decision | Choice |
|----------|--------|
| Frontend hosting | Cloudflare Pages — connected to GitHub repo, auto-deploys `public/` on push to `main` |
| Worker deployment | GitHub Actions `wrangler deploy` on push to `main` |
| Staging | Cloudflare Pages preview deployments + separate D1 `fotf-platform-staging` database |
| Branch strategy | `main` → production; feature branches → PR previews (Cloudflare Pages auto-creates preview URLs) |
| Secrets (production) | Cloudflare dashboard — Worker environment secrets: `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `EMAILIT_API_KEY`, `ENCHARGE_API_KEY`, `CAL_WEBHOOK_SECRET` |
| Secrets (staging) | `wrangler.toml` `[env.staging]` vars (non-sensitive test values only) |
| Observability | Cloudflare Workers Logs enabled from day one — all webhook failures and Stripe errors logged |
| Stripe failure alert | `payment_intent.payment_failed` webhook → Emailit admin alert email as part of event handler |
| R2 assets | Course cover images, blog cover images, static assets uploaded to R2; served via Cloudflare CDN |

---

## Implementation Patterns & Consistency Rules

### Naming Conventions

**Database — snake_case throughout:**

| Entity | Convention | Examples |
|--------|------------|---------|
| Tables | lowercase plural | `users`, `courses`, `lessons`, `lesson_progress`, `user_purchases`, `blog_posts`, `consultation_bookings`, `student_activity_log` |
| Columns | `snake_case` | `user_id`, `created_at`, `is_free_preview`, `content_html`, `cover_image_url` |
| Foreign keys | `{singular_table}_id` | `course_id`, `user_id`, `lesson_id` |
| Booleans | SQLite `INTEGER` (0/1), TypeScript `boolean` | `is_free_preview`, `published` |
| Timestamps | `TEXT` — ISO 8601 | `"2026-02-17T01:23:00.000Z"` |
| Indexes | `idx_{table}_{column}` | `idx_users_email`, `idx_lessons_course_id` |

**API endpoints — REST, plural nouns, kebab-case:**

```
GET    /api/courses                    → list courses
GET    /api/courses/:id                → single course
POST   /api/courses                    → create course (admin)
PATCH  /api/courses/:id               → update course (admin)
POST   /api/lessons/:id/complete       → mark lesson complete (student)
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/reset-password
POST   /api/webhooks/stripe
POST   /api/webhooks/cal
GET    /api/admin/students             → admin-only
```

**TypeScript (Worker):**
- Variables + functions: `camelCase` — `userId`, `getCourseById`, `handleStripeWebhook`
- Types/interfaces: `PascalCase` — `User`, `Course`, `LessonProgress`, `ApiError`
- Constants: `SCREAMING_SNAKE_CASE` — `JWT_EXPIRY_SECONDS`
- Files: `kebab-case` — `stripe.ts`, `auth-middleware.ts`

**Frontend:**
- JS functions/vars: `camelCase`
- CSS classes: `kebab-case` — `course-card`, `lesson-player`, `journey-path-map`
- CSS tokens: `--kebab-case` — `--accent-primary`, `--shadow-md`
- HTML files: `kebab-case` — `course-detail.html`, `lesson-player.html`

---

### API Response Format

All Worker responses follow these exact shapes — no variations:

```json
// Success — direct body, no envelope wrapper
{ "id": 1, "title": "...", "slug": "..." }
{ "courses": [...] }
{ "token": "eyJ..." }

// Error — always this envelope
{ "error": { "code": "NOT_FOUND", "message": "Course not found" } }
{ "error": { "code": "UNAUTHORIZED", "message": "Valid session required" } }
{ "error": { "code": "VALIDATION_ERROR", "message": "Email is required" } }
```

**Standard error codes:** `UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` · `VALIDATION_ERROR` · `CONFLICT` · `INTERNAL_ERROR` · `PAYMENT_FAILED` · `WEBHOOK_INVALID`

**Date format:** ISO 8601 always — `"2026-02-17T01:23:00.000Z"`. Never Unix timestamps.

---

### Worker Route Handler Pattern

Every route handler MUST follow this execution order:

```typescript
// 1. Verify auth / webhook signature
// 2. Parse + validate request body
// 3. Execute business logic
// 4. Write to D1
// 5. Fire Emailit (fire-and-forget — never awaited)
// 6. Fire Encharge (fire-and-forget — never awaited)
// 7. Return response

app.post('/api/lessons/:id/complete', authMiddleware, async (ctx) => {
  const { id } = ctx.req.param()
  const userId = ctx.user.id

  // business logic + D1 write
  await ctx.env.DB.prepare(
    'INSERT OR IGNORE INTO lesson_progress (user_id, lesson_id, completed_at) VALUES (?, ?, ?)'
  ).bind(userId, id, new Date().toISOString()).run()

  // fire-and-forget — email failures must never block response
  ctx.executionCtx.waitUntil(encharge.addTag(ctx.env, ctx.user.email, `Progress-Lesson-${id}`))

  return ctx.json({ success: true })
})
```

**Email/Encharge calls are always `waitUntil()` — never `await`.** A failure in email must never block the primary response.

---

### Error Handling Pattern

```typescript
// All route handlers wrapped in try/catch at the Hono app level
app.onError((err, ctx) => {
  console.error('[Worker Error]', err)  // logs to Cloudflare Workers Logs
  return ctx.json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }, 500)
})

// Never expose: stack traces, internal error messages, DB query details
// Always log: error object to Workers Logs before returning 500
```

---

### Frontend Alpine.js Async Pattern

All `fetch()` calls use this exact shape — no variations:

```js
async submitForm() {
  this.loading = true
  this.error = null
  try {
    const res = await fetch('/api/...', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Alpine.store('auth').token}` },
      body: JSON.stringify(this.formData)
    })
    const data = await res.json()
    if (!res.ok) { this.error = data.error.message; return }
    // success path
  } catch (e) {
    this.error = 'Something went wrong. Please try again.'
  } finally {
    this.loading = false
  }
}
```

**Loading states:**
- Buttons: `disabled` + spinner SVG replaces label text during async ops
- Content areas: skeleton screen CSS blocks (never a spinner alone)
- Page transitions: thin 2px blue progress bar at top of viewport

---

### All AI Agents MUST:

1. Use `snake_case` for all D1 column names and table names — no exceptions
2. Use `kebab-case` for API endpoint paths — not camelCase, not underscores
3. Return `{ "error": { "code": "...", "message": "..." } }` for all error responses
4. Use `waitUntil()` for all Emailit and Encharge calls — never `await`
5. Sanitize all WYSIWYG HTML in the Worker before writing to D1
6. Store and return all dates as ISO 8601 strings
7. Verify webhook signatures BEFORE executing any business logic
8. Never expose internal error details in API responses
9. Use `Alpine.store('auth')` for session state — never a custom global variable
10. Apply `[data-theme="dark"]` on `<html>` — not on individual components

---

## Project Structure & Boundaries

### Requirements → Structure Mapping

| Functional Domain | Worker routes | Frontend files | DB tables |
|-------------------|--------------|----------------|-----------|
| Auth | `routes/auth.ts` | `login.html`, `register.html`, `reset-password.html`, `js/auth.js` | `users` |
| Courses & Lessons | `routes/courses.ts`, `routes/lessons.ts` | `courses/index.html`, `courses/_template.html`, `dashboard/lesson.html`, `js/components/lesson-player.js` | `courses`, `lessons`, `lesson_progress` |
| Student Dashboard | `routes/dashboard.ts` | `dashboard/index.html`, `js/components/journey-map.js`, `js/components/streak-counter.js` | `users`, `lesson_progress`, `user_purchases`, `student_activity_log` |
| Blog | `routes/blog.ts` (SEO meta injection) | `blog/index.html`, `blog/_template.html` | `blog_posts` |
| Services / Cal.com | `routes/webhooks/cal.ts` | `services.html` | `consultation_bookings`, `student_activity_log` |
| Payments / Stripe | `routes/webhooks/stripe.ts`, `lib/stripe.ts` | `success.html` | `user_purchases` |
| Email | `lib/emailit.ts`, `lib/encharge.ts` | — | — |
| Admin | `routes/admin/*.ts` | `admin/index.html`, `admin/admin.js` | all tables (read/write) |
| Journey Tracking | `routes/auth.ts` (UTM on register), `routes/webhooks/stripe.ts` (UTM on purchase) | `js/utm.js` | `users` (first_touch_*), `user_purchases` (attribution_*) |

---

### Architectural Boundaries

**Boundary 1 — Public vs. Authenticated:**
All `/api/*` routes requiring auth verify `Authorization: Bearer <token>`. Admin routes additionally enforce `role === 'admin'`. Frontend `auth.js` checks `Alpine.store('auth').token` on page load — redirects to `/login.html` if absent on protected pages.

**Boundary 2 — Worker vs. Pages:**
- `/api/*` → Cloudflare Worker handles entirely
- `/blog/:slug` and `/courses/:slug` → Worker intercepts, injects SEO meta into static HTML, returns augmented response
- Everything else → Cloudflare Pages serves static files directly

**Boundary 3 — Stripe abstraction:**
All Stripe SDK calls go through `worker/src/lib/stripe.ts` only. Route handlers call `stripe.createCheckoutSession()`, `stripe.verifyWebhook()` — never call Stripe SDK directly. Processor swap (LemonSqueezy, Paddle) requires only replacing `lib/stripe.ts`.

**Boundary 4 — Email abstraction:**
All Emailit calls through `lib/emailit.ts`. All Encharge interactions through `lib/encharge.ts`. Route handlers call typed methods (e.g. `emailit.sendWelcome()`, `encharge.addTag(env, email, 'Customer')`) — never raw HTTP calls inline.

**Encharge LTD constraint:** The event-based Ingest API is not available. `lib/encharge.ts` exposes three methods only:
- `upsertContact(env, { email, firstName?, lastName?, fields? })` — create or update a contact
- `addTag(env, email, tag)` — add a tag; Encharge flows trigger on "Tag Added"
- `removeTag(env, email, tag)` — remove a tag; call when contact transitions states (e.g. remove `Lead` when `Customer` is added) to keep segments clean and prevent contacts from entering multiple flows simultaneously

---

### Key Data Flows

**Student Registration:**
```
POST /api/auth/register
  → Validate → Hash password (PBKDF2)
  → INSERT users (with first_touch UTMs from body)
  → [waitUntil] emailit.sendWelcome()
  → [waitUntil] encharge.upsertContact(env, { email, firstName })
  → [waitUntil] encharge.addTag(env, email, 'Lead')  ← triggers welcome sequence in Encharge
  → Return JWT
```

**Course Purchase (Stripe webhook):**
```
POST /api/webhooks/stripe  [checkout.session.completed]
  → Verify stripe-signature
  → INSERT user_purchases (with last_touch attribution)
  → INSERT student_activity_log (course_purchased)
  → [waitUntil] emailit.sendReceipt()
  → [waitUntil] encharge.addTag(env, email, 'Customer')
  → [waitUntil] encharge.addTag(env, email, 'Course-[courseSlug]')  ← triggers onboarding sequence
  → [waitUntil] encharge.removeTag(env, email, 'Lead')  ← keeps segments clean, prevents double-flow
  → Return 200
```

**Lesson Completion:**
```
POST /api/lessons/:id/complete
  → Auth middleware
  → INSERT OR IGNORE lesson_progress
  → Calculate course progress %
  → INSERT student_activity_log (lesson_completed)
  → UPDATE users.login_streak if needed
  → [waitUntil] encharge.addTag(env, email, 'Milestone-[threshold]-[courseSlug]')  ← if threshold crossed, guarded by milestones_sent table
  → Return { progress, streak, nextLessonId }
```

**SEO Meta Injection (blog/courses):**
```
GET /blog/:slug  [Worker intercepts]
  → SELECT post FROM blog_posts WHERE slug = ?
  → Load blog/_template.html
  → Inject <title>, <meta description>, <og:*> tags
  → Return modified HTML
```

---

### Complete Project Tree

```
fotf-platform/
├── README.md
├── .gitignore
│
├── worker/
│   ├── package.json
│   ├── tsconfig.json
│   ├── wrangler.toml
│   └── src/
│       ├── index.ts                        ← Hono app, route registration
│       ├── middleware/
│       │   ├── auth.ts                     ← JWT verify, attach ctx.user
│       │   └── admin.ts                    ← role === 'admin' guard
│       ├── routes/
│       │   ├── auth.ts                     ← register, login, reset-password
│       │   ├── courses.ts                  ← list, detail + SEO meta injection
│       │   ├── lessons.ts                  ← detail + SEO meta, complete
│       │   ├── blog.ts                     ← list, detail + SEO meta injection
│       │   ├── dashboard.ts                ← progress, streak, activity feed
│       │   ├── webhooks/
│       │   │   ├── stripe.ts               ← checkout.session.completed, payment_intent.payment_failed
│       │   │   └── cal.ts                  ← BOOKING_CREATED/CANCELLED/RESCHEDULED
│       │   └── admin/
│       │       ├── courses.ts              ← CRUD courses + lessons
│       │       ├── blog.ts                 ← CRUD blog posts
│       │       ├── students.ts             ← list, profile, journey timeline
│       │       └── analytics.ts            ← revenue attribution report
│       ├── lib/
│       │   ├── stripe.ts                   ← Stripe abstraction (processor-agnostic)
│       │   ├── emailit.ts                  ← Transactional email (6 types)
│       │   ├── encharge.ts                 ← Lifecycle automation (tag-based REST API: upsertContact, addTag, removeTag)
│       │   ├── auth.ts                     ← JWT sign/verify, PBKDF2 hash/verify
│       │   └── sanitize.ts                 ← HTML sanitization
│       └── db/
│           ├── schema.ts                   ← TypeScript interfaces for all tables
│           └── queries/
│               ├── users.ts
│               ├── courses.ts
│               ├── lessons.ts
│               ├── blog.ts
│               └── activity.ts
│
├── public/
│   ├── index.html                          ← Marketing homepage
│   ├── courses/
│   │   ├── index.html                      ← Course catalog
│   │   └── _template.html                  ← Course detail (SEO meta injected by Worker)
│   ├── blog/
│   │   ├── index.html                      ← Blog listing
│   │   └── _template.html                  ← Blog post (SEO meta injected by Worker)
│   ├── dashboard/
│   │   ├── index.html                      ← Student dashboard
│   │   └── lesson.html                     ← Lesson player
│   ├── services.html
│   ├── login.html
│   ├── register.html
│   ├── reset-password.html
│   ├── success.html                        ← Post-purchase confirmation
│   ├── admin/
│   │   ├── index.html                      ← Admin shell
│   │   └── admin.js                        ← Hash router + all admin view components
│   ├── css/
│   │   ├── tokens.css                      ← Design tokens (light + dark mode)
│   │   ├── main.css
│   │   ├── dashboard.css
│   │   ├── blog.css
│   │   └── admin.css
│   └── js/
│       ├── utm.js                          ← UTM capture → localStorage
│       ├── auth.js                         ← Session init, redirect guards
│       ├── theme.js                        ← Dark mode toggle + persistence
│       └── components/
│           ├── journey-map.js              ← Journey Path Map Alpine component
│           ├── lesson-player.js            ← Player + Mark Complete + Launch Ritual
│           ├── streak-counter.js
│           ├── milestone-toast.js
│           └── soft-gate.js                ← Registration overlay
│
├── migrations/
│   ├── 0001_initial_schema.sql
│   └── 0002_indexes.sql
│
└── .github/
    └── workflows/
        ├── deploy-worker.yml               ← wrangler deploy on push to main
        └── deploy-pages.yml                ← Cloudflare Pages auto-deploys
```

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision compatibility:** All technology choices are mutually compatible. Alpine.js + static HTML + no build step is a coherent unit. Hono on Workers + D1 raw SQL + TypeScript is a well-documented, production-proven combination. PBKDF2 via Web Crypto API is native to the Workers runtime. CSS custom properties for neumorphic dark mode has no framework conflicts. Quill.js CDN import produces predictable HTML for Worker-side sanitization.

**Pattern consistency:** Naming conventions are non-overlapping by layer (`snake_case` → DB, `camelCase` → TypeScript, `kebab-case` → CSS/HTML/API paths). `waitUntil()` for all email/automation is consistent across all 15 triggers. ISO 8601 dates are consistent from D1 storage through every API response.

**Structure alignment:** `/worker/src/lib/` enforces abstraction boundaries for Stripe, Email, and Auth. `/worker/src/routes/admin/` is cleanly separated from student routes with its own middleware. `js/components/` Alpine components are scoped and independently reusable.

### Requirements Coverage Validation ✅

| Domain | Covered | Location |
|--------|---------|----------|
| Auth | ✅ | `routes/auth.ts`, PBKDF2, JWT |
| Courses & Lessons | ✅ | `routes/courses.ts`, `routes/lessons.ts` |
| Student Dashboard | ✅ | `routes/dashboard.ts`, journey-map, streak components |
| Blog | ✅ | `routes/blog.ts`, SEO meta injection |
| Services + Cal.com | ✅ | `routes/webhooks/cal.ts`, `services.html` |
| Stripe Payments | ✅ | `routes/webhooks/stripe.ts`, `lib/stripe.ts` |
| Dual Email | ✅ | `lib/emailit.ts` (6 types) + `lib/encharge.ts` (9 triggers) |
| Admin Dashboard | ✅ | `routes/admin/*`, `admin.js` hash router, CRM |
| UTM Attribution | ✅ | `js/utm.js`, schema fields on `users` + `user_purchases` |
| GTM Data Layer | ✅ | Client-side `dataLayer.push()` from Alpine components |
| Performance (speed) | ✅ | Static HTML + Cloudflare CDN, skeleton screens |
| WCAG 2.1 AA | ✅ | aria-* requirements in component specs, UX spec |
| SEO | ✅ | Worker meta injection (dynamic), static meta (other) |
| Security | ✅ | PBKDF2, JWT, webhook sig verification, HTML sanitization |
| Observability | ✅ | Workers Logs + Stripe failure admin alert |

### Gap Analysis

**Critical gaps:** None.

**Open questions resolved:**
- Quill.js vs TipTap → **Quill.js** ✅
- SEO on static HTML with dynamic content → **Worker SSR meta injection** ✅
- JWT storage → **localStorage** (XSS risk mitigated by sanitization) ✅

**Deferred (not blocking MVP):**
- Vitest test file location: co-locate `*.test.ts` alongside source files in `worker/src/`
- D1 caching: add only if latency measured as a problem
- D1 read replicas: Phase 3

### Architecture Completeness Checklist

- [x] Project context analyzed and documented
- [x] Scale and complexity assessed (medium, full-stack)
- [x] Technical constraints identified (Cloudflare-locked, no build step)
- [x] Cross-cutting concerns mapped (9 concerns)
- [x] Critical decisions documented (router, auth, passwords, WYSIWYG, SEO)
- [x] Technology stack fully specified with rationale
- [x] Implementation patterns defined (naming, error format, async pattern)
- [x] Naming conventions established across all layers
- [x] Process patterns documented (route handler order, error handling)
- [x] Complete project directory tree defined
- [x] Component boundaries established (4 boundaries)
- [x] Requirements → structure mapping complete (9 domains)
- [x] Key data flows documented (4 critical flows)
- [x] AI agent enforcement rules documented (10 mandatory rules)

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High** — Stack is locked, decisions are coherent, all requirements covered, patterns are concrete and enforceable.

**Key strengths:**
- Full Cloudflare stack eliminates infrastructure complexity — one control plane for hosting, DB, storage, and CDN
- No build step means zero toolchain issues — frontend is always deployable
- Abstraction boundaries (Stripe, Email) ensure future flexibility without touching business logic
- Worker-side SEO meta injection solves the static HTML + dynamic content problem cleanly
- The 10 mandatory agent rules prevent the most common divergence patterns

**Areas for future enhancement (post-revenue):**
- D1 read replicas and activity log archiving (Phase 3)
- Community layer DB schema extensions (Phase 2)
- Subscription pricing model integration (Phase 2)
- Paid discovery call tier (Phase 2)

### Implementation Handoff

**AI Agent Guidelines:**
- This document is the single source of truth for all technical decisions
- Follow the 10 mandatory rules in "Implementation Patterns" without exception
- Use the project directory tree as the authoritative file location reference
- Refer to data flows when implementing webhook handlers — sequence matters
- Any decision not covered here: bias toward the patterns established in this document

**First implementation step:**
```bash
npm create cloudflare@latest worker -- --type=hello-world --lang=ts --no-deploy
wrangler d1 create fotf-platform-staging
wrangler d1 create fotf-platform-production
```

---
