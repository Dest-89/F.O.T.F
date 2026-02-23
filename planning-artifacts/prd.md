---
stepsCompleted: ['step-01-init']
inputDocuments: ['Downloads/Course Platform Project Specification Update V3.md']
briefCount: 0
researchCount: 0
brainstormingCount: 1
projectDocsCount: 0
workflowType: 'prd'
classification:
  projectType: 'web_app'
  projectSubtype: 'Marketing Education Platform (Direct Marketing Mastery School)'
  domain: 'edtech + direct_marketing'
  complexity: 'medium'
  projectContext: 'greenfield'
  audience: 'Aspiring online marketers and entrepreneurs — adults seeking first-principles marketing education'
  corePositioning: 'Teaches the full marketing stack from first principles (research → traffic → funnels → email/SMS) — not just tools'
  ownershipPhilosophy: 'Full data and audience ownership — no platform tax, no revenue share'
  futurePhase: 'Community layer (members meeting, sharing tips, evolving together)'
  emailStack:
    transactional: 'Emailit (REST API from Worker — password reset, receipts, welcome)'
    automation: 'Encharge (webhooks from Worker — sequences, lifecycle, re-engagement)'
  toolOwnership:
    encharge: '50k contacts LTD'
    blastable: '1M contacts LTD (not used in platform — broadcast only)'
  elicitationInsights:
    - 'CRM is a core differentiator, not a nice-to-have — elevate in PRD'
    - 'Blog drives organic traffic into an owned funnel — strategic asset'
    - 'Lead magnet model is top-of-funnel for a fully owned ecosystem'
    - 'Platform is the business — build cost amortizes within 12-18 months vs SaaS'
  userPersonas:
    - name: 'Alex (Aspiring Entrepreneur)'
      needs: 'Free previews to de-risk purchase, clear curriculum map, quick wins'
    - name: 'Maria (Tool Collector)'
      needs: 'Principle-first content not tool tutorials, credibility signals, blog trust-building'
    - name: 'James (The Skeptic)'
      needs: 'Lifetime access option, data ownership messaging, platform permanence signals'
    - name: 'Priya (Community Seeker)'
      needs: 'Community layer (future phase), peer discussion, shared progress'
  valueLadder:
    free: 'Blog posts + free lesson previews (organic traffic, trust building)'
    lowTicket: 'Courses — one-time purchase or subscription'
    highTicket: 'Consulting — group program or 1-on-1 intensive (booked via Cal.com)'
    highestTicket: 'Done-with-you retainer — ongoing partnership'
  consultingLayer:
    page: '/services — static page with Cal.com embed'
    bookingTool: 'Cal.com (hosted, not self-hosted) — free tier'
    webhook: 'POST /api/webhooks/cal — handles BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED'
    onBooking:
      - 'Log to D1 (name, email, service, time)'
      - 'Log to student_activity_log as consultation_booked'
      - 'Emailit → booking confirmation (transactional)'
      - 'Encharge → pre-call nurture sequence (automation)'
    postCall: 'Manual trigger → Encharge post-call follow-up + Stripe payment link'
    tiers:
      - 'Group program (cohort-based, beginners, scalable)'
      - '1-on-1 intensive (specific problem: traffic, funnel, email)'
      - 'Done-with-you retainer (monthly, ongoing — future)'
  emailDistribution:
    emailit_transactional:
      - 'Registration confirmation'
      - 'Password reset'
      - 'Course purchase receipt'
      - 'Consultation booking confirmation'
      - 'Consultation cancellation notice'
    encharge_automation:
      - 'Welcome + onboarding sequence (on registration)'
      - 'Course onboarding sequence (on purchase)'
      - 'Progress milestone emails (25/50/75%)'
      - 'Course completion email (100%)'
      - 'Re-engagement flow (inactive 7/14 days)'
      - 'Pre-call nurture sequence (on Cal.com booking)'
      - 'Post-call follow-up + proposal (manual trigger)'
      - 'Dunning sequence (payment failed)'
      - 'Win-back / offboarding (subscription cancelled)'
  customerJourneyTracking:
    utmCapture:
      - 'JavaScript captures UTM params on first visit and stores in localStorage'
      - 'On registration: first-touch UTMs sent to Worker → stored on users record'
      - 'On purchase: last-touch UTMs stored on user_purchases record'
    schemaAdditions:
      users: 'first_touch_source, first_touch_medium, first_touch_campaign, first_touch_page'
      user_purchases: 'attribution_source, attribution_medium, attribution_campaign'
    gtmEvents:
      - 'page_view: page, user_id'
      - 'user_registered: source, medium, campaign'
      - 'lesson_viewed: lesson_id, course_id, user_id'
      - 'lesson_completed: lesson_id, course_id, user_id, progress_%'
      - 'course_purchased: course_id, amount, user_id, source, campaign'
      - 'consultation_booked: service_type, user_id, source'
      - 'cta_clicked: cta_label, page, user_id'
    crmJourneyView: 'Student profile shows: first visit date/source → registration → first lesson → purchase (with attribution) → consultation booked'
    revenueAttributionReport: 'Admin dashboard shows revenue by traffic source/campaign — organic/blog, email/encharge, direct, etc.'
  technicalDecisions:
    frontendReactivity: 'Alpine.js — lightweight reactivity on static HTML, no build step, works with Cloudflare Pages'
    wysiwygEditor: 'Quill.js or TipTap (open source) — HTML output sanitized in Worker before storing in D1'
    youtubeEmbeds: 'Separate video_url field — NOT embedded inside HTML content'
    searchStrategy: 'Client-side MVP → Worker search endpoint (GET /api/courses?search=) when catalog exceeds 100 items'
    adminArchitecture: 'Single admin.js with router pattern + shared vanilla JS components — no framework'
    dbMigrations: 'Staging + production Cloudflare environments — migrations verified on staging before production'
    paymentAbstraction: 'Stripe logic isolated in /worker/src/lib/stripe.ts — processor-agnostic design'
    seoFromDayOne: 'Meta tags, sitemap, clean slug structure required in MVP — blog is primary traffic moat'
  riskMitigations:
    - risk: 'No traffic at launch'
      severity: 'critical'
      prevention: 'Content launch minimum — 1 complete course + 3 free lessons + 5 blog posts before go-live. Blog and lead magnet are MVP, not deferred.'
    - risk: 'Student drop-off / no retention'
      severity: 'critical'
      prevention: 'First lesson of every course completable in under 10 minutes (quick win). Dashboard streak + activity feed are must-haves. Encharge re-engagement fires at day 3, 7, and 14 of inactivity.'
    - risk: 'Consultation bookings but no closes'
      severity: 'high'
      prevention: 'Encharge pre-call and post-call sequences mandatory before Cal.com goes live. Services page must define 3 tiers clearly.'
    - risk: 'Silent tech failures (Stripe webhooks, D1 migrations)'
      severity: 'high'
      prevention: 'Cloudflare observability enabled from day one. Stripe webhook failures trigger admin Emailit alert. D1 migrations tested on staging before production.'
    - risk: 'Scope overwhelm — never ships'
      severity: 'critical'
      prevention: 'Tight Phase 1 MVP defined — minimum to get first paying student. All other features are post-revenue phases.'
  pricingStrategy:
    course: '$399 one-time per course'
    discoveryCall: 'FREE (Phase 1) — lower barrier to get first clients. Revisit paid $399 once social proof exists.'
    paidAuditFuture: '$399 Marketing Audit session (Phase 2+) — standalone deliverable, credited toward program if they upgrade'
    threeMonthProgram: '$999 (group or 1-on-1, 3 months)'
    sixMonthProgram: '$15,000 (premium 1-on-1 done-with-you, 6 months)'
  goToMarket:
    existingAudience: 'None — brand new project, zero to one'
    primaryChannel: 'Organic — blog SEO + free lesson previews as lead magnet'
    trafficFlywheel: 'Blog posts → free lessons → register → Encharge sequence → course purchase → consultation booking → close'
    launchMinimum: '1 complete course + 3 free preview lessons + 5 blog posts before go-live'
  whatIfScenarios:
    communityAsMainProduct: 'Design DB to support community features in future (extensible user profiles). Subscription model + community = stronger retention than one-time course sales.'
    scaleToTenK: 'Activity log retention policy: 90 days active, archive/delete older. Ensure all indexes in place from day one. D1 read replicas planned for scale.'
    competitorCopies: 'Blog SEO is moat-builder — meta tags, sitemap, clean slug structure are MVP requirements, not afterthoughts.'
    affiliateProgram: 'Defer to Phase 2. Use third-party tool (not custom-built). Note for roadmap.'
    paymentProcessorRisk: 'Stripe logic abstracted behind /worker/src/lib/stripe.ts wrapper — processor-agnostic design. Could swap to LemonSqueezy/Paddle with minimal changes.'
  mvpRequirements:
    - '1 complete published course with lessons'
    - '3+ free preview lessons (lead magnet)'
    - '5+ blog posts live at launch'
    - 'Auth (register, login, password reset)'
    - 'Stripe checkout for course purchase'
    - 'Student dashboard with progress + streak'
    - 'Emailit transactional emails working'
    - 'Encharge welcome + course onboarding sequences'
    - 'Services page with Cal.com embed'
    - 'Admin dashboard (basic course + blog management)'
    - 'Cloudflare observability + Stripe failure alerting'
  studentDashboard:
    sections:
      - 'Welcome bar: name, last seen, login streak'
      - 'My Journey: visual progress across full marketing stack (Research→Traffic→Funnels→Email→Advanced)'
      - 'My Courses: progress bars, continue learning, completion badges, last accessed'
      - 'Recent Activity: lessons completed, courses started, streak (light gamification)'
      - 'Unlock More: locked courses with free preview + Stripe upsell CTA'
      - 'Work With Me: always visible Cal.com booking CTA + shown again on course completion'
      - 'Latest From Blog: 3 most recent published posts'
