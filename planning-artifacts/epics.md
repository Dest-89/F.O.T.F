---
stepsCompleted: [1, 2, 3, 4]
status: complete
completedAt: '2026-02-17'
inputDocuments: ['planning-artifacts/prd.md', 'planning-artifacts/architecture.md', 'planning-artifacts/ux-design-specification.md']
---

# Direct Marketing Mastery School - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Direct Marketing Mastery School, decomposing requirements from the PRD, Architecture, and UX Design Specification into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Users can register with email + password; system sends Emailit welcome email and triggers Encharge welcome sequence
FR2: Users can log in and receive a JWT session token via Cloudflare Worker
FR3: Users can request a password reset via Emailit transactional email with a secure token
FR4: Protected routes (course content, dashboard, admin) require a valid JWT session; student and admin roles separated
FR5: Courses have title, slug, description, cover image, price, and published status
FR6: Lessons have title, slug, HTML content (Quill.js), video_url (separate field), order, free preview flag, and published status
FR7: Lesson completions are recorded in lesson_progress table with timestamps
FR8: 3+ lessons per course are accessible without purchase as free previews (lead magnet)
FR9: Visual curriculum map displays the full learning path across all courses (Research → Traffic → Funnels → Email → Advanced)
FR10: Student dashboard — Welcome Bar: name, last seen date, login streak counter
FR11: Student dashboard — My Journey: visual progress map across the full marketing stack modules
FR12: Student dashboard — My Courses: progress bars, Continue Learning CTA, completion badges, last accessed date
FR13: Student dashboard — Recent Activity: lessons completed, courses started, login streak (light gamification)
FR14: Student dashboard — Unlock More: locked courses with free preview access and Stripe upsell CTA
FR15: Student dashboard — Work With Me: Cal.com booking button always visible; shown again on course completion
FR16: Student dashboard — Latest From Blog: 3 most recently published posts
FR17: Blog articles have title, slug, excerpt, HTML body, cover image, published date, and SEO meta fields; public, no auth required
FR18: Blog listing page (GET /blog) and article page (GET /blog/:slug) available publicly
FR19: 5+ blog posts required before launch; SEO from day one (meta tags, sitemap, clean slugs on all public pages)
FR20: Static /services page with three consulting tiers clearly defined (Group Program, 1-on-1 Intensive, Done-With-You Retainer)
FR21: Cal.com embed on /services page for direct booking
FR22: Cal.com webhook handler at POST /api/webhooks/cal handles BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED
FR23: On booking: log to D1 (consultation_bookings), log to student_activity_log, send Emailit confirmation, trigger Encharge pre-call sequence
FR24: Post-call: manual trigger sends Encharge post-call follow-up + Stripe payment link
FR25: Stripe Checkout for course purchases (one-time payment)
FR26: Stripe webhook at POST /api/webhooks/stripe handles checkout.session.completed and payment_intent.payment_failed
FR27: On successful payment: grant course access, send Emailit receipt, trigger Encharge course onboarding sequence
FR28: On payment failure: trigger Encharge dunning sequence and send Emailit admin alert
FR29: Stripe payment logic isolated in /worker/src/lib/stripe.ts (processor-agnostic abstraction)
FR30: Emailit transactional emails: registration confirmation, password reset, course purchase receipt, booking confirmation, cancellation notice, payment failure admin alert
FR31: Encharge lifecycle automation: welcome + onboarding, course onboarding, progress milestones (25/50/75%), course completion, re-engagement (day 3/7/14), pre-call nurture, post-call follow-up, dunning, win-back/offboarding — **implemented via tag-based REST API only** (LTD plan; Ingest API event-tracking is not available); all flows trigger on "Tag Added" conditions in Encharge's flow builder
FR32: Admin can create, edit, and publish/unpublish courses and lessons
FR33: Admin can create, edit, and publish blog posts
FR34: Admin can view Student CRM: student list, individual profile, journey timeline, purchase history
FR35: Admin can view revenue attribution report (revenue by traffic source and campaign)
FR36: Admin can view basic analytics: registrations, purchases, active students
FR37: JavaScript captures UTM parameters on first visit and stores in localStorage (utm.js)
FR38: On registration: first-touch UTMs sent to Worker and stored on users record
FR39: On purchase: last-touch UTMs stored on user_purchases record
FR40: GTM data layer pushes events: page_view, user_registered, lesson_viewed, lesson_completed, course_purchased, consultation_booked, cta_clicked

### NonFunctional Requirements

NFR1: Performance — near-instant page loads via static HTML served through Cloudflare CDN
NFR2: Accessibility — WCAG 2.1 Level AA throughout; VoiceOver + keyboard-only navigation; Lighthouse a11y score ≥ 90
NFR3: SEO — meta tags, OpenGraph, Twitter Card, canonical URLs, XML sitemap on all public pages from day one
NFR4: Security — JWT auth, PBKDF2 password hashing, sanitized WYSIWYG HTML output in Worker, Stripe webhook signature verification
NFR5: Observability — Cloudflare observability enabled from day one; Stripe payment failures trigger admin Emailit alert
NFR6: Scalability — D1 indexes from day one; 90-day activity log retention policy; D1 read replicas planned for Phase 3
NFR7: Responsive — mobile-first CSS; works across mobile (320px+), tablet (768px+), desktop (1024px+)
NFR8: Browser support — Safari on macOS/iOS (P1), Chrome on macOS/Android (P1), Firefox (P2)
NFR9: Dark mode as primary theme; light mode toggle available; preference persisted in localStorage
NFR10: No offline or native app — web-first, mobile-responsive only

### Additional Requirements

**From Architecture:**
- Starter template: `npm create cloudflare@latest worker -- --type=hello-world --lang=ts --no-deploy` (informs Epic 1 Story 1)
- D1 initialization: `wrangler d1 create fotf-platform-staging` + `wrangler d1 create fotf-platform-production`
- GitHub → Cloudflare Pages CI/CD (`deploy.yml`) required from day one
- Staging environment for D1 migration verification before every production deploy
- Hono selected as HTTP router for the Worker
- JWT stored in localStorage; Admin auth uses JWT with `role` claim
- Raw D1 SQL — no ORM or query builder
- WYSIWYG editor: Quill.js (decided — not TipTap)
- Worker SSR for SEO meta tag injection only (not full server-side rendering)
- Stripe + Cal.com webhook signature validation must execute before any business logic
- HTML sanitization in Worker using sanitize.ts before storing Quill output in D1
- Alpine.store() for global session + theme state; local x-data for component-level state

**From UX Design:**
- Mobile-first CSS; CSS Grid for page layout, Flexbox for component internals; no CSS framework
- Fluid type via clamp() — no breakpoint typography changes
- Skeleton screens mandated for all async loading states — no spinners
- One primary action per screen rule enforced across all pages
- Gold --accent-secondary button reserved exclusively for the "Launch It" action
- Active nav states use inset neumorphic shadows (not color change)
- Modals restricted to exactly 3 use cases: Launch Ritual confirmation, Soft Gate (course purchase overlay), destructive admin confirmations
- Form validation triggers on blur; submit button disabled until all required fields valid
- Skip link ("Skip to main content") required on every page
- aria-live="polite" on progress updates and toast notifications
- prefers-reduced-motion media query disables all transitions and animations
- Touch targets minimum 44×44px on all interactive elements
- Design token system: CSS vars for neumorphic shadows, dark mode via [data-theme="dark"] on <html>

### FR Coverage Map

