# Direct Marketing Mastery School

A self-hosted online learning platform built on Cloudflare (Pages + Workers + D1 + R2).

## 🚀 What's Been Built

### Backend (Cloudflare Worker)
- **Authentication** - JWT-based auth with PBKDF2 password hashing, password reset
- **Courses & Lessons** - Full CRUD, progress tracking, free preview support
- **Payments** - Stripe Checkout integration with webhook handling
- **Email System** - Dual email: Emailit (transactional) + Encharge (lifecycle automation)
- **Blog** - Public blog with SEO meta injection
- **Consulting** - Cal.com webhook integration for booking management
- **Admin Dashboard** - Course/blog management, student CRM, analytics
- **UTM Attribution** - First-touch and last-touch tracking

### Frontend (Static HTML + Alpine.js)
- **Neumorphic design system** with dark mode as primary theme
- **Professional icons** via Phosphor Icons
- **Copyright-free media** placeholders from Unsplash
- **Responsive layout** for all devices

#### Pages Built:
| Page | Path | Features |
|------|------|----------|
| Homepage | `/index.html` | Hero, value prop, journey path |
| Login | `/login.html` | JWT auth, redirect handling |
| Register | `/register.html` | UTM capture, validation |
| Reset Password | `/reset-password.html` | Token-based reset flow |
| Course Catalog | `/courses/index.html` | Grid layout, journey visualization |
| Course Detail | `/courses/_template.html` | Dynamic meta, pricing, lessons |
| Lesson Player | `/dashboard/lesson.html` | Video player, progress, navigation |
| Student Dashboard | `/dashboard/index.html` | Stats, courses, activity, blog feed |
| Blog Listing | `/blog/index.html` | Search, pagination, featured post |
| Blog Post | `/blog/_template.html` | Dynamic content, share buttons |
| Services | `/services.html` | Pricing tiers, Cal.com embed, FAQ |
| Success Page | `/success.html` | Post-purchase confirmation |
| Admin Panel | `/admin/index.html` | Stats, course management |

## 📁 Project Structure

```
/
├── migrations/                    # D1 database migrations
│   └── 0001_initial_schema.sql
├── planning-artifacts/            # PRD, Architecture, UX Spec
├── worker/                        # Cloudflare Worker
│   ├── src/
│   │   ├── index.ts              # Main Hono app
│   │   ├── lib/                  # Core libraries
│   │   │   ├── auth.ts           # JWT + PBKDF2
│   │   │   ├── stripe.ts         # Stripe abstraction
│   │   │   ├── emailit.ts        # Transactional email
│   │   │   ├── encharge.ts       # Lifecycle automation
│   │   │   └── sanitize.ts       # HTML sanitization
│   │   ├── middleware/
│   │   │   └── auth.ts           # JWT middleware
│   │   ├── routes/
│   │   │   ├── auth.ts           # Auth endpoints
│   │   │   ├── courses.ts        # Course/lesson endpoints
│   │   │   ├── dashboard.ts      # Dashboard endpoints
│   │   │   ├── blog.ts           # Blog endpoints
│   │   │   ├── payments.ts       # Stripe checkout
│   │   │   ├── webhooks/         # Webhook handlers
│   │   │   │   ├── stripe.ts
│   │   │   │   └── cal.ts
│   │   │   └── admin/            # Admin routes
│   │   │       ├── courses.ts
│   │   │       ├── blog.ts
│   │   │       ├── students.ts
│   │   │       └── analytics.ts
│   │   └── db/
│   │       ├── schema.ts         # TypeScript types
│   │       └── queries/          # DB query helpers
│   ├── migrations/               # Copy of migrations
│   ├── wrangler.jsonc
│   └── package.json
└── public/                       # Cloudflare Pages
    ├── css/
    │   ├── tokens.css            # Design tokens (light/dark)
    │   └── main.css              # Main styles
    ├── js/
    │   ├── auth.js               # Auth utilities & store
    │   ├── utm.js                # UTM capture
    │   ├── theme.js              # Dark mode toggle
    │   └── components/           # Alpine components
    ├── index.html
    ├── login.html
    ├── register.html
    ├── reset-password.html
    ├── success.html
    ├── courses/
    │   ├── index.html            # Course catalog
    │   └── _template.html        # Course detail (SSR meta)
    ├── dashboard/
    │   ├── index.html            # Student dashboard
    │   └── lesson.html           # Lesson player
    ├── blog/
    │   ├── index.html            # Blog listing
    │   └── _template.html        # Blog post (SSR meta)
    ├── admin/
    │   └── index.html            # Admin panel
    └── services.html             # Consulting page
```