---

# Product Requirements Document - Course Platform

**Author:** Mister Dest
**Date:** 2026-02-16
**Status:** Draft — Ready for Technical Architecture

---

## 1. Executive Summary

The **Direct Marketing Mastery School** is a self-hosted online learning platform that teaches marketing from first principles — not tool tutorials. The platform is owned infrastructure: no platform tax, no revenue share, no audience lock-in.

The business operates a full value ladder:
- **Free:** Blog posts + free lesson previews (traffic and trust)
- **Low-ticket:** $399/course one-time purchase
- **High-ticket:** $999 group program / $15,000 done-with-you intensive (booked via Cal.com)

The platform *is* the business. Build cost amortizes within 12–18 months versus recurring SaaS fees.

---

## 2. Problem Statement

The online education market is flooded with tool-specific courses and platform-dependent businesses. Students are left:
- Collecting tools without understanding principles
- Building audiences on rented platforms (Teachable, Kajabi)
- Losing data and relationships when they switch providers
- Paying platform revenue share indefinitely

This platform solves all four by teaching first-principles marketing while running on infrastructure the owner controls completely.

---

## 3. Goals & Success Metrics

### Phase 1 (Launch) Goals
| Goal | Metric |
|------|--------|
| First paying student | Stripe payment confirmed within 60 days of launch |
| Content minimum | 1 course + 3 free lessons + 5 blog posts live at go-live |
| Email automation live | Encharge welcome + course onboarding sequences active |
| Consulting pipeline | Cal.com bookings converting to discovery calls |

