// Main entry point - Hono router
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Routes
import authRoutes from './routes/auth';
import courseRoutes from './routes/courses';
import dashboardRoutes from './routes/dashboard';
import blogRoutes from './routes/blog';
import paymentRoutes from './routes/payments';
import stripeWebhookRoutes from './routes/webhooks/stripe';
import calWebhookRoutes from './routes/webhooks/cal';
import adminCourseRoutes from './routes/admin/courses';
import adminBlogRoutes from './routes/admin/blog';
import adminStudentRoutes from './routes/admin/students';
import adminAnalyticsRoutes from './routes/admin/analytics';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Middleware
app.use('*', cors({
  origin: ['http://localhost:8788', 'https://fotf-school.com', 'https://*.pages.dev'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use('*', logger());

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.route('/api/auth', authRoutes);
app.route('/api/courses', courseRoutes);
app.route('/api/blog', blogRoutes);

// Protected routes
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/payments', paymentRoutes);

// Webhook routes (no auth, signature verification handled internally)
app.route('/api/webhooks/stripe', stripeWebhookRoutes);
app.route('/api/webhooks/cal', calWebhookRoutes);

// Admin routes
app.route('/api/admin/courses', adminCourseRoutes);
app.route('/api/admin/blog', adminBlogRoutes);
app.route('/api/admin/students', adminStudentRoutes);
app.route('/api/admin/analytics', adminAnalyticsRoutes);

// SEO meta injection for blog and course pages
// These routes intercept requests and inject meta tags
app.get('/blog/:slug', async (c) => {
  const slug = c.req.param('slug');
  const db = c.env.DB;
  
  // Get blog post
  const post = await db.prepare(
    'SELECT title, meta_title, meta_description, excerpt FROM blog_posts WHERE slug = ? AND published = 1'
  ).bind(slug).first<{
    title: string;
    meta_title: string | null;
    meta_description: string | null;
    excerpt: string | null;
  }>();
  
  // Fetch the static HTML template
  const templateUrl = new URL('/blog/_template.html', c.req.url);
  const templateResponse = await fetch(templateUrl);
  
  if (!templateResponse.ok || !post) {
    // Return original template or 404
    return c.notFound();
  }
  
  let html = await templateResponse.text();
  
  // Inject meta tags
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || '';
  
  html = html
    .replace('<title>', `<title>${title}`)
    .replace('</head>', `
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="article">
  </head>`);
  
  return c.html(html);
});

app.get('/courses/:slug', async (c) => {
  const slug = c.req.param('slug');
  const db = c.env.DB;
  
  // Get course
  const course = await db.prepare(
    'SELECT title, description FROM courses WHERE slug = ? AND published = 1'
  ).bind(slug).first<{
    title: string;
    description: string | null;
  }>();
  
  // Fetch the static HTML template
  const templateUrl = new URL('/courses/_template.html', c.req.url);
  const templateResponse = await fetch(templateUrl);
  
  if (!templateResponse.ok || !course) {
    return c.notFound();
  }
  
  let html = await templateResponse.text();
  
  // Inject meta tags
  const title = course.title;
  const description = course.description || '';
  
  html = html
    .replace('<title>', `<title>${title}`)
    .replace('</head>', `
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="product">
  </head>`);
  
  return c.html(html);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found'
    }
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('[Worker Error]', err);
  return c.json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  }, 500);
});

export default app;