FR1: Epic 3 — User registration with email + password
FR2: Epic 3 — JWT login flow
FR3: Epic 3 — Password reset with Emailit
FR4: Epic 3 — Protected routes + admin/student role separation
FR5: Epic 4 — Course model (title, slug, description, cover, price, published)
FR6: Epic 4 — Lesson model (content, video_url, order, free preview flag)
FR7: Epic 4 — Lesson progress tracking (lesson_progress table)
FR8: Epic 4 — Free preview lessons (no auth required)
FR9: Epic 4 — Journey Path Map (visual curriculum map)
FR10: Epic 6 — Dashboard: Welcome Bar (name, last seen, streak)
FR11: Epic 6 — Dashboard: My Journey (visual progress map)
FR12: Epic 6 — Dashboard: My Courses (progress bars, Continue CTA, badges)
FR13: Epic 6 — Dashboard: Recent Activity feed + streak
FR14: Epic 6 — Dashboard: Unlock More (locked courses + upsell CTA)
FR15: Epic 6 — Dashboard: Work With Me (Cal.com CTA)
FR16: Epic 6 — Dashboard: Latest From Blog (3 posts)
FR17: Epic 2 — Blog article model + public pages
FR18: Epic 2 — Blog listing and article routes
FR19: Epic 2 — SEO meta injection + sitemap + slug structure
FR20: Epic 7 — /services page with three consulting tiers
FR21: Epic 7 — Cal.com embed on services page
FR22: Epic 7 — Cal.com webhook handler (BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED)
FR23: Epic 7 — Booking: D1 log + activity log + Emailit confirmation + Encharge pre-call
FR24: Epic 7 — Post-call: Encharge follow-up + Stripe payment link (manual trigger)
FR25: Epic 5 — Stripe Checkout session creation (one-time)
FR26: Epic 5 — Stripe webhook handler (checkout.session.completed, payment_intent.payment_failed)
FR27: Epic 5 — Purchase success: grant access + Emailit receipt + Encharge course onboarding
FR28: Epic 5 — Payment failure: Encharge dunning + Emailit admin alert
FR29: Epic 5 — Stripe abstraction in /worker/src/lib/stripe.ts
FR30: Epic 3 (registration + password reset) | Epic 5 (receipt + admin alert) | Epic 7 (booking + cancellation)
FR31: Epic 3 (welcome) | Epic 5 (course onboarding + dunning + win-back) | Epic 6 (milestones + re-engagement) | Epic 7 (pre-call + post-call)
FR32: Epic 8 — Admin course + lesson CRUD
FR33: Epic 8 — Admin blog post CRUD
FR34: Epic 9 — Admin Student CRM (list, profile, journey timeline, purchase history)
FR35: Epic 9 — Admin revenue attribution report (by source/campaign)
FR36: Epic 9 — Admin basic analytics (registrations, purchases, active students)
FR37: Epic 3 — utm.js: UTM capture on first visit → localStorage
FR38: Epic 3 — First-touch UTMs sent to Worker on registration → stored on users record
FR39: Epic 5 — Last-touch UTMs stored on user_purchases on purchase
FR40: Epic 9 — GTM data layer events (all 7 types) wired across platform

## Epic List

### Epic 1: Platform Foundation
A live, deployable platform exists with the F.O.T.F. brand design system, Cloudflare infrastructure initialized, CI/CD pipeline running, and the D1 database schema established — ready for all subsequent epics to build upon.
**FRs covered:** NFR1, NFR5, NFR6, NFR7, NFR9 (non-functional foundation)
**Additional requirements addressed:** Starter template init, D1 staging + production creation, GitHub → Cloudflare Pages CI/CD, design token system (neumorphic CSS vars, dark mode), base HTML page templates

### Epic 2: Blog & Public Discovery
Visitors can read marketing education articles on a fast, SEO-optimized blog — establishing organic traffic and credibility before they ever register.
**FRs covered:** FR17, FR18, FR19
**NFRs:** NFR3 (SEO — meta tags, sitemap, clean slugs, OpenGraph)

### Epic 3: User Authentication
Users can securely register for an account, sign in, and reset their password — with first-touch attribution captured on registration and the email infrastructure library established for all future epics.
**FRs covered:** FR1, FR2, FR3, FR4, FR37, FR38, FR30 (registration + password reset emails), FR31 (welcome sequence)
**NFRs:** NFR4 (security — PBKDF2, JWT, sanitization)

### Epic 4: Course & Lesson Access
Students can browse the course catalog, access free preview lessons without purchasing, complete lessons, track progress, and see the full curriculum map showing their learning journey ahead.
**FRs covered:** FR5, FR6, FR7, FR8, FR9

### Epic 5: Payments & Enrollment
Students can purchase courses with Stripe, receive confirmation, and gain immediate access — with last-touch attribution recorded and automated email sequences triggered on both success and failure.
**FRs covered:** FR25, FR26, FR27, FR28, FR29, FR39, FR30 (receipt + admin alert), FR31 (course onboarding + dunning + win-back)
**NFRs:** NFR4 (Stripe webhook signature verification)

### Epic 6: Student Dashboard
Enrolled students have a personalized home — tracking streak, progress across the full marketing stack, recent activity, locked course upsells, a persistent consulting CTA, and fresh blog content — all in one place.
**FRs covered:** FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR31 (progress milestones + re-engagement sequences)

### Epic 7: Consulting & Booking
Prospects can read about consulting tiers and book a discovery call — triggering D1 logging, Emailit confirmations, and Encharge nurture sequences automatically.
**FRs covered:** FR20, FR21, FR22, FR23, FR24, FR30 (booking + cancellation emails), FR31 (pre-call + post-call sequences)

### Epic 8: Admin Content Management
The admin can create, edit, and publish courses, lessons, and blog posts — giving the platform its content without relying on any external CMS.
**FRs covered:** FR32, FR33

### Epic 9: Admin CRM & Analytics
The admin can view every student's full journey from first visit to purchase, understand which traffic sources drive revenue, and track platform health metrics — making data-driven decisions without leaving the dashboard.
**FRs covered:** FR34, FR35, FR36, FR40

---

## Epic 1: Platform Foundation

A live, deployable platform exists with the F.O.T.F. brand design system, Cloudflare infrastructure initialized, CI/CD pipeline running, and the D1 database ready for all subsequent epics to build upon.

### Story 1.1: Initialize Cloudflare Project Infrastructure

As a developer,
I want the full project scaffolded with Cloudflare Worker (TypeScript + Hono), D1 databases (staging + production), R2 storage, and GitHub → Cloudflare Pages CI/CD configured,
So that every subsequent feature can be built and deployed to real infrastructure from the first commit.

**Acceptance Criteria:**

**Given** the project root is empty,
**When** `npm create cloudflare@latest worker -- --type=hello-world --lang=ts --no-deploy` is run,
**Then** a `/worker` directory exists with `src/index.ts`, `wrangler.toml`, `package.json`, and `tsconfig.json`
**And** Hono is installed as the Worker HTTP router (`npm install hono`)

**Given** the Worker is scaffolded,
**When** `wrangler d1 create fotf-platform-staging` and `wrangler d1 create fotf-platform-production` are run,
**Then** both D1 database IDs are configured in `wrangler.toml` under `[[d1_databases]]` with correct binding names

**Given** the D1 databases are configured,
**When** `wrangler r2 bucket create fotf-platform-assets-staging` and `wrangler r2 bucket create fotf-platform-assets-production` are run,
**Then** both R2 bucket names are configured in `wrangler.toml` under `[[r2_buckets]]` with binding name `ASSETS` — cover images for courses and blog posts are stored here

**Given** the project directory structure is set up,
**When** the tree is inspected,
**Then** `/worker/src/`, `/public/`, `/migrations/`, and `.github/workflows/` directories all exist as specified in the Architecture document

**Given** the project is connected to GitHub,
**When** a push to `main` occurs,
**Then** `.github/workflows/deploy.yml` triggers Cloudflare Pages deployment of `/public` and Worker deployment via `wrangler deploy` — both completing without errors

**Given** secrets are required (`STRIPE_SECRET_KEY`, `EMAILIT_API_KEY`, `ENCHARGE_API_KEY`, `JWT_SECRET`),
**When** all committed files are inspected,
**Then** none of these secret values exist in any committed file — all are configured via Cloudflare dashboard or `wrangler secret put`

**Given** the platform requires admin access from day one,
**When** migration `0001_admin_seed.sql` is applied via `wrangler d1 execute`,
**Then** a single admin user record exists in the `users` table with `role: "admin"` and a PBKDF2-hashed password — credentials are documented in a local `.env.local` file that is `.gitignore`d and never committed
**And** no plaintext password exists in any migration file or committed code

---

### Story 1.2: Implement Design Token System & Dark Mode

As a visitor,
I want the platform to render with the F.O.T.F. neumorphic brand aesthetic in dark mode by default, with a toggleable light mode that persists across sessions,
So that the visual identity feels premium and consistent from the very first page load.

**Acceptance Criteria:**

