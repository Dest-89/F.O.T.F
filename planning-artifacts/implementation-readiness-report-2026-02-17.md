---
stepsCompleted: ['step-01-document-discovery', 'step-02-prd-analysis']
documentsInventoried:
  prd: "prd.md"
  architecture: "architecture.md"
  epics: "epics.md"
  ux: "ux-design-specification.md"
---

# Implementation Readiness Assessment Report

**Date:** 2026-02-17
**Project:** F.O.T.F — Direct Marketing Mastery School (Course Platform)

---

## PRD Analysis

### Functional Requirements

**Authentication (FR1–FR4)**
- FR1: User registration with email + password — triggers Emailit welcome email + Encharge welcome sequence
- FR2: User login with JWT session via Cloudflare Worker
- FR3: Password reset via Emailit transactional email with secure token
- FR4: Protected routes — course content, dashboard, admin panel require valid session

**Course & Lesson System (FR5–FR9)**
- FR5: Courses — title, slug, description, cover image, price, published status
- FR6: Lessons — title, slug, HTML content (Quill.js/TipTap), video_url (separate field), order, free preview flag
- FR7: Lesson progress tracking recorded in `lesson_progress` table with timestamps
- FR8: 3+ free preview lessons per course accessible without purchase (lead magnet)
- FR9: Curriculum Map — visual representation of full learning path across all courses

**Student Dashboard (FR10–FR16)**
- FR10: Welcome Bar — name, last seen date, login streak counter
- FR11: My Journey — visual progress map across full marketing stack modules
- FR12: My Courses — progress bars, "Continue Learning" CTA, completion badges, last accessed date
- FR13: Recent Activity — lessons completed, courses started, streak (light gamification)
- FR14: Unlock More — locked courses with free preview access + Stripe upsell CTA
- FR15: Work With Me — always-visible Cal.com booking button; shown again on course completion
- FR16: Latest From Blog — 3 most recently published posts on dashboard

**Blog (FR17–FR20)**
- FR17: Blog articles — title, slug, excerpt, body (HTML), cover image, published date, SEO meta fields
- FR18: Public-facing blog — no authentication required
- FR19: `GET /blog` listing page + `GET /blog/:slug` article page
- FR20: SEO from day one — meta tags, sitemap, clean slugs on all public pages

**Services / Consulting (FR21–FR25)**
- FR21: Static `/services` page with 3 consulting tiers clearly defined
- FR22: Cal.com embed for booking (hosted, free tier)
- FR23: Cal.com webhook `POST /api/webhooks/cal` — handles BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED
- FR24: On booking — log to D1 + `student_activity_log`, send Emailit confirmation, trigger Encharge pre-call sequence
- FR25: Post-call manual trigger → Encharge post-call follow-up + Stripe payment link

**Payments (FR26–FR29)**
- FR26: Stripe Checkout for course purchases (one-time payment)
- FR27: Stripe webhook `POST /api/webhooks/stripe` — handles `checkout.session.completed` + `payment_intent.payment_failed`
- FR28: On payment success — grant course access, send Emailit receipt, trigger Encharge course onboarding
- FR29: On payment failure — trigger Encharge dunning sequence + send Emailit admin alert

**Email System — Emailit Transactional (FR30–FR35)**
- FR30: Registration confirmation email
- FR31: Password reset email
- FR32: Course purchase receipt email
- FR33: Consultation booking confirmation email
- FR34: Consultation cancellation notice email
- FR35: Stripe payment failure admin alert email

**Email System — Encharge Automation (FR36–FR44)**
- FR36: Welcome + onboarding sequence (triggered on registration)
- FR37: Course onboarding sequence (triggered on purchase)
- FR38: Progress milestone emails at 25%, 50%, 75% completion
- FR39: Course completion email (100%)
- FR40: Re-engagement flow (inactive at day 3, 7, 14)
- FR41: Pre-call nurture sequence (triggered on Cal.com booking)
- FR42: Post-call follow-up + proposal (manual trigger)
- FR43: Dunning sequence (triggered on payment failure)
- FR44: Win-back / offboarding (triggered on subscription cancellation)

**Admin Dashboard (FR45–FR49)**
- FR45: Course management — create, edit, publish/unpublish courses and lessons
- FR46: Blog management — create, edit, publish blog posts
- FR47: Student CRM — view student list, profile, journey timeline, purchase history
- FR48: Revenue attribution report — revenue by traffic source/campaign
- FR49: Basic analytics — registrations, purchases, active students