### Long-term Goals
| Goal | Metric |
|------|--------|
| Break-even vs SaaS | Platform pays for itself within 12–18 months |
| Email list growth | 1,000+ opted-in subscribers from blog/lead magnet funnel |
| Retention | 70%+ course completion rate via streak + re-engagement |
| Consulting revenue | At least one $999+ close within 90 days of launch |

---

## 4. User Personas

### Alex — Aspiring Entrepreneur
- Wants free previews before committing
- Needs a clear curriculum map showing the full learning path
- Motivated by quick wins (first lesson completable in under 10 minutes)

### Maria — The Tool Collector
- Frustrated by courses that teach Mailchimp, not email marketing
- Needs principle-first content, not software walkthroughs
- Builds trust through blog posts before purchasing

### James — The Skeptic
- Has been burned by platforms shutting down
- Responds to lifetime access, data ownership messaging, and platform permanence signals
- Price-sensitive — needs clear ROI

### Priya — The Community Seeker
- Wants peer connection and shared progress
- Will be served by the future community layer (Phase 2+)
- For now: dashboard activity feed and progress visibility satisfy partially

---

## 5. Value Ladder & Business Model

```
Blog/Free Lessons (Traffic)
        ↓
Email List via Lead Magnet
        ↓
Course Purchase ($399)
        ↓
Discovery Call (Free → Paid $399 in Phase 2)
        ↓
Group Program ($999 / 3 months)
        ↓
Done-With-You Intensive ($15,000 / 6 months)
```