**Given** `/public/css/tokens.css` is loaded,
**When** any page is inspected,
**Then** CSS variables are defined for both `[data-theme="dark"]` and `[data-theme="light"]`, including `--bg`, `--surface`, `--shadow-dark`, `--shadow-light`, `--accent-primary` (#4b6cb7), `--accent-secondary`, `--text-primary`, `--text-muted`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`

**Given** a fresh visit with no stored preference,
**When** the page loads,
**Then** `<html data-theme="dark">` is set by default and the dark theme variables apply globally

**Given** the dark theme is active,
**When** text contrast is measured against the background,
**Then** the contrast ratio is ≥ 12:1 for primary text and ≥ 4.5:1 for all secondary text (WCAG AA)

**Given** the user clicks the theme toggle (Alpine.js),
**When** the toggle fires,
**Then** `[data-theme]` on `<html>` switches between `dark` and `light` and the preference is saved to `localStorage`

**Given** the user returns on a subsequent visit,
**When** the page loads,
**Then** the theme is restored from `localStorage` without flash

**Given** `@media (prefers-reduced-motion: reduce)` is active on the device,
**When** any page loads,
**Then** all CSS transitions and animations are disabled via the media query override

---

### Story 1.3: Build Base HTML Shell & Navigation

As a visitor,
I want every page to have a consistent, accessible navigation header and semantic layout that works on any device,
So that I can find my way around the platform without friction.

**Acceptance Criteria:**

**Given** any public page is visited,
**When** the page loads,
**Then** a `<nav>` element is present with the F.O.T.F. logo and links to Blog, Courses, Services, and Login/Register

**Given** the viewport is ≥ 1024px,
**When** the navigation renders,
**Then** all nav links are fully visible in a horizontal bar with no hamburger icon

**Given** the viewport is < 768px,
**When** the page loads,
**Then** navigation collapses to a hamburger icon; tapping it triggers an Alpine.js toggle showing a full-screen overlay menu

**Given** any page loads,
**When** keyboard focus enters the page (Tab key),
**Then** a "Skip to main content" link is the first focusable element and becomes visible on focus

**Given** any page is inspected,
**When** the HTML structure is reviewed,
**Then** `<header>`, `<nav>`, `<main>`, and `<footer>` semantic elements are all present with correct ARIA roles and attributes

**Given** Playfair Display + Inter are the defined typefaces,
**When** any page renders,
**Then** headings (h1–h3) use Playfair Display and body/UI text uses Inter — loaded via Google Fonts

**Given** the page is viewed on mobile (320px) through desktop (1440px),
**When** the viewport is resized,
**Then** CSS Grid handles page-level layout and Flexbox handles component internals — no horizontal scroll at any breakpoint

---

## Epic 2: Blog & Public Discovery

Visitors can discover the platform through search engines, browse the blog, and read marketing education articles — establishing organic traffic and trust before any registration.

### Story 2.1: Blog Schema & Worker API

As a visitor,
I want the platform to have a blog with articles I can retrieve by listing or by slug,
So that blog content is accessible via a clean API that public pages can fetch and render.

**Acceptance Criteria:**

**Given** the D1 migration `0002_blog_posts.sql` is applied,
**When** the `blog_posts` table is inspected,
**Then** it contains columns: `id`, `title`, `slug`, `excerpt`, `content_html`, `cover_image_url`, `meta_title`, `meta_description`, `published_at` — and a unique index exists on `slug`

**Given** a `GET /api/blog` request is made,
**When** the Worker handles it,
**Then** it returns a JSON array of published posts (where `published_at IS NOT NULL`) with fields: `id`, `title`, `slug`, `excerpt`, `cover_image_url`, `published_at` — ordered by `published_at DESC`

**Given** a `GET /api/blog/:slug` request is made with a valid slug,
**When** the Worker handles it,
**Then** it returns the full post JSON including `content_html`, `meta_title`, and `meta_description`

**Given** a `GET /api/blog/:slug` request is made with a non-existent slug,
**When** the Worker handles it,
**Then** it returns `404` with `{ "error": { "code": "NOT_FOUND", "message": "Post not found" } }`

**Given** the API returns content,
**When** unpublished posts exist in the database,
**Then** they are never included in listing or slug responses

---

### Story 2.2: Blog Public Pages & SEO Meta Injection

As a visitor,
I want to browse a list of blog posts and read individual articles with correct page titles, meta descriptions, and Open Graph tags,
So that each article page is shareable on social media and ranks correctly in search engines.

**Acceptance Criteria:**

**Given** `/blog` is visited in a browser,
**When** the page loads,
**Then** it fetches from `GET /api/blog` and renders post cards with title, excerpt, cover image, and published date — using Alpine.js

**Given** a specific blog post URL `/blog/:slug` is visited,
**When** the page loads,
**Then** it fetches from `GET /api/blog/:slug` and renders the full article: title, cover image, `content_html`, and published date

**Given** a request for any `/blog/*` URL arrives at the Worker,
**When** the Worker serves the HTML response,
**Then** it injects into the `<head>`: `<title>`, `<meta name="description">`, `<meta property="og:title">`, `<meta property="og:description">`, `<meta property="og:image">`, and `<link rel="canonical">` with values specific to that post (fetched from D1)

**Given** the blog listing page is served,
**When** the `<head>` is inspected,
**Then** it contains a generic site title and description for the listing page meta

**Given** a 404 blog slug is visited,
**When** the Worker cannot find the post,
**Then** a friendly 404 page is rendered (not a blank page or raw JSON error)

**Given** a blog article renders `content_html`,
**When** the HTML is output to the page,
**Then** the content was already sanitized before storage (enforced at write-time in the Worker) — XSS is not possible via stored content

**Note — Blog-to-Lesson CTAs (Phase 1 approach):** Inline CTAs linking blog articles to related free lessons are authored directly inside `content_html` via the Quill.js admin editor. No separate `related_lesson_slug` schema field is required for Phase 1. Admins write a link/button in the article body. Phase 2 may add a structured `related_lesson_slug` field for automated CTA injection.

---

### Story 2.3: XML Sitemap

As a search engine crawler,
I want to request the platform's sitemap and discover all published blog posts and public pages,
So that the entire content catalog gets indexed quickly and completely.

**Acceptance Criteria:**

**Given** a `GET /sitemap.xml` request is made,
**When** the Worker handles it,
**Then** it returns a valid XML sitemap with `Content-Type: application/xml`

**Given** the sitemap is returned,
**When** its entries are inspected,
**Then** it includes `<url>` entries for: the homepage, `/blog`, `/courses`, `/services`, and one entry per published blog post using its canonical slug URL

**Given** new blog posts are published,
**When** `/sitemap.xml` is next requested,
**Then** those new posts appear in the sitemap dynamically (fetched from D1 at request time — not a static file)

**Given** unpublished posts exist,
**When** the sitemap is generated,
**Then** no unpublished posts appear in the sitemap

**Given** the sitemap is validated against the sitemap protocol,
**When** submitted to Google Search Console,
**Then** it passes validation with no errors

---

## Epic 3: User Authentication

Users can securely register, sign in, and reset their password — with first-touch attribution captured on registration and the email infrastructure library established for all future epics.

### Story 3.1: User Registration

As a new visitor,
I want to create an account with my email and password,
So that I can access the platform and begin my learning journey.

**Acceptance Criteria:**

**Given** the D1 migration `0003_users.sql` is applied,
**When** the `users` table is inspected,
**Then** it contains: `id`, `email`, `password_hash`, `name`, `created_at`, `last_login_at`, `login_streak`, `first_touch_source`, `first_touch_medium`, `first_touch_campaign`, `first_touch_page` — with a unique index on `email`

**Given** a `POST /api/auth/register` request is made with valid `email`, `password`, and `name`,
**When** the Worker processes it,
**Then** the password is hashed with PBKDF2 via the Web Crypto API before storage — the plaintext password never touches D1

**Given** registration is successful,
**When** the Worker responds,
**Then** it returns `201` with a signed JWT containing `{ userId, email, role: "student" }` with a 7-day expiry

**Given** registration is successful,
**When** the Worker calls Emailit,
**Then** a registration confirmation email is sent to the new user's address

**Given** registration is successful,
**When** the Worker calls Encharge,
**Then** the Worker calls `encharge.upsertContact(env, { email, firstName })` and then `encharge.addTag(env, email, 'Lead')` — the "Tag Added: Lead" trigger in Encharge fires the welcome + onboarding sequence automatically

**Given** a registration attempt uses an already-registered email,
**When** the Worker processes it,
**Then** it returns `409` with `{ "error": { "code": "EMAIL_TAKEN", "message": "An account with this email already exists" } }`

**Given** a registration attempt is missing required fields or has an invalid email format,
**When** the Worker processes it,
**Then** it returns `422` with a descriptive validation error

---

### Story 3.2: User Login

As a registered user,
I want to log in with my email and password and have my session persist across page loads,
So that I can pick up my learning exactly where I left off.

**Acceptance Criteria:**

**Given** a `POST /api/auth/login` request is made with valid credentials,
**When** the Worker processes it,
**Then** it verifies the PBKDF2 password hash, updates `last_login_at`, and returns `200` with a signed JWT

**Given** a login attempt has invalid credentials,
**When** the Worker processes it,
**Then** it returns `401` with `{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password" } }` — never revealing which field is wrong

**Given** the JWT is returned from login,
**When** `/public/js/auth.js` receives it,
**Then** it stores the JWT in `localStorage` and updates `Alpine.store('session')` with `{ userId, email, role, isLoggedIn: true }`

**Given** a user has a valid JWT in `localStorage`,
**When** they navigate to any page,
**Then** `auth.js` on page load reads the JWT, validates its expiry client-side, and restores the session in `Alpine.store('session')`

**Given** a JWT is expired or malformed in `localStorage`,
**When** `auth.js` detects this,
**Then** the stored JWT is cleared and `Alpine.store('session')` is set to `{ isLoggedIn: false }`

**Given** a `POST /api/auth/logout` request is made,
**When** the client calls it,
**Then** the server responds `200` (stateless — no server-side session to destroy) and the client clears localStorage + resets the Alpine session store

---

### Story 3.3: Password Reset

As a registered user who has forgotten their password,
I want to receive a reset link by email and set a new password,
So that I can regain access to my account without losing my data.

**Acceptance Criteria:**

**Given** the D1 migration `0004_password_reset_tokens.sql` is applied,
**When** the table is inspected,
**Then** it contains `id`, `user_id`, `token_hash`, `expires_at`, `used_at` — with an index on `token_hash`

**Given** a `POST /api/auth/forgot-password` request is made with a registered email,
**When** the Worker processes it,
**Then** it generates a cryptographically secure random token, stores its hash in `password_reset_tokens` with a 1-hour expiry, and sends an Emailit email with the reset link

**Given** a `POST /api/auth/forgot-password` request is made with an unregistered email,
**When** the Worker processes it,
**Then** it returns `200` with a generic success message — never confirming whether the email is registered (prevents enumeration)

**Given** a `POST /api/auth/reset-password` request is made with a valid, unexpired token and a new password,
**When** the Worker processes it,
**Then** it validates the token hash, updates the user's `password_hash` with PBKDF2, marks the token as `used_at = now()`, and returns `200`

**Given** a reset token is used a second time,
**When** the Worker processes it,
**Then** it returns `400` with `{ "error": { "code": "TOKEN_USED", "message": "This reset link has already been used" } }`

**Given** a reset token has expired (> 1 hour),
**When** the Worker processes it,
**Then** it returns `400` with `{ "error": { "code": "TOKEN_EXPIRED", "message": "This reset link has expired" } }`

---

### Story 3.4: Protected Route Middleware & Role Authorization

As a platform operator,
I want all protected pages and API routes to require a valid JWT session — and admin routes to additionally require the admin role,
So that course content and admin tools are never accessible to unauthenticated or unauthorized users.

**Acceptance Criteria:**

**Given** a Worker middleware function `requireAuth` exists in `/worker/src/lib/auth.ts`,
**When** applied to a Hono route,
**Then** it extracts the JWT from the `Authorization: Bearer` header, verifies the signature using `JWT_SECRET`, and attaches the decoded payload to the request context

**Given** a protected API route is called without an `Authorization` header,
**When** `requireAuth` processes it,
**Then** it returns `401` with `{ "error": { "code": "UNAUTHORIZED", "message": "Authentication required" } }`

**Given** a `requireAdmin` middleware exists,
**When** applied to admin routes,
**Then** it calls `requireAuth` first, then checks `payload.role === "admin"` — returning `403` if the role is `student`

**Given** a logged-in student visits `/dashboard`,
**When** `auth.js` runs on page load,
**Then** it reads the JWT from `localStorage` and redirects to `/login` if the session is missing or expired

**Given** a logged-in student attempts to navigate to `/admin/`,
**When** `auth.js` detects the route and checks `role`,
**Then** it redirects to the dashboard — admin pages are never rendered for student accounts

---

### Story 3.5: UTM First-Touch Attribution

As a platform owner,
I want to know which traffic source first brought each student to the platform,
So that I can understand which content and channels drive registrations.

**Acceptance Criteria:**

**Given** `/public/js/utm.js` is loaded on any public page,
**When** the page URL contains UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`),
**Then** those values are captured and stored in `localStorage` under `fotf_utm_first_touch` — only on the very first visit (never overwritten on subsequent visits)

**Given** UTM params are stored in `localStorage`,
**When** a user completes registration via `POST /api/auth/register`,
**Then** the first-touch UTM values are included in the request body

**Given** the registration payload includes UTM values,
**When** the Worker creates the user record,
**Then** `first_touch_source`, `first_touch_medium`, `first_touch_campaign`, and `first_touch_page` are stored on the `users` row

**Given** a visitor arrives without UTM parameters,
**When** `utm.js` runs,
**Then** no UTM data is stored — the user's UTM fields on registration are `NULL` (not empty strings)

**Given** a user has previously visited with UTMs and returns without them,
**When** `utm.js` runs again,
**Then** the existing `localStorage` value is preserved — first-touch attribution is never overwritten

---

## Epic 4: Course & Lesson Access

Students can browse the course catalog, access free preview lessons without purchasing, complete lessons, track their progress, and see the full curriculum map showing their learning path.

### Story 4.1: Course & Lesson Schema & Worker API

As a student,
I want to retrieve course and lesson data from the platform,
So that I can browse what's available and access content I'm entitled to.

**Acceptance Criteria:**

**Given** migration `0005_courses_lessons.sql` is applied,
**When** the tables are inspected,
**Then** `courses` contains: `id`, `title`, `slug`, `description`, `cover_image_url`, `price`, `published`, `module_category`, `created_at` — with unique index on `slug`; `lessons` contains: `id`, `course_id`, `title`, `slug`, `content_html`, `video_url`, `order`, `is_free_preview`, `published` — with unique index on `slug`

**Given** a `GET /api/courses` request is made,
**When** the Worker handles it,
**Then** it returns all published courses as a JSON array including `module_category` for grouping — ordered by `module_category`, then by `created_at`

**Given** a `GET /api/courses/:slug` request is made,
**When** the Worker handles it,
**Then** it returns the course details and its published lessons (ordered by `order`) — with `is_free_preview` included on each lesson

**Given** a `GET /api/lessons/:slug` request is made for a free preview lesson,
**When** the Worker handles it (no auth required),
**Then** it returns the full lesson including `content_html` and `video_url`

**Given** a `GET /api/lessons/:slug` request is made for a non-preview lesson without a valid JWT,
**When** the Worker handles it,
**Then** it returns `403` with `{ "error": { "code": "PURCHASE_REQUIRED", "message": "Purchase this course to access this lesson" } }`

**Given** a `GET /api/lessons/:slug` request is made for a non-preview lesson with a valid JWT for a user who purchased the course,
**When** the Worker handles it,
**Then** it returns `200` with the full lesson content

---

### Story 4.2: Course Catalog Public Page

As a visitor or prospective student,
I want to browse all available courses with their covers, titles, prices, and free preview indicators,
So that I can evaluate what's available before deciding to register or purchase.

**Acceptance Criteria:**

**Given** `/courses` is visited,
**When** the page loads,
**Then** it fetches from `GET /api/courses` and renders a card grid with: cover image, title, `module_category` label, description excerpt, price, and a "Free Preview Available" badge on courses with at least one `is_free_preview` lesson

**Given** multiple module categories exist,
**When** the catalog renders,
**Then** courses are visually grouped or labelled by `module_category` (Research, Traffic, Funnels, Email, Advanced)

**Given** a course card is clicked,
**When** the user navigates to the course detail page,
**Then** a course detail page renders the full lesson list — free preview lessons are shown with a "Free" label; paid lessons are shown as locked

**Given** the course catalog is viewed on mobile,
**When** the viewport is < 768px,
**Then** the layout switches to a single-column card view with no horizontal overflow

**Given** the Worker injects SEO meta for `/courses`,
**When** the page is served,
**Then** `<title>`, `<meta name="description">`, and OG tags are populated with the course catalog page metadata

---

### Story 4.3: Lesson Player

As a student,
I want to read or watch a lesson with its full content and any associated video,
So that I can learn from the course material at my own pace.

**Acceptance Criteria:**

**Given** a free preview lesson URL is visited by an unauthenticated visitor,
**When** the lesson player loads,
**Then** the full `content_html` and `video_url` are rendered — no login required

**Given** an unauthenticated visitor has scrolled to the bottom of a free preview lesson,
**When** the lesson content ends,
**Then** a Soft Gate registration overlay appears below the content — the full lesson was readable, the gate fires at the END; lesson content is never blocked mid-read
**And** the overlay presents a "Create Free Account" CTA and a "Purchase Course" CTA
**And** the overlay does not re-trigger if the visitor scrolls back up and back down within the same session

**Given** a non-preview lesson URL is visited by an unauthenticated visitor,
**When** the lesson player attempts to load,
**Then** a "Soft Gate" modal overlay is shown with a CTA to register or purchase — the lesson content is not visible (hard gate for paid content)

**Given** a non-preview lesson URL is visited by a student who purchased the course,
**When** the lesson player loads,
**Then** the full `content_html` and `video_url` are rendered with no gate

**Given** a lesson has a `video_url`,
**When** the lesson player renders,
**Then** the video is embedded using a standard `<iframe>` embed (YouTube or equivalent) — the URL is never injected into `content_html`

**Given** the lesson player renders `content_html`,
**When** the content is output to the DOM,
**Then** only the sanitized HTML stored in D1 is rendered — no inline script execution is possible

**Given** the lesson is the last in a course,
**When** it is rendered,
**Then** a "You've finished this course! 🎉" completion prompt is shown with a CTA to book a discovery call

---

### Story 4.4: Lesson Progress Tracking

As a student,
I want to mark lessons as complete and see my progress through a course,
So that I always know where I am and feel the satisfaction of measurable advancement.

**Acceptance Criteria:**

**Given** migration `0006_lesson_progress.sql` is applied,
**When** the `lesson_progress` table is inspected,
**Then** it contains `id`, `user_id`, `lesson_id`, `completed_at` — with a unique constraint on `(user_id, lesson_id)` and indexes on both `user_id` and `lesson_id`

**Given** a logged-in student reaches the bottom of a lesson,
**When** the lesson player renders the completion zone,
**Then** a gold "Launch It" button is shown (using `--accent-secondary` color token) — this button is the sole completion trigger and appears nowhere else on the platform

**Given** the student clicks "Launch It",
**When** the button is clicked,
**Then** a confirmation modal appears with the prompt "Ready to launch?" and two actions: "Confirm Launch" (gold) and "Not yet" (secondary) — the student must actively confirm before progress is recorded

**Given** the student confirms in the modal,
**When** "Confirm Launch" is clicked,
**Then** `POST /api/lessons/:id/complete` is called — a record is inserted into `lesson_progress` (or silently ignored if it already exists) and `200` is returned
**And** the progress bar in the lesson player animates to its new value (`ease-out 0.4s`)
**And** the "Launch It" button changes to a green checkmark state

**Given** `GET /api/progress/course/:courseId` is called with a valid JWT,
**When** the Worker handles it,
**Then** it returns `{ completedLessons: [lessonId, ...], totalLessons: N, percentComplete: X }` for that student and course

**Given** progress data is returned,
**When** the lesson list renders,
**Then** completed lessons display a checkmark; the "Continue Learning" CTA points to the first incomplete lesson

**Given** a student completes all lessons in a course (100%),
**When** progress is recorded,
**Then** the completion state is reflected immediately in the UI without a page reload (Alpine.js reactive update)

**Given** `prefers-reduced-motion: reduce` is active on the device,
**When** the progress bar update fires,
**Then** the animation is skipped — the progress bar updates instantly without transition

---

### Story 4.5: Journey Path Map Component

As a student or visitor,
I want to see the full curriculum as a visual map — Research → Traffic → Funnels → Email → Advanced — so that I understand the complete learning journey and where each course fits.

**Acceptance Criteria:**

**Given** the Journey Path Map component is rendered on the courses page,
**When** it loads,
**Then** it displays all 5 curriculum modules as distinct nodes in sequence: Research, Traffic, Funnels, Email, Advanced

**Given** a module node is rendered,
**When** courses with that `module_category` exist,
**Then** the node shows the count of courses available in that module and links to the filtered catalog view

**Given** the component is rendered for an authenticated student with progress data,
**When** it loads,
**Then** each module node shows the student's completion percentage for courses in that module (using data from `GET /api/progress/course/:courseId`)

**Given** the component is rendered for an unauthenticated visitor,
**When** it loads,
**Then** nodes show available course counts only — no progress data is fetched or displayed

**Given** the Journey Path Map is an Alpine.js component (`x-data`),
**When** it is included on the courses page,
**Then** the same component definition can be reused in the student dashboard (Epic 6) without duplication — it accepts a `showProgress` prop to toggle between discovery and progress modes

---

## Epic 5: Payments & Enrollment

Students can purchase courses with Stripe, gain immediate access upon payment confirmation, and receive automated email sequences — with last-touch attribution captured and payment failures handled gracefully.

### Story 5.1: Stripe Payment Abstraction Library

As a platform operator,
I want all payment processing logic isolated behind a single abstraction layer,
So that the platform can switch payment processors in the future with minimal code changes and no risk of regressions across checkout and webhook handling.

**Acceptance Criteria:**

**Given** `/worker/src/lib/stripe.ts` exists,
**When** it is imported by other Worker modules,
**Then** it exports: `createCheckoutSession(courseId, userId, priceInCents, metadata)`, `constructWebhookEvent(body, signature, secret)`, and `verifyWebhookSignature(request)` — no raw Stripe API calls exist outside this file

**Given** `createCheckoutSession` is called,
**When** it runs,
**Then** it calls the Stripe API using `STRIPE_SECRET_KEY` from environment secrets — the key is never hardcoded or logged

**Given** `constructWebhookEvent` is called with a valid payload and `stripe-signature` header,
**When** it runs,
**Then** it returns a verified Stripe Event object; if the signature is invalid, it throws an error

**Given** the Stripe library is the only caller of the Stripe REST API,
**When** all Worker source files are inspected,
**Then** no `fetch('https://api.stripe.com/...')` calls exist outside `/worker/src/lib/stripe.ts`

---

### Story 5.2: Checkout Session Creation & Purchase Flow

As a logged-in student,
I want to click "Purchase" on a course and be taken to a secure Stripe checkout page,
So that I can pay and gain access to the course content.

**Acceptance Criteria:**

**Given** migration `0007_user_purchases.sql` is applied,
**When** the `user_purchases` table is inspected,
**Then** it contains: `id`, `user_id`, `course_id`, `stripe_session_id`, `amount`, `purchased_at`, `attribution_source`, `attribution_medium`, `attribution_campaign` — with indexes on `user_id` and `course_id`

**Given** migration `0008_student_activity_log.sql` is applied,
**When** the `student_activity_log` table is inspected,
**Then** it contains: `id`, `user_id`, `event_type`, `metadata_json`, `created_at` — with indexes on `user_id` and `created_at`

**Given** a logged-in student clicks "Purchase" on a course,
**When** `POST /api/checkout/create-session` is called with `{ courseId, attributionData }`,
**Then** the Worker creates a Stripe Checkout session with the course price, `success_url`, `cancel_url`, and `metadata: { userId, courseId, attributionSource, attributionMedium, attributionCampaign }`

**Given** the session is created successfully,
**When** the Worker responds,
**Then** it returns `{ sessionUrl }` and the client redirects the user to the Stripe-hosted checkout page

**Given** a student who already purchased a course clicks "Purchase" again,
**When** the Worker handles the request,
**Then** it returns `409` with `{ "error": { "code": "ALREADY_ENROLLED", "message": "You already have access to this course" } }` — no duplicate Stripe session is created

**Given** an unauthenticated visitor clicks "Purchase",
**When** the request reaches the Worker,
**Then** it returns `401` — the checkout endpoint is protected by `requireAuth` middleware

---

### Story 5.3: Stripe Webhook Handler

As a platform operator,
I want course access granted automatically on successful payment, dunning triggered on payment failure, and cart abandonment recovery triggered on session expiry,
So that no manual intervention is needed to enroll students, chase failed payments, or recover abandoned checkouts.

**Acceptance Criteria:**

**Given** a `POST /api/webhooks/stripe` request arrives,
**When** the Worker handles it,
**Then** `verifyWebhookSignature` is called first — if the `stripe-signature` header is missing or invalid, the request is rejected with `400` before any business logic executes

**Given** a verified `checkout.session.completed` event arrives,
**When** the Worker processes it,
**Then** it: (1) inserts a record into `user_purchases` with `stripe_session_id`, `amount`, and attribution metadata from the session; (2) logs a `course_purchased` event to `student_activity_log`; (3) sends a course purchase receipt via Emailit; (4) calls `encharge.addTag(env, email, 'Customer')`, `encharge.addTag(env, email, 'Course-[courseSlug]')`, and `encharge.removeTag(env, email, 'Lead')` — the "Tag Added: Customer" trigger fires the course onboarding sequence in Encharge; removing `Lead` keeps the contact out of the welcome flow simultaneously

**Given** a verified `payment_intent.payment_failed` event arrives,
**When** the Worker processes it,
**Then** it: (1) logs the failure event to `student_activity_log`; (2) calls `encharge.addTag(env, email, 'Payment-Failed')` — the "Tag Added: Payment-Failed" trigger fires the dunning sequence in Encharge; (3) sends an admin alert email via Emailit with the user's email and the failed amount

**Given** the webhook receives a `checkout.session.completed` event for a `stripe_session_id` that already exists in `user_purchases`,
**When** the Worker processes it,
**Then** it returns `200` without creating a duplicate purchase record (idempotent handling)

**Given** a verified `checkout.session.expired` event arrives (student abandoned Stripe checkout),
**When** the Worker processes it,
**Then** it calls `encharge.addTag(env, email, 'Cart-Abandoned')` — the "Tag Added: Cart-Abandoned" trigger fires the cart recovery sequence in Encharge (1hr recovery email described in UX flow)
**And** if the session metadata contains no email (anonymous visitor), the event is silently ignored

**Given** the Emailit call in the webhook handler fails,
**When** the failure is caught,
**Then** the Worker logs the error to Cloudflare observability and still returns `200` to Stripe — email failure never causes Stripe to retry the webhook

**Note:** Enable `checkout.session.expired` in the Stripe webhook dashboard alongside `checkout.session.completed` and `payment_intent.payment_failed`. Default Stripe checkout session expiry is 24 hours — set `expires_after` to `3600` (1 hour) on `createCheckoutSession` to match the UX intent.

---

### Story 5.4: Last-Touch Attribution on Purchase

As a platform owner,
I want to know which traffic source or campaign was active when a student made their purchase,
So that I can measure which channels convert to paying customers, not just registrations.

**Acceptance Criteria:**

**Given** `utm.js` is loaded on any public page,
**When** the current page URL contains UTM parameters,
**Then** those values are stored in `localStorage` under `fotf_utm_last_touch` — overwriting any previous last-touch value on every visit with UTMs

**Given** a student initiates checkout,
**When** the client calls `POST /api/checkout/create-session`,
**Then** the request body includes `attributionSource`, `attributionMedium`, `attributionCampaign` read from `fotf_utm_last_touch` in `localStorage` (or `null` if not present)

**Given** the Stripe `checkout.session.completed` webhook fires,
**When** the `user_purchases` record is inserted,
**Then** `attribution_source`, `attribution_medium`, and `attribution_campaign` are populated from the session metadata stored at checkout creation time

**Given** a student purchases without any UTM params present,
**When** the purchase record is created,
**Then** attribution fields are stored as `NULL` — not empty strings — for clean reporting

---

## Epic 6: Student Dashboard

Enrolled students have a personalized home — tracking streak and progress, surfacing enrolled courses, recent activity, locked course upsells, and a persistent consulting CTA — all in one place.

### Story 6.1: Dashboard Shell, Welcome Bar & Login Streak

As a logged-in student,
I want a personalized dashboard that greets me by name, shows when I last visited, and tracks my login streak,
So that I feel recognized and motivated to keep my learning momentum.

**Acceptance Criteria:**

**Given** a student navigates to `/dashboard`,
**When** the page loads,
**Then** `requireAuth` middleware is enforced — unauthenticated users are redirected to `/login`

**Given** `GET /api/dashboard/me` is called with a valid JWT,
**When** the Worker handles it,
**Then** it returns `{ name, email, lastLoginAt, loginStreak, createdAt }`

**Given** a student logs in,
**When** the Worker processes the login,
**Then** it compares `last_login_at` to `now()`: if the gap is ≤ 24 hours, `login_streak` increments by 1; if > 24 hours but ≤ 48 hours, streak stays the same; if > 48 hours, streak resets to 1

**Given** the Welcome Bar renders,
**When** the dashboard loads,
**Then** it displays: "Welcome back, {name}" with the `lastLoginAt` date formatted as "Last seen: {date}" and the current `loginStreak` count with a flame icon

**Given** the dashboard is viewed on mobile,
**When** the viewport is < 768px,
**Then** the Welcome Bar stacks vertically and all text remains readable without overflow

---

### Story 6.2: My Journey Section

As a student,
I want to see my progress across the full marketing curriculum map — Research → Traffic → Funnels → Email → Advanced — on my dashboard,
So that I can see the big picture of how far I've come and what's still ahead.

**Acceptance Criteria:**

**Given** the Journey Path Map component from Epic 4 is included in the dashboard,
**When** it renders with `showProgress: true`,
**Then** it fetches the student's progress data per module and displays a completion percentage on each node

**Given** progress data is fetched,
**When** rendered on the module node,
**Then** each node shows: module name, number of courses, and a visual progress indicator (e.g. progress bar or percentage fill)

**Given** a module has no enrolled courses,
**When** the node renders,
**Then** it shows "0% — Start here" with a CTA linking to the filtered course catalog for that module

**Given** a module is 100% complete,
**When** the node renders,
**Then** it displays a completion checkmark or badge and the node styling reflects the completed state

**Given** the dashboard loads,
**When** progress data is being fetched,
**Then** the My Journey section shows skeleton screens while loading — no layout shift and no spinner

---

### Story 6.3: My Courses Section

As a student,
I want to see all the courses I've enrolled in with my current progress, a direct "Continue Learning" button, and completion badges when I finish,
So that I can jump back into learning in one click.

**Acceptance Criteria:**

**Given** `GET /api/dashboard/courses` is called with a valid JWT,
**When** the Worker handles it,
**Then** it returns enrolled courses (from `user_purchases`) with: `{ courseId, title, slug, coverImageUrl, totalLessons, completedLessons, percentComplete, lastAccessedAt, isComplete }`

**Given** the My Courses section renders,
**When** enrolled courses are returned,
**Then** each course card shows: cover image, title, a progress bar reflecting `percentComplete`, and the `lastAccessedAt` date

**Given** a course is in progress,
**When** the card renders,
**Then** a "Continue Learning" CTA links directly to the first incomplete lesson (not the course index)

**Given** a course is 100% complete,
**When** the card renders,
**Then** a completion badge is shown and the CTA changes to "Review Course"

**Given** the student has no enrolled courses,
**When** the section renders,
**Then** it shows an empty state: "No courses yet — browse the catalog" with a link to `/courses`

**Given** course cards are loading,
**When** the fetch is in progress,
**Then** skeleton cards are shown — no spinners

---

### Story 6.4: Activity Feed, Unlock More, Work With Me & Blog Feed

As a student,
I want my dashboard to surface my recent activity, show me what to unlock next, always remind me that consulting is available, and keep me connected to fresh content,
So that the dashboard is my complete launchpad — not just a progress tracker.

**Acceptance Criteria:**

**Given** `GET /api/dashboard/summary` is called with a valid JWT,
**When** the Worker handles it,
**Then** it returns in a single response: `{ recentActivity: [...last 10 student_activity_log entries], lockedCourses: [...unpurchased published courses], latestBlogPosts: [...3 most recent published posts] }`

**Given** the Recent Activity section renders,
**When** activity entries are returned,
**Then** each entry displays the event type and relative time (e.g. "Completed 'Email Fundamentals' — 2 hours ago")

**Given** the Unlock More section renders,
**When** unpurchased courses are returned,
**Then** each shows the course cover, title, free preview badge (if applicable), price, and a "Preview Free Lesson" or "Enroll — $399" CTA

**Given** the Work With Me section renders,
**When** it displays,
**Then** it shows a Cal.com booking button visible at all times — regardless of course enrollment status

**Given** a student completes 100% of a course,
**When** the completion is recorded,
**Then** the Work With Me section is also surfaced as a full-width CTA below the completed course card

**Given** the Latest From Blog section renders,
**When** 3 posts are returned,
**Then** each shows the cover image, title, excerpt, and a "Read more" link to `/blog/:slug`

---

### Story 6.5: Progress Milestone & Re-engagement Email Triggers

As a platform operator,
I want Encharge to be notified when students hit course completion milestones and when they are active, so that milestone celebration emails and re-engagement sequences fire at precisely the right moments.

**Acceptance Criteria:**

**Given** `POST /api/lessons/:id/complete` is called and the completion is recorded,
**When** the Worker calculates the updated `percentComplete` for the course,
**Then** if the new percentage crosses 25%, 50%, 75%, or 100%, the Worker calls `encharge.addTag(env, email, 'Milestone-[threshold]-[courseSlug]')` — the corresponding "Tag Added: Milestone-*" trigger in Encharge fires the milestone celebration email

**Given** migration `0010_milestones_sent.sql` is applied,
**When** the `milestones_sent` table is inspected,
**Then** it has a composite primary key on `(user_id, course_id, threshold)` — schema:
```sql
CREATE TABLE milestones_sent (
  user_id    INTEGER NOT NULL,
  course_id  INTEGER NOT NULL,
  threshold  INTEGER NOT NULL,  -- 25, 50, 75, 100
  sent_at    TEXT NOT NULL,
  PRIMARY KEY (user_id, course_id, threshold)
);
```

**Given** the Worker calculates that a milestone threshold has been crossed,
**When** it attempts to insert into `milestones_sent`,
**Then** the Worker uses `INSERT OR IGNORE` — if a row already exists for `(userId, courseId, threshold)`, the insert is silently skipped and `encharge.addTag()` is NOT called; if no row exists, the insert succeeds and the tag is added — crossing from 24% to 26% fires the 25% milestone exactly once, never again

**Given** `POST /api/lessons/:id/complete` is called,
**When** the completion is recorded,
**Then** no "user_active" event is sent to Encharge — re-engagement sequences (day 3, 7, 14 inactivity) are handled entirely by time-based segment rules inside Encharge's flow builder; no Worker action is required

**Given** an Encharge `addTag` call fails (network error or non-2xx response),
**When** the failure is caught,
**Then** the error is logged to Cloudflare observability but the `POST /api/lessons/:id/complete` response to the client is still `200` — tag failures never block progress recording

**Given** a course reaches 100% completion (threshold = 100),
**When** the milestone tag fires,
**Then** `encharge.addTag(env, email, 'Milestone-100-[courseSlug]')` is called — in Encharge this is a separate "Tag Added: Milestone-100-*" flow from the 75% flow, allowing a distinct course completion celebration email

---

## Epic 7: Consulting & Booking

Prospects can read about consulting services, book a discovery call, and be automatically enrolled in nurture sequences — while the admin can trigger post-call follow-ups with a single action.

### Story 7.1: Services Page & Cal.com Embed

As a prospective consulting client,
I want to read about the available consulting tiers and book a discovery call directly on the services page,
So that I can take the next step without leaving the platform or hunting for a booking link.

**Acceptance Criteria:**

**Given** `/services` is visited,
**When** the page loads,
**Then** three consulting tiers are clearly presented: (1) Group Program — cohort-based, beginners, scalable; (2) 1-on-1 Intensive — specific problem (traffic, funnel, or email); (3) Done-With-You Retainer — monthly ongoing (marked as "coming soon")

**Given** the services page is rendered,
**When** it is inspected,
**Then** a Cal.com embed is present below the tier descriptions — loaded from the Cal.com hosted JavaScript embed, not a custom iFrame

**Given** the Worker serves the `/services` request,
**When** the `<head>` is inspected,
**Then** SEO meta tags are injected: `<title>`, `<meta name="description">`, `<meta property="og:title">`, and `<link rel="canonical">`

**Given** the page is viewed on mobile,
**When** the viewport is < 768px,
**Then** the tier cards stack vertically and the Cal.com embed remains fully functional and visible

---

### Story 7.2: Cal.com Webhook Handler

As a platform operator,
I want all Cal.com booking events automatically handled — logging to D1, triggering emails, and enrolling leads in the right Encharge sequences,
So that no booking falls through the cracks and every prospect gets a timely, relevant follow-up.

**Acceptance Criteria:**

**Given** migration `0009_consultation_bookings.sql` is applied,
**When** the `consultation_bookings` table is inspected,
**Then** it contains: `id`, `user_id`, `cal_booking_id`, `service_type`, `scheduled_at`, `status`, `created_at` — with an index on `cal_booking_id`

**Given** a `POST /api/webhooks/cal` request arrives,
**When** the Worker handles it,
**Then** the payload is validated before any business logic executes — unverified or malformed requests are rejected with `400`

**Given** a verified `BOOKING_CREATED` event arrives,
**When** the Worker processes it,
**Then** it: (1) inserts a record into `consultation_bookings` with `status = "scheduled"`; (2) logs a `consultation_booked` event to `student_activity_log`; (3) sends a booking confirmation email via Emailit; (4) calls `encharge.upsertContact(env, { email, firstName })` and `encharge.addTag(env, email, 'Call-Booked')` — the "Tag Added: Call-Booked" trigger fires the pre-call nurture sequence in Encharge (upsertContact ensures non-registered prospects are created in Encharge before the tag is applied)

**Given** a verified `BOOKING_CANCELLED` event arrives,
**When** the Worker processes it,
**Then** it: (1) updates the `consultation_bookings` record to `status = "cancelled"`; (2) sends a cancellation notice email via Emailit to the prospect

**Given** a verified `BOOKING_RESCHEDULED` event arrives,
**When** the Worker processes it,
**Then** it updates `scheduled_at` on the `consultation_bookings` record to the new datetime

**Given** a Cal.com webhook fires for a user email not in the `users` table (non-registered prospect),
**When** the Worker processes a `BOOKING_CREATED` event,
**Then** it still logs the booking to `consultation_bookings` with `user_id = NULL` and sends the Emailit confirmation — the webhook never fails due to an unrecognized email

---

### Story 7.3: Post-Call Follow-Up Trigger

As an admin,
I want to trigger the post-call follow-up sequence for a specific booking with a single click,
So that every prospect receives a timely proposal and payment link after our call without manual email composition.

**Acceptance Criteria:**

**Given** `POST /api/admin/bookings/:id/post-call` is called,
**When** the Worker handles it,
**Then** `requireAdmin` middleware is enforced — requests from non-admin JWTs are rejected with `403`

**Given** the endpoint is called with a valid admin JWT and a valid booking ID,
**When** the Worker processes it,
**Then** it looks up the email from `consultation_bookings` and calls `encharge.addTag(env, email, 'Post-Call')` — the "Tag Added: Post-Call" trigger fires the post-call follow-up sequence in Encharge (proposal + Stripe payment link)

**Given** the Encharge tag is added successfully,
**When** the Worker responds,
**Then** it returns `200` with `{ success: true, message: "Post-call sequence triggered" }`

**Given** the booking ID does not exist,
**When** the Worker handles the request,
**Then** it returns `404` with `{ "error": { "code": "NOT_FOUND", "message": "Booking not found" } }`

**Given** the post-call trigger is called for the same booking a second time,
**When** the Worker processes it,
**Then** it returns `200` (idempotent) — triggering again is the admin's responsibility, not blocked by the API

---

## Epic 8: Admin Content Management

The admin can create, edit, and publish courses, lessons, and blog posts — giving the platform its content without relying on any external CMS.

### Story 8.1: Admin Shell & Authentication Guard

As an admin,
I want a dedicated admin interface with navigation between management sections, protected so only admin accounts can access it,
So that I can manage all platform content from a single, secure location.

**Acceptance Criteria:**

**Given** `/admin/` is visited by a user without a valid admin JWT,
**When** `admin.js` runs,
**Then** the user is immediately redirected to `/login` — no admin content is ever rendered

**Given** `/admin/` is visited with a valid admin JWT (`role: "admin"`),
**When** the shell loads,
**Then** the admin navigation is displayed with links to: Courses, Blog, Students, Analytics

**Given** `admin.js` implements a client-side router,
**When** the URL hash or path changes within the admin,
**Then** the correct admin section renders without a full page reload — matching the single `admin.js` router pattern specified in the Architecture document

**Given** the admin is viewed on tablet (768px–1023px),
**When** the sidebar renders,
**Then** it collapses to an icon rail (collapsed labels, icons only)

**Given** the admin is viewed on mobile (< 768px),
**When** the bottom nav renders,
**Then** it shows a maximum of 4 icons: Courses, Blog, Students, Analytics

---

### Story 8.2: Course & Lesson Management

As an admin,
I want to create and edit courses and their lessons — including rich text content and video URLs — and control which are published,
So that I can build and maintain the complete course catalog from the admin panel.

**Acceptance Criteria:**

**Given** the admin navigates to the Courses section,
**When** the courses list loads,
**Then** all courses are shown (published and unpublished) with their title, `module_category`, published status, and lesson count

**Given** the admin clicks "New Course",
**When** the course creation form submits,
**Then** `POST /api/admin/courses` creates a new course record in D1 with the provided title, slug (auto-generated from title), description, cover image URL, price, and `module_category`

**Given** the admin edits a course,
**When** changes are saved,
**Then** `PUT /api/admin/courses/:id` updates the record and returns the updated course

**Given** the admin opens a course and clicks "New Lesson",
**When** the lesson form loads,
**Then** a Quill.js rich text editor is presented for `content_html` and a separate `video_url` text input is shown — video is never embedded inside the HTML content

**Given** the admin saves a lesson with HTML content from Quill.js,
**When** `POST /api/admin/lessons` or `PUT /api/admin/lessons/:id` is called,
**Then** the Worker sanitizes `content_html` via `sanitize.ts` before storing in D1 — raw Quill output is never written directly to the database

**Given** the admin toggles a course's published state,
**When** the toggle is actioned,
**Then** `PUT /api/admin/courses/:id` updates `published = true/false` and the change is reflected immediately in the admin UI

**Given** the admin reorders lessons within a course,
**When** the order is saved,
**Then** `PUT /api/admin/lessons/:id` updates the `order` field and the lesson list re-renders in the new sequence

---

### Story 8.3: Blog Post Management

As an admin,
I want to create and edit blog posts with rich text content and SEO metadata — and control when they are published,
So that the blog stays fresh with quality content that drives organic traffic to the platform.

**Acceptance Criteria:**

**Given** the admin navigates to the Blog section,
**When** the post list loads,
**Then** all posts are shown (published and drafts) with title, published status, and `published_at` date

**Given** the admin clicks "New Post",
**When** the post creation form submits,
**Then** `POST /api/admin/blog` creates a new `blog_posts` record with: title, slug (auto-generated from title), excerpt, `content_html`, cover image URL, `meta_title`, and `meta_description`

**Given** the admin edits a blog post,
**When** the Quill.js editor is used and changes are saved,
**Then** `PUT /api/admin/blog/:id` updates the record and the Worker sanitizes `content_html` via `sanitize.ts` before writing to D1

**Given** the admin clicks "Publish",
**When** the publish action fires,
**Then** `PUT /api/admin/blog/:id` sets `published_at = now()` — the post immediately appears on the public blog listing

**Given** a published post needs to be unpublished,
**When** the admin sets it back to draft,
**Then** `PUT /api/admin/blog/:id` sets `published_at = NULL` — the post disappears from the public blog and sitemap instantly

**Given** the admin saves a post with a duplicate slug,
**When** the Worker processes it,
**Then** it returns `409` with a descriptive error — slugs must be unique across all blog posts

---

## Epic 9: Admin CRM & Analytics

The admin can view every student's full journey from first visit to purchase, understand which traffic sources drive revenue, track platform health metrics, and trust that all user interactions are firing GTM events for downstream analytics.

### Story 9.1: Student CRM — List & Profile View

As an admin,
I want to see a list of all students and drill into any individual's complete journey — from first visit through registration, lessons, and purchases,
So that I can understand each student's progress and identify who needs outreach or is ready for a consulting conversation.

**Acceptance Criteria:**

**Given** the admin navigates to the Students section,
**When** `GET /api/admin/students` is called,
**Then** it returns a paginated list (50 per page) of students with: `id`, `name`, `email`, `created_at`, `last_login_at`, `login_streak`, `first_touch_source`, and count of courses purchased

**Given** the student list renders,
**When** the admin views it,
**Then** columns are sortable by: registration date, last active, and courses purchased — default sort is most recently registered first

**Given** the admin clicks on a student,
**When** `GET /api/admin/students/:id` is called,
**Then** it returns the student's full profile: personal info, first-touch UTM data, all entries from `student_activity_log` ordered by `created_at DESC`, and all `user_purchases` with course name and `attribution_source`

**Given** the student profile renders,
**When** the journey timeline displays,
**Then** it shows events in chronological order: first visit (if UTM captured), registration, each lesson viewed/completed, course purchased, consultation booked — each with its timestamp

**Given** the admin searches by email in the student list,
**When** the search query is submitted,
**Then** `GET /api/admin/students?search=email@example.com` returns matching students filtered by email prefix

---

### Story 9.2: Revenue Attribution Report

As an admin,
I want to see a breakdown of revenue by the traffic source and campaign that drove each purchase,
So that I know which content and channels are actually converting to paying students — not just registrations.

**Acceptance Criteria:**

**Given** `GET /api/admin/reports/revenue` is called,
**When** the Worker handles it,
**Then** it queries `user_purchases` joined with `users` and returns revenue grouped by `attribution_source` and `attribution_campaign`, each with: total revenue, purchase count, and list of courses purchased

**Given** the revenue report renders,
**When** the data loads,
**Then** rows are sorted by total revenue descending — highest-converting source is always first

**Given** a revenue row for `attribution_source = NULL` exists,
**When** it renders,
**Then** it is labeled "Direct / Unknown" — not blank

**Given** a date range filter is applied (`?from=YYYY-MM-DD&to=YYYY-MM-DD`),
**When** the query runs,
**Then** only purchases with `purchased_at` within the range are included in the report

**Given** the report is viewed,
**When** total platform revenue is calculated,
**Then** a summary row shows total all-time revenue and total purchases count at the top of the report

---

### Story 9.3: Platform Analytics Dashboard & GTM Data Layer

As an admin,
I want to see platform health metrics at a glance — registrations, purchases, active students — and trust that all user interactions are being tracked in GTM for downstream reporting.

**Acceptance Criteria:**

**Given** `GET /api/admin/analytics` is called,
**When** the Worker handles it,
**Then** it returns: `{ totalRegistrations, registrationsLast30Days, totalPurchases, purchasesLast30Days, activeStudentsLast30Days, totalRevenue, revenueLastt30Days }`

**Given** the Analytics section renders in the admin,
**When** the data loads,
**Then** each metric is shown as a stat card with its all-time value and 30-day trend

**Given** the GTM snippet (`GTM-XXXXXXX`) is added to the `<head>` of every HTML page template,
**When** any page loads,
**Then** `window.dataLayer` is initialized and the GTM container fires correctly

**Given** `/public/js/gtm.js` exists with a `pushEvent(eventName, params)` helper,
**When** the following user actions occur,
**Then** the corresponding `window.dataLayer.push()` calls fire:
- Page load → `{ event: "page_view", page, user_id }`
- Registration success → `{ event: "user_registered", source, medium, campaign }`
- Lesson player opens → `{ event: "lesson_viewed", lesson_id, course_id, user_id }`
- Lesson marked complete → `{ event: "lesson_completed", lesson_id, course_id, user_id, progress_percent }`
- Purchase success redirect → `{ event: "course_purchased", course_id, amount, user_id, source, campaign }`
- Cal.com booking confirmed → `{ event: "consultation_booked", service_type, user_id, source }`
- Any CTA click with `data-gtm-cta` attribute → `{ event: "cta_clicked", cta_label, page, user_id }`

**Given** a user is not logged in,
**When** GTM events fire,
**Then** `user_id` is omitted from the payload (not `null` or `undefined` — simply not included)

**Given** Cloudflare observability is enabled,
**When** the Worker is deployed,
**Then** Cloudflare Analytics and Logpush are active — the admin can view Worker error rates, request volumes, and D1 query performance from the Cloudflare dashboard