**Customer Journey Tracking (FR50–FR55)**
- FR50: UTM parameter capture on first visit → stored in localStorage
- FR51: First-touch UTMs sent to Worker on registration → stored on `users` record
- FR52: Last-touch UTMs stored on `user_purchases` record on purchase
- FR53: GTM data layer events — page_view, user_registered, lesson_viewed, lesson_completed, course_purchased, consultation_booked, cta_clicked
- FR54: Admin CRM journey view per student — first visit → registration → first lesson → purchase → consultation
- FR55: Revenue attribution report visible in admin dashboard by source/campaign

**Total FRs: 55**

---

### Non-Functional Requirements

- NFR1: **Security** — JWT authentication; all protected routes validated server-side
- NFR2: **Security** — HTML content from WYSIWYG sanitized in Worker before D1 storage (XSS prevention)
- NFR3: **Security** — Video URLs stored as separate `video_url` field, never embedded in HTML content
- NFR4: **Security/Portability** — Stripe logic isolated in `/worker/src/lib/stripe.ts` (processor-agnostic abstraction)
- NFR5: **Reliability** — Cloudflare observability enabled from day one; Stripe failures trigger admin alert
- NFR6: **Reliability** — D1 migrations verified on staging environment before production deployment
- NFR7: **SEO** — Meta tags, sitemap, clean slug structure required in MVP (not deferred)
- NFR8: **Performance** — First lesson completable in under 10 minutes (retention design constraint)
- NFR9: **Performance** — Client-side search MVP; Worker search endpoint activates when catalog exceeds 100 items
- NFR10: **Scalability** — DB schema designed to support community features in future (extensible user profiles)
- NFR11: **Scalability** — Activity log retention: 90 days active data (archive/delete older — Phase 3)
- NFR12: **Scalability** — D1 read replicas planned when scale requires (Phase 3)
- NFR13: **Maintainability** — No build step (Alpine.js + static HTML + Cloudflare Pages)
- NFR14: **Maintainability** — Admin uses single `admin.js` with router pattern; no frontend framework

**Total NFRs: 14**

---

### Additional Requirements / Constraints

- **WYSIWYG Editor:** Quill.js vs TipTap — decision deferred but must resolve before admin build
- **Content minimum before launch:** 1 complete course + 3 free lessons + 5 blog posts (hard launch gate)
- **Subscription model:** Deferred to Phase 2 — one-time payments only at launch
- **Community layer:** Deferred to Phase 2 — DB schema must be extensible now
- **Affiliate program:** Deferred to Phase 2 via third-party tool (no custom build)
- **Email stack:** Emailit for transactional (REST API), Encharge for automation (webhooks) — both must be live at MVP

### PRD Completeness Assessment

The PRD is **thorough and well-structured**. Requirements are detailed with integration points explicitly defined (webhook payloads, DB fields, GTM events). The value ladder, personas, and risk register are clearly articulated. Two observations:
1. FRs are implicit in feature sections (not pre-numbered) — the epics document will need to demonstrate coverage of all 55 identified requirements
2. The email system has 15 distinct trigger/send points — high risk of gaps in stories if not mapped explicitly

---

## Epic Coverage Validation

### Reconciliation Note

The epics document uses 40 consolidated FRs (vs. 55 granular FRs extracted from the PRD). This is by design — the epics consolidate related email triggers into FR30 (Emailit) and FR31 (Encharge), and combine related blog/SEO items. Coverage is analyzed at the epics' FR level first, then cross-checked against the 55 granular PRD requirements.

### Coverage Matrix