## 🛠 API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/reset-password-request` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Courses (Public)
- `GET /api/courses` - List published courses
- `GET /api/courses/:slug` - Get course details
- `GET /api/courses/:slug/lessons/:lessonSlug` - Get lesson (auth required)
- `POST /api/courses/:slug/lessons/:lessonSlug/complete` - Mark complete (auth)

### Dashboard (Auth Required)
- `GET /api/dashboard` - Full dashboard data
- `GET /api/dashboard/progress` - Progress across courses
- `GET /api/dashboard/activity` - Activity log
- `POST /api/dashboard/check-milestone` - Check milestone triggers

### Blog (Public)
- `GET /api/blog` - List posts
- `GET /api/blog/:slug` - Get post
- `GET /api/blog/search?q=query` - Search posts

### Payments (Auth Required)
- `POST /api/payments/checkout` - Create Stripe checkout
- `GET /api/payments/session/:id` - Get session status

### Webhooks
- `POST /api/webhooks/stripe` - Stripe events
- `POST /api/webhooks/cal` - Cal.com booking events

### Admin (Admin Required)
- `GET /api/admin/courses` - List all courses
- `POST /api/admin/courses` - Create course
- `PATCH /api/admin/courses/:id` - Update course
- `DELETE /api/admin/courses/:id` - Delete course
- `POST /api/admin/courses/:id/lessons` - Create lesson
- `PATCH /api/admin/courses/:id/lessons/:lessonId` - Update lesson
- `DELETE /api/admin/courses/:id/lessons/:lessonId` - Delete lesson
- `GET /api/admin/blog` - List all posts
- `POST /api/admin/blog` - Create post
- `PATCH /api/admin/blog/:id` - Update post
- `DELETE /api/admin/blog/:id` - Delete post
- `GET /api/admin/students` - List students
- `GET /api/admin/students/:id` - Get student details
- `GET /api/admin/analytics/dashboard` - Dashboard stats
- `GET /api/admin/analytics/attribution` - Revenue attribution
- `GET /api/admin/analytics/courses` - Course sales

## 🚀 Deployment

### Worker (Staging)
```bash
cd worker
npx wrangler deploy --env staging
```

### Worker (Production)
```bash
cd worker
npx wrangler deploy
```

### Database Migrations
```bash
# Staging
cd worker
npx wrangler d1 migrations apply fotf-platform-staging --env staging --remote

# Production
cd worker
npx wrangler d1 migrations apply fotf-platform-production --remote
```

### Pages (Frontend)
Upload the `public/` folder to Cloudflare Pages, or connect to GitHub for auto-deployment.

## ⚙️ Environment Variables

Set these in Cloudflare Dashboard or `.dev.vars`:

```
JWT_SECRET=your-secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
EMAILIT_API_KEY=...
ENCHARGE_API_KEY=...
CAL_WEBHOOK_SECRET=...
```

## 📋 Next Steps

1. **Create admin user** - Set a user to `role='admin'` in D1
2. **Add courses** - Use admin API or admin panel to create courses and lessons
3. **Add blog posts** - Use admin API or admin panel to create content
4. **Configure Stripe webhooks** - Point to `/api/webhooks/stripe`
5. **Configure Cal.com webhooks** - Point to `/api/webhooks/cal`
6. **Update Cal.com embed** - Replace the iframe URL in services.html with your Cal link
7. **Set up GTM** - Add Google Tag Manager for analytics
8. **Add real course content** - Replace placeholder images and video URLs
9. **Configure Emailit sender** - Update from email in worker settings
10. **Test purchase flow** - Complete an end-to-end test with Stripe test mode

## 🔗 Staging URLs

- **Worker API**: https://fotf-platform-staging.destinhounkpef.workers.dev
- **Health Check**: https://fotf-platform-staging.destinhounkpef.workers.dev/api/health

## 🎨 Design System

- **Colors**: Neumorphic grays (`#e0e5ec`), Blue accent (`#4b6cb7`), Gold (`#d4af37`)
- **Typography**: Playfair Display (headings), Inter (body)
- **Icons**: Phosphor Icons via CDN
- **Images**: Unsplash placeholder URLs (replace with actual assets)
- **Shadows**: Neumorphic layered shadows for depth
- **Dark Mode**: Primary theme, toggle available

---

Built with ❤️ on Cloudflare