**Traffic Flywheel:**
Blog SEO → Free lesson preview → Register → Encharge onboarding → Course purchase → Consultation booking → Close

---

## 6. Feature Requirements

### 6.1 Authentication

- **Register:** Email + password, Emailit welcome email, Encharge welcome sequence trigger
- **Login:** JWT session via Cloudflare Worker
- **Password Reset:** Emailit transactional email with secure token
- **Protected Routes:** Course content, dashboard, admin panel require valid session

### 6.2 Course & Lesson System

- **Courses:** Title, slug, description, cover image, price, published status
- **Lessons:** Title, slug, content (HTML via Quill.js/TipTap), video_url (separate field — not embedded in HTML), order, free preview flag
- **Progress Tracking:** Lesson completions recorded in `lesson_progress` table with timestamps
- **Free Previews:** 3+ lessons per course accessible without purchase (lead magnet)
- **Curriculum Map:** Visual representation of full learning path across all courses (Research → Traffic → Funnels → Email → Advanced)

### 6.3 Student Dashboard

| Section | Detail |
|---------|--------|
| Welcome Bar | Name, last seen date, login streak counter |
| My Journey | Visual progress map across full marketing stack modules |
| My Courses | Progress bars, "Continue Learning" CTA, completion badges, last accessed date |
| Recent Activity | Lessons completed, courses started, streak (light gamification) |
| Unlock More | Locked courses with free preview access + Stripe upsell CTA |
| Work With Me | Always-visible Cal.com booking button; shown again on course completion |
| Latest From Blog | 3 most recently published posts |

### 6.4 Blog

- Articles with title, slug, excerpt, body (HTML), cover image, published date, SEO meta fields
- Public-facing — no auth required
- Primary organic traffic channel — SEO from day one (meta tags, sitemap, clean slugs)
- `GET /blog` listing page, `GET /blog/:slug` article page
- 5+ posts required before launch

### 6.5 Services / Consulting Page

- Static `/services` page with three tiers clearly defined:
  1. Group Program (cohort-based, scalable, beginners)
  2. 1-on-1 Intensive (specific problem: traffic, funnel, or email)
  3. Done-With-You Retainer (monthly ongoing — future phase)
- Cal.com embed for booking (hosted, free tier)
- Cal.com webhook: `POST /api/webhooks/cal`
  - Events handled: `BOOKING_CREATED`, `BOOKING_CANCELLED`, `BOOKING_RESCHEDULED`
  - On booking: log to D1, log to `student_activity_log`, send Emailit confirmation, trigger Encharge pre-call sequence
  - Post-call: manual trigger → Encharge post-call follow-up + Stripe payment link

### 6.6 Payments