| Epics FR | PRD Requirement (Summary) | Epic Coverage | Status |
|----------|--------------------------|---------------|--------|
| FR1 | Registration + Emailit + Encharge welcome | Epic 3, Story 3.1 | ✓ Covered |
| FR2 | JWT login via Worker | Epic 3, Story 3.2 | ✓ Covered |
| FR3 | Password reset via Emailit | Epic 3, Story 3.3 | ✓ Covered |
| FR4 | Protected routes + role auth | Epic 3, Story 3.4 | ✓ Covered |
| FR5 | Course model (title, slug, cover, price, published) | Epic 4, Story 4.1 | ✓ Covered |
| FR6 | Lesson model (content, video_url, order, free preview) | Epic 4, Story 4.1 | ✓ Covered |
| FR7 | Lesson progress tracking (lesson_progress table) | Epic 4, Story 4.4 | ✓ Covered |
| FR8 | 3+ free preview lessons (no auth required) | Epic 4, Stories 4.1, 4.3 | ✓ Covered |
| FR9 | Curriculum Map visual component | Epic 4, Story 4.5 | ✓ Covered |
| FR10 | Dashboard: Welcome Bar | Epic 6, Story 6.1 | ✓ Covered |
| FR11 | Dashboard: My Journey map | Epic 6, Story 6.2 | ✓ Covered |
| FR12 | Dashboard: My Courses progress | Epic 6, Story 6.3 | ✓ Covered |
| FR13 | Dashboard: Recent Activity + streak | Epic 6, Story 6.4 | ✓ Covered |
| FR14 | Dashboard: Unlock More + upsell | Epic 6, Story 6.4 | ✓ Covered |
| FR15 | Dashboard: Work With Me Cal.com CTA | Epic 6, Story 6.4 | ✓ Covered |
| FR16 | Dashboard: Latest From Blog (3 posts) | Epic 6, Story 6.4 | ✓ Covered |
| FR17 | Blog article model + public pages | Epic 2, Story 2.1, 2.2 | ✓ Covered |
| FR18 | Blog listing + article routes | Epic 2, Story 2.2 | ✓ Covered |
| FR19 | SEO meta injection + sitemap + clean slugs | Epic 2, Stories 2.2, 2.3 | ✓ Covered |
| FR20 | /services page with 3 consulting tiers | Epic 7, Story 7.1 | ✓ Covered |
| FR21 | Cal.com embed on services page | Epic 7, Story 7.1 | ✓ Covered |
| FR22 | Cal.com webhook handler (3 events) | Epic 7, Story 7.2 | ✓ Covered |
| FR23 | On booking: D1 log + activity log + Emailit + Encharge | Epic 7, Story 7.2 | ✓ Covered |
| FR24 | Post-call manual trigger → Encharge + Stripe link | Epic 7, Story 7.3 | ✓ Covered |
| FR25 | Stripe Checkout session (one-time) | Epic 5, Story 5.2 | ✓ Covered |
| FR26 | Stripe webhook handler (2 events) | Epic 5, Story 5.3 | ✓ Covered |
| FR27 | Payment success: access + Emailit + Encharge | Epic 5, Story 5.3 | ✓ Covered |
| FR28 | Payment failure: Encharge dunning + Emailit admin alert | Epic 5, Story 5.3 | ✓ Covered |
| FR29 | Stripe abstraction in stripe.ts | Epic 5, Story 5.1 | ✓ Covered |
| FR30 | All 6 Emailit transactional emails | Epics 3, 5, 7 | ✓ Covered |
| FR31 | All 9 Encharge automation sequences | Epics 3, 5, 6, 7 | ⚠️ Partial* |
| FR32 | Admin: course + lesson CRUD | Epic 8, Story 8.2 | ✓ Covered |
| FR33 | Admin: blog post CRUD | Epic 8, Story 8.3 | ✓ Covered |
| FR34 | Admin: Student CRM (list, profile, journey) | Epic 9, Story 9.1 | ✓ Covered |
| FR35 | Admin: Revenue attribution report | Epic 9, Story 9.2 | ✓ Covered |
| FR36 | Admin: Basic analytics | Epic 9, Story 9.3 | ✓ Covered |
| FR37 | utm.js UTM capture on first visit → localStorage | Epic 3, Story 3.5 | ✓ Covered |
| FR38 | First-touch UTMs stored on users record on registration | Epic 3, Story 3.5 | ✓ Covered |
| FR39 | Last-touch UTMs stored on user_purchases on purchase | Epic 5, Story 5.4 | ✓ Covered |
| FR40 | GTM data layer events (all 7 types) | Epic 9, Story 9.3 | ✓ Covered |

*FR31 partial — see Gap #3 below

---

### Missing & Gapped Requirements

#### 🔴 Gap 1 — CRITICAL: `student_activity_log` table has no migration story

**Impact:** The `student_activity_log` table is referenced in Stories 5.3, 6.5, 7.2, and 9.1 — but no story contains a migration that creates it. The table exists in the PRD schema and is fundamental to the CRM journey view and activity feed.

**Migration gap:** Migrations are numbered 0002–0008 across epics (blog, users, password_reset_tokens, courses_lessons, lesson_progress, user_purchases, consultation_bookings). `student_activity_log` is never created.

**Recommendation:** Add a migration step to Story 5.3 or a new Story (e.g. 5.0 or 1.4) that creates `0009_student_activity_log.sql` with: `id, user_id, event_type, metadata_json, created_at` + indexes on `user_id` and `created_at`.

---

#### 🔴 Gap 2 — CRITICAL: No story for first admin account creation