- Stripe Checkout for course purchases (one-time)
- Stripe webhook: `POST /api/webhooks/stripe`
  - Events: `checkout.session.completed`, `payment_intent.payment_failed`
  - On success: grant access, send Emailit receipt, trigger Encharge course onboarding
  - On failure: trigger Encharge dunning sequence, send Emailit admin alert
- Stripe logic isolated in `/worker/src/lib/stripe.ts` (processor-agnostic abstraction)
- Future: Stripe subscriptions for recurring model

### 6.7 Email System

**Emailit (Transactional — REST API from Worker):**
- Registration confirmation
- Password reset
- Course purchase receipt
- Consultation booking confirmation
- Consultation cancellation notice
- Stripe payment failure admin alert

**Encharge (Lifecycle Automation — Webhooks from Worker):**
- Welcome + onboarding sequence (on registration)
- Course onboarding sequence (on purchase)
- Progress milestone emails (25%, 50%, 75%)
- Course completion email (100%)
- Re-engagement flow (inactive at day 3, 7, 14)
- Pre-call nurture sequence (on Cal.com booking)
- Post-call follow-up + proposal (manual trigger)
- Dunning sequence (payment failed)
- Win-back / offboarding (subscription cancelled)

### 6.8 Admin Dashboard

- Course management: create, edit, publish/unpublish courses and lessons
- Blog management: create, edit, publish posts
- Student CRM: view student list, profile, journey timeline, purchase history
- Revenue attribution report: revenue by traffic source/campaign
- Basic analytics: registrations, purchases, active students

### 6.9 Customer Journey Tracking

**UTM Capture:**
- JavaScript captures UTM parameters on first visit → stores in `localStorage`
- On registration: first-touch UTMs sent to Worker → stored on `users` record
- On purchase: last-touch UTMs stored on `user_purchases` record

**Schema Additions:**

`users` table:
```sql
first_touch_source TEXT,
first_touch_medium TEXT,
first_touch_campaign TEXT,
first_touch_page TEXT
```

`user_purchases` table:
```sql
attribution_source TEXT,
attribution_medium TEXT,
attribution_campaign TEXT
```

**GTM Data Layer Events:**
| Event | Parameters |
|-------|-----------|
| `page_view` | page, user_id |
| `user_registered` | source, medium, campaign |
| `lesson_viewed` | lesson_id, course_id, user_id |
| `lesson_completed` | lesson_id, course_id, user_id, progress_% |
| `course_purchased` | course_id, amount, user_id, source, campaign |
| `consultation_booked` | service_type, user_id, source |
| `cta_clicked` | cta_label, page, user_id |

**Admin CRM Journey View (per student):**
First visit date/source → Registration → First lesson → Purchase (with attribution) → Consultation booked

**Revenue Attribution Report:**
Admin dashboard shows revenue by traffic source/campaign — organic/blog, email/encharge, direct, paid, etc.

---

## 7. Technical Architecture

### Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Static HTML + Alpine.js (no build step) |
| Backend | Cloudflare Worker (TypeScript) |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 (images, assets) |
| Hosting | Cloudflare Pages (frontend) |
| Payments | Stripe |
| Transactional Email | Emailit (REST API) |
| Email Automation | Encharge (webhooks) |
| Scheduling | Cal.com (hosted) |
| Analytics | Google Tag Manager + GTM data layer |
| Editor | Quill.js or TipTap (HTML output sanitized in Worker) |

### Key Architectural Decisions
- **Alpine.js** — lightweight reactivity on static HTML; no build step; works with Cloudflare Pages
- **Video URLs** — stored in separate `video_url` field, never embedded in HTML content
- **Search** — client-side MVP; Worker search endpoint (`GET /api/courses?search=`) when catalog exceeds 100 items
- **Admin** — single `admin.js` with router pattern + shared vanilla JS components (no framework)
- **Migrations** — staging + production Cloudflare environments; migrations verified on staging before production
- **SEO from day one** — meta tags, sitemap, clean slug structure required in MVP