**Impact:** The system uses `role: "admin"` JWT claims (Story 3.4), admin routes are protected by `requireAdmin` middleware, but no story describes how the first admin user is seeded or created. Without this, the admin panel can never be accessed.

**Recommendation:** Add an acceptance criterion to Story 1.1 (infrastructure setup) or Story 3.4 (auth middleware) for seeding an admin user — e.g., via a migration with a hashed password, a `wrangler d1 execute` command, or a one-time setup endpoint that self-destructs after first use.

---

#### 🟡 Gap 3 — MEDIUM: Win-back/offboarding Encharge trigger has no activation path in Phase 1

**Impact:** FR31 includes "Win-back / offboarding (subscription cancelled)" as an Encharge automation, but Phase 1 explicitly defers subscriptions to Phase 2. No story creates a subscription cancellation webhook handler or trigger point. The sequence will be configured in Encharge but can never fire.

**Recommendation:** Either (a) remove "Win-back / offboarding" from FR31's Phase 1 scope and note it as Phase 2 in the epics, or (b) add a note in Story 5.3's AC confirming this trigger is a no-op placeholder until subscriptions ship.

---

#### 🟡 Gap 4 — MEDIUM: R2 bucket initialization missing from infrastructure setup

**Impact:** The architecture specifies Cloudflare R2 for images and assets. `cover_image_url` fields appear in `courses`, `blog_posts`, and `users` tables. Story 1.1 creates D1 databases and CI/CD but does not include `wrangler r2 bucket create` for staging and production R2 buckets.

**Recommendation:** Add R2 bucket creation steps to Story 1.1's acceptance criteria: `wrangler r2 bucket create fotf-platform-assets-staging` and `wrangler r2 bucket create fotf-platform-assets-production`, with R2 binding added to `wrangler.toml`.

---

#### 🟢 Gap 5 — LOW: Image upload mechanism undefined in admin

**Impact:** Stories 8.2 and 8.3 reference `cover_image_url` as a form field but acceptance criteria describe it only as a text input URL field. There is no story for uploading images to R2 or generating R2 URLs from the admin panel. For MVP this is workable (paste URLs from external uploads), but it's ambiguous.

**Recommendation:** Clarify in Story 8.2/8.3 AC that `cover_image_url` is a text input for Phase 1 (manual URL paste). Flag R2 direct upload as a Phase 2 admin enhancement.

---

### Coverage Statistics

- Total Epics FRs: 40
- FRs fully covered in stories: 39 (97.5%)
- FRs partially covered: 1 (FR31 — win-back trigger has no activation path)
- Critical structural gaps found: 2 (student_activity_log migration, admin seeding)
- Medium gaps found: 2 (R2 setup, win-back trigger)
- Low gaps found: 1 (image upload ambiguity)

---

## UX Alignment Assessment

### UX Document Status

✅ **Found** — `ux-design-specification.md` (44K, 14 steps completed). Comprehensive specification covering: emotional design, user journeys (5 flows), design system, component library, responsive strategy, accessibility (WCAG 2.1 AA).

### UX ↔ PRD Alignment

Strong alignment overall. The UX spec is directly derived from the PRD's personas, value ladder, and feature requirements. The brand aesthetic (neumorphism, F.O.T.F. tokens, dark mode default) and core UX principles are entirely consistent. Three PRD requirements received significant UX elaboration not reflected in stories:

### UX ↔ Epics Alignment Issues

#### 🔴 Issue 1 — CRITICAL: Soft Gate behavior contradicts between UX spec and Story 4.3

**UX spec says:** The Soft Gate fires at the *end* of a free preview lesson. Free preview content is fully accessible first — the gate earns the registration ask. Journey 1: "Free Lesson Preview → Reads/watches → {Soft Gate at Lesson End}." The Soft Gate component explicitly states: "Does not block lesson playback until end."

**Story 4.3 says:** "Given a non-preview lesson URL is visited by an unauthenticated visitor... a 'Soft Gate' modal overlay is shown... the lesson content is not visible."

**The conflict:** These describe two different gates. The UX gate is for unauthenticated users who finish a FREE PREVIEW (content is shown, gate fires after). The Story gate is for unauthenticated users hitting PAID CONTENT (content blocked). Story 4.3 correctly handles the paid-content gate but has NO acceptance criteria for the "free preview → end-of-lesson register prompt" flow described in the UX. This conversion flow (blog → free lesson → register) is the primary funnel.