### Database Schema (Core Tables)
```
users
  id, email, password_hash, name, created_at, last_login_at, login_streak
  first_touch_source, first_touch_medium, first_touch_campaign, first_touch_page

courses
  id, title, slug, description, cover_image_url, price, published, created_at

lessons
  id, course_id, title, slug, content_html, video_url, order, is_free_preview, published

lesson_progress
  id, user_id, lesson_id, completed_at

user_purchases
  id, user_id, course_id, stripe_session_id, amount, purchased_at
  attribution_source, attribution_medium, attribution_campaign

blog_posts
  id, title, slug, excerpt, content_html, cover_image_url, meta_title, meta_description, published_at

consultation_bookings
  id, user_id, cal_booking_id, service_type, scheduled_at, status, created_at

student_activity_log
  id, user_id, event_type, metadata_json, created_at
```

---

## 8. MVP Requirements (Phase 1 — First Paying Student)

These are the minimum requirements before launch. Nothing ships until all are complete.

- [ ] 1 complete published course with at least 5 lessons
- [ ] 3+ free preview lessons (lead magnet)
- [ ] 5+ blog posts live at launch
- [ ] Auth: register, login, password reset
- [ ] Stripe checkout for course purchase + receipt email
- [ ] Student dashboard with progress tracking and streak
- [ ] Emailit transactional emails (all 5 types) working
- [ ] Encharge welcome + course onboarding sequences active
- [ ] Services page with Cal.com embed live
- [ ] Cal.com webhook handler live (BOOKING_CREATED minimum)
- [ ] Admin dashboard: course management + blog management
- [ ] Customer journey tracking (UTM capture + GTM events)
- [ ] Cloudflare observability enabled
- [ ] Stripe failure → admin Emailit alert working
- [ ] SEO: meta tags, sitemap, clean slugs on all public pages

---

## 9. Non-MVP / Future Phases

| Feature | Phase |
|---------|-------|
| Community layer (member forum, shared progress) | Phase 2+ |
| Paid discovery call ($399 Marketing Audit) | Phase 2 |
| Affiliate program | Phase 2 (third-party tool, not custom) |
| Done-with-you retainer tier | Phase 2 |
| Subscription pricing model | Phase 2 |
| D1 read replicas for scale | Phase 3 |
| Activity log archiving (>90 days) | Phase 3 |

---

## 10. Risk Register

| Risk | Severity | Mitigation |
|------|----------|-----------|
| No traffic at launch | Critical | Content minimum enforced: 1 course + 3 free lessons + 5 blog posts before go-live |
| Student drop-off / no retention | Critical | First lesson under 10 min. Dashboard streak. Encharge re-engagement at day 3, 7, 14. |
| Consultation bookings but no closes | High | Pre-call + post-call Encharge sequences mandatory before Cal.com goes live |
| Silent tech failures | High | Cloudflare observability from day one. Stripe failures trigger admin Emailit alert. D1 migrations on staging first. |
| Scope overwhelm — never ships | Critical | Tight Phase 1 MVP. All other features are post-revenue. |
| Payment processor risk | Medium | Stripe logic abstracted behind `/worker/src/lib/stripe.ts` — swap to LemonSqueezy/Paddle with minimal changes |

---

## 11. Go-to-Market

- **Existing audience:** None — zero to one, brand new project
- **Primary channel:** Organic — blog SEO + free lesson previews as lead magnet
- **Traffic flywheel:** Blog → Free lessons → Register → Encharge sequence → Course → Consultation → Close
- **Launch minimum:** 1 complete course + 3 free preview lessons + 5 blog posts

---

## 12. Open Questions / Decisions Deferred

1. **WYSIWYG Editor:** Quill.js vs TipTap — decide before admin build begins
2. **Subscription model:** One-time only at launch; revisit after first 10 course sales
3. **Community layer:** Design DB to support extensible user profiles now, even if community ships in Phase 2
4. **Paid discovery call:** Launch free; add $399 audit tier once social proof (3+ testimonials) exists