**Recommendation:** Add AC to Story 4.3 for the free preview soft gate: "Given an unauthenticated visitor reaches the end of a free preview lesson, When the lesson content ends, Then a registration prompt overlays the completion area — the full lesson content was readable, the gate fires at the end."

---

#### 🔴 Issue 2 — CRITICAL: "Launch Ritual" ceremony not in stories

**UX spec says:** Every lesson ends with a deliberate "Launch Ritual" — gold "Launch It" button → confirmation modal → confirmed → celebration flash → progress update. This is the platform's defining interaction ("the heartbeat"). The UX spec classifies it as a Phase 1 Core component.

**Stories say:** Story 4.4 AC: "Given a logged-in student clicks **'Mark as Complete'**..." — a simple button interaction, no confirmation ritual.

**The conflict:** The UX spec introduces a conceptually different completion ceremony. "Mark as Complete" is a checkbox; the Launch Ritual is a behavioral confirmation. The component specification includes a gold `launch` button variant, a confirmation modal, and an Alpine.js state machine (idle → confirming → launching → complete). None of this appears in the story acceptance criteria.

**Recommendation:** Update Story 4.4 (or add Story 4.6) to include Launch Ritual AC: the gold Launch It button, the confirmation modal, and the three-state animation flow. This is a significant implementation scope increase vs. a simple mark-complete button.

---

#### 🟡 Issue 3 — MEDIUM: Blog inline CTAs to free lessons not in stories

**UX spec says:** Journey 1 shows "Blog Article Page →|Inline CTA: 'See this applied'| → Free Lesson Preview." The blog article experience is designed to funnel readers directly to a free lesson relevant to the article.

**Stories say:** Story 2.2 renders `content_html` from D1 — no mechanism exists for blog-to-lesson inline CTAs. The blog article model has no `related_lesson_slug` or CTA field.

**Recommendation:** Either (a) add a `related_lesson_slug` field to `blog_posts` and add AC to Story 2.2 for rendering a CTA to the related free lesson, or (b) clarify that these CTAs are embedded directly in `content_html` via the admin editor (manual content approach). Document the decision.

---

#### 🟡 Issue 4 — MEDIUM: Cart abandonment email (1hr) not in PRD or epics

**UX spec says:** Journey 2: "Abandons Stripe checkout → K[Encharge: cart recovery email at 1hr]."

**PRD and epics say:** No cart abandonment sequence in FR31's email list. No webhook event for Stripe checkout abandonment is handled.

**Note:** Stripe's `checkout.session.expired` event fires when a checkout session expires (default 24hr). This could trigger the abandonment email but it's not in Story 5.3.

**Recommendation:** Add the cart abandonment email to FR31's scope or explicitly note it as Phase 2. Ambiguity here risks the re-engagement loop being incomplete at launch.

---

#### 🟡 Issue 5 — MEDIUM: Milestone Toast UI has no story

**UX spec says:** "Milestone Toast: Non-intrusive celebration at 25/50/75/100% completion. Slides in bottom-right, 4s display, never blocks content." This is a Phase 2 component in the UX roadmap.

**Stories say:** Story 6.5 fires Encharge webhook on milestones — the email sequence is covered. But no story covers the in-browser Milestone Toast notification UI.

**Recommendation:** Add a UI AC to Story 6.5 or Story 4.4: "When a milestone threshold is crossed, a toast notification slides in from the bottom-right with the achievement message, displays for 4 seconds, then auto-dismisses." Respect `prefers-reduced-motion` by skipping animation if set.

---

#### 🟢 Issue 6 — LOW: Admin sidebar discrepancy (UX vs. Story 8.1)

**UX spec says:** Left sidebar items: Students · Courses · Consultations · Settings

**Story 8.1 says:** Admin nav links: Courses · Blog · Students · Analytics

The UX omits "Blog" and "Analytics" (which exist in stories). The UX includes "Consultations" and "Settings" (which don't appear in Story 8.1). Minor inconsistency — likely a UX spec oversight vs. the final story-driven scope. Not a blocker.

**Recommendation:** Align Story 8.1 AC to match the final agreed admin navigation: Courses, Blog, Students, Analytics — and update UX spec if that's the accepted direction.

---

#### 🟢 Issue 7 — LOW: Day 30 re-engagement not in PRD/epics

**UX spec says:** Journey 5 includes "Day 30 — win-back direct ask" as the third inactivity touch.

**PRD says:** Re-engagement at day 3, 7, 14 only.

**Recommendation:** Minor — clarify if Day 30 is in scope for Phase 1 or Phase 2. Add to FR31 if desired, or document as a Phase 2 Encharge sequence addition.

---

### Alignment Summary

| Area | Status |
|------|--------|
| UX ↔ PRD overall | ✅ Strongly aligned |
| UX ↔ Architecture (stack, tokens, dark mode) | ✅ Fully aligned |
| Soft Gate behavior (free preview funnel) | 🔴 Conflict in Story 4.3 |
| Launch Ritual vs. Mark as Complete | 🔴 Significant gap in Story 4.4 |
| Blog → lesson inline CTAs | 🟡 Not in stories/schema |
| Cart abandonment email | 🟡 Not in PRD/epics |
| Milestone Toast UI | 🟡 Not in stories |
| Admin sidebar items | 🟢 Minor inconsistency |
| Day 30 re-engagement | 🟢 Minor scope question |

---

## Epic Quality Review

### Best Practices Standards Applied

- Epics deliver user value (not technical milestones)
- Epic independence — each epic works with only prior epics' outputs
- Story independence — no forward dependencies
- Database tables created when first needed (not upfront)
- Given/When/Then AC format throughout
- Developer stories flagged (not user-value stories)

### Epic-by-Epic User Value Check

| Epic | Title | User Value? | Independence | Verdict |
|------|-------|-------------|--------------|---------|
| Epic 1 | Platform Foundation | ⚠️ Partial | N/A (first epic) | Acceptable with caveat |
| Epic 2 | Blog & Public Discovery | ✅ Visitors can read blog | Epic 1 only | ✅ |
| Epic 3 | User Authentication | ✅ Users can register/login | Epic 1 | ✅ |
| Epic 4 | Course & Lesson Access | ✅ Students can access content | Epic 1, 3 | ✅ |
| Epic 5 | Payments & Enrollment | ✅ Students can purchase | Epic 1, 3, 4 | ✅ |
| Epic 6 | Student Dashboard | ✅ Students have a home base | Epic 1, 3, 4, 5 | ✅ |
| Epic 7 | Consulting & Booking | ✅ Prospects can book calls | Epic 1 (services page standalone) | ✅ |
| Epic 8 | Admin Content Management | ✅ Admin can build content | Epic 1, 3 | ✅ |
| Epic 9 | Admin CRM & Analytics | ✅ Admin sees business data | All prior epics | ✅ |

---

### 🔴 Critical Quality Violations

#### Violation 1 — Story 5.1 uses developer persona ("As a developer")

**Story 5.1:** "As a **developer**, I want all Stripe interactions isolated in a single abstraction layer..."

Developer persona stories violate user story best practices. This story has no user value — it's a technical implementation task. BMAD best practice: stories must be written from a user or operator perspective with a user outcome.

**Remediation:** Reframe as: "As a platform operator, I want payment processing to remain reliable and portable, so that I can switch processors without rebuilding the integration." Or, move the Stripe abstraction requirement into Story 5.2's AC as a technical constraint, rather than a standalone story.

---

#### Violation 2 — Milestone idempotency has no implementation path in AC

**Story 6.5 AC:** "fires exactly once per milestone threshold per student per course — crossing from 24% to 26% only fires the 25% milestone once, not again if they revisit."

This AC requires the Worker to track which milestones have been sent per student per course. But there is no corresponding DB table, column, or query defined anywhere in the stories to persist this state. The AC mandates once-and-only-once delivery but provides no mechanism to achieve it. As written, every `POST /api/lessons/:id/complete` call that crosses a threshold would re-fire the Encharge webhook.

**Remediation:** Add a `lesson_milestones_sent` table (or a `milestones_sent` JSON column on `user_purchases`) to Story 6.5's AC, with a check before firing: "Given a milestone has already been sent for this threshold/student/course combination, When the completion percentage crosses it again, Then no duplicate webhook fires."

---

### 🟠 Major Issues

#### Issue A — Epic 1 Story 1.1 is entirely infrastructure (no user value)

Story 1.1 "Initialize Cloudflare Project Infrastructure" is developer-only. This is standard for greenfield projects and widely accepted as Epic 1 Story 1 in BMAD workflows, but technically violates user-value standards. Stories 1.2 and 1.3 in Epic 1 do deliver user-facing value (dark mode, navigation shell). Acceptable as-is given greenfield context.

---

#### Issue B — Story 4.3 (Lesson Player) missing in-lesson navigation AC

Story 4.3 covers: free preview access, paid access gate, video rendering, and the end-of-course completion prompt. It does NOT cover navigation from one lesson to the next within a course while mid-lesson. "Next lesson" navigation is implied by Story 4.4's "Continue Learning CTA points to first incomplete lesson" but only for the dashboard. The lesson player itself has no AC for "When the student finishes a lesson that is not the last in the course, Then a 'Next Lesson →' link appears."

---

#### Issue C — `module_category` added to schema without PRD update

Story 4.1 adds `module_category` to the `courses` table. This field is required for the Journey Path Map (Epic 4 Story 4.5), the course catalog grouping (Story 4.2), and dashboard progress (Story 6.2). The PRD schema does not include `module_category` — it was added during architecture/epic planning. The field is correctly present in all relevant stories. The PRD schema section is simply outdated. Not a blocker but worth noting.

---

### 🟡 Minor Concerns

#### Concern 1 — Typo in Story 9.3 API response

Story 9.3 AC: `revenueLastt30Days` — double 't'. Should be `revenueLast30Days`. Minor but will cause API response key mismatch if implemented as written.

---

#### Concern 2 — Story 4.5 (Journey Path Map) has forward reference

Story 4.5 AC: "the same component definition can be reused in the student dashboard (Epic 6) without duplication — it accepts a `showProgress` prop to toggle between discovery and progress modes."

This is a forward reference to Epic 6. The component is designed with a future prop (`showProgress`) for a feature not yet in scope. This is intentional design-for-reuse, but technically introduces coupling to future work. Minor — the component still works without the prop.

---

#### Concern 3 — Login streak logic lives in Epic 6, not Epic 3

The `login_streak` column is created in Story 3.1's migration (users table), but the streak increment/reset logic is in Story 6.1. This means the `login_streak` column exists from Epic 3 but is not populated until Epic 6 is implemented. Students logging in during Epics 3-5 will have streak = 0/null. No functional breakage but dashboard will show incorrect streak on first display.

---

#### Concern 4 — No explicit Story 7 ↔ Epic 3 dependency noted

Story 7.2 (Cal.com webhook) handles bookings from non-registered users (`user_id = NULL`). This is correct and well-designed. However, the story's "happy path" assumes a registered user booking — the non-registered path is an edge case AC. Worth confirming this edge case is actually tested in the implementation.

---

### Compliance Checklist Results

| Check | Result |
|-------|--------|
| All epics deliver user value | ✅ (with Epic 1 / Story 1.1 caveat) |
| Epic independence maintained | ✅ |
| Stories appropriately sized | ✅ All stories are implementable in isolation |
| No problematic forward dependencies | ⚠️ Story 4.5 forward ref (minor) |
| Database tables created when needed | ⚠️ student_activity_log missing migration |
| Given/When/Then AC format | ✅ Consistent throughout |
| FR traceability maintained | ✅ |
| Developer persona stories | 🔴 Story 5.1 violation |
| Milestone idempotency mechanism | 🔴 No implementation path |

---

## Summary and Recommendations

### Overall Readiness Status

> **⚠️ NEEDS WORK** — 4 critical issues must be resolved before implementation begins. The planning artifacts are of high quality overall; the gaps identified are targeted and fixable in a single focused session.

---

### Full Issues Registry

| # | Severity | Category | Issue |
|---|----------|----------|-------|
| 1 | 🔴 Critical | Missing Migration | `student_activity_log` table has no migration story — runtime failure guaranteed |
| 2 | 🔴 Critical | Missing Story | No admin account creation/seeding story — admin panel inaccessible at launch |
| 3 | 🔴 Critical | UX Conflict | Soft Gate behavior contradicts between UX spec and Story 4.3 — primary conversion funnel will be built wrong |
| 4 | 🔴 Critical | UX Gap | Launch Ritual ceremony absent from all stories — defining platform interaction missing from scope |
| 5 | 🔴 Critical | AC Incomplete | Milestone idempotency AC in Story 6.5 has no DB mechanism — Encharge will receive duplicate webhooks |
| 6 | 🔴 Critical | Story Quality | Story 5.1 uses developer persona — not a user story, violates structure |
| 7 | 🟡 Medium | Infrastructure | R2 bucket initialization missing from Story 1.1 — deployment will fail when cover images are first used |
| 8 | 🟡 Medium | Scope Gap | Win-back/offboarding Encharge trigger (FR31) has no activation path in Phase 1 (no subscriptions) |
| 9 | 🟡 Medium | UX Gap | Blog → lesson inline CTAs (primary funnel CTA) not in stories or blog schema |
| 10 | 🟡 Medium | UX Gap | Cart abandonment email (1hr post-abandon) in UX Journey 2 but not in PRD/epics |
| 11 | 🟡 Medium | UX Gap | Milestone Toast UI component (in-browser notification) has no story |
| 12 | 🟡 Medium | AC Incomplete | Story 4.3 missing "next lesson" navigation AC for lesson player |
| 13 | 🟡 Medium | Schema | `module_category` field added to courses table without PRD schema update |
| 14 | 🟢 Low | Inconsistency | Admin sidebar items differ between UX spec and Story 8.1 |
| 15 | 🟢 Low | Scope | Day 30 re-engagement in UX spec not in PRD/epics |
| 16 | 🟢 Low | Typo | `revenueLastt30Days` in Story 9.3 API response key |
| 17 | 🟢 Low | Design | Story 4.5 forward reference to Epic 6 props |
| 18 | 🟢 Low | Sequencing | Login streak logic in Epic 6 (not Epic 3) — streak shows 0 during Epics 3-5 |
| 19 | 🟢 Low | Ambiguity | Image upload mechanism undefined in admin (URL paste implied but not explicit) |

---

### Critical Issues — Required Before First Commit

**Fix 1: Add `student_activity_log` migration**
Add Story 1.4 (or a new story in Epic 3/5) with migration `0001_student_activity_log.sql` creating: `id, user_id, event_type, metadata_json, created_at` with indexes on `user_id` and `created_at`.

**Fix 2: Add admin account seeding story**
Add an AC to Story 1.1 or Story 3.4: "Given the project is first deployed, When `wrangler d1 execute` or a seed migration runs, Then an admin user exists with hashed credentials and `role: 'admin'` — this is the only way to access the admin panel."

**Fix 3: Resolve Soft Gate conflict**
Add an AC to Story 4.3: "Given an unauthenticated visitor has reached the end of a free preview lesson, When the lesson content ends, Then a registration prompt overlays the completion area — the lesson content was fully viewable, the gate fires at the END, not the beginning." Remove the ambiguity about whether free preview lessons show content or not.

**Fix 4: Add Launch Ritual to Story 4.4**
Update Story 4.4 to reflect the Launch Ritual: gold "Launch It" button triggers a confirmation modal; confirmed state fires `POST /api/lessons/:id/complete`; progress bar animates on return. Note: this is a scope increase from a simple mark-complete button — estimate accordingly.

**Fix 5: Add milestone idempotency mechanism to Story 6.5**
Add AC: "Given a `lesson_milestones_sent` check (stored as JSON on `user_purchases.milestones_sent` or a separate table), When a milestone has already been recorded for this student/course/threshold, Then the Encharge webhook does not fire again."

**Fix 6: Rework Story 5.1 persona**
Change "As a developer" to "As a platform operator, I want payment logic isolated, so that..." or absorb the technical constraint into Story 5.2's implementation notes.

---

### Recommended Next Steps

1. **Address all 6 Critical fixes in epics.md** — estimated 2-3 hours of focused story editing
2. **Align Story 4.3 soft gate behavior with UX spec** — decide definitively: does the soft gate fire at the start or end of a free preview? Update both documents to match
3. **Decide on Launch Ritual scope** — confirm the gold "Launch It" ceremony is Phase 1 scope (per UX spec). If yes, update Story 4.4. If deferred to Phase 2, update the UX spec component roadmap accordingly
4. **Add R2 setup to Story 1.1** — 2 CLI commands, no design work needed
5. **Resolve blog inline CTA approach** — decide: (a) add `related_lesson_slug` field to blog schema, or (b) embed CTAs manually in `content_html` via admin editor. Document the decision in epics.md
6. After critical fixes: **proceed to implementation** — the foundation is solid

---

### Strengths (What's Done Well)

The planning artifacts represent exceptional preparation for a solo greenfield build:

- **PRD is specific and detailed** — webhook payloads, DB schemas, GTM events, email triggers all explicitly defined. Very low implementation ambiguity.
- **Architecture decisions are locked** — stack, patterns, and tools are decided. No analysis paralysis during implementation.
- **Epic independence is clean** — 9 epics with clear sequencing, no circular dependencies found.
- **AC coverage is thorough** — error conditions, idempotency, edge cases (non-registered Cal.com bookings, duplicate payments) are explicitly handled throughout.
- **UX spec is distinctive** — the hybrid direction approach is intentional and well-reasoned. Dark mode default, neumorphic design system, and accessibility targets are implementation-ready.

---

**Assessment completed:** 2026-02-17
**Report saved:** `planning-artifacts/implementation-readiness-report-2026-02-17.md`
**Total issues found:** 19 (6 critical, 7 medium, 6 low)
