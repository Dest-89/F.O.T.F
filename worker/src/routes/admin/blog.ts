// Admin blog management routes
import { Hono } from 'hono';
import { z } from 'zod';
import * as queries from '../../db/queries';
import { adminMiddleware } from '../../middleware/auth';
import { sanitizeHtml, extractText } from '../../lib/sanitize';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Validation schemas
const postCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  excerpt: z.string().optional(),
  content_html: z.string().optional(),
  cover_image_url: z.string().url().optional().or(z.literal('')),
  meta_title: z.string().optional(),
  meta_description: z.string().max(160, 'Meta description should be 160 characters or less').optional(),
  published: z.boolean().optional()
});

const postUpdateSchema = postCreateSchema.partial();

// All routes require admin
app.use('*', adminMiddleware);

// GET /api/admin/blog - List all blog posts (including unpublished)
app.get('/', async (c) => {
  try {
    const db = c.env.DB;
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    
    const { posts, total } = await queries.getAllBlogPosts(db, { limit, offset });
    
    return c.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Admin Blog List Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// POST /api/admin/blog - Create blog post
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const result = postCreateSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({
        error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message }
      }, 400);
    }
    
    const db = c.env.DB;
    
    // Check for duplicate slug
    const existing = await queries.getBlogPostBySlug(db, result.data.slug);
    if (existing) {
      return c.json({
        error: { code: 'CONFLICT', message: 'A post with this slug already exists' }
      }, 409);
    }
    
    // Sanitize HTML content
    const sanitizedHtml = result.data.content_html 
      ? sanitizeHtml(result.data.content_html) 
      : undefined;
    
    // Auto-generate excerpt if not provided
    let excerpt = result.data.excerpt;
    if (!excerpt && sanitizedHtml) {
      const text = extractText(sanitizedHtml);
      excerpt = text.slice(0, 200) + (text.length > 200 ? '...' : '');
    }
    
    // Auto-generate meta description if not provided
    let metaDescription = result.data.meta_description;
    if (!metaDescription && excerpt) {
      metaDescription = excerpt.slice(0, 160);
    }
    
    const postId = await queries.createBlogPost(db, {
      title: result.data.title,
      slug: result.data.slug,
      excerpt: excerpt || undefined,
      content_html: sanitizedHtml,
      cover_image_url: result.data.cover_image_url || undefined,
      meta_title: result.data.meta_title || undefined,
      meta_description: metaDescription || undefined,
      published: result.data.published
    });
    
    const post = await queries.getBlogPostById(db, postId);
    return c.json({ post }, 201);
  } catch (error) {
    console.error('[Admin Blog Create Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// GET /api/admin/blog/:id - Get blog post
app.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = c.env.DB;
    
    const post = await queries.getBlogPostById(db, id);
    if (!post) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Blog post not found' } }, 404);
    }
    
    return c.json({ post });
  } catch (error) {
    console.error('[Admin Blog Detail Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// PATCH /api/admin/blog/:id - Update blog post
app.patch('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const result = postUpdateSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({
        error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message }
      }, 400);
    }
    
    const db = c.env.DB;
    
    // Check post exists
    const existing = await queries.getBlogPostById(db, id);
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Blog post not found' } }, 404);
    }
    
    // Check slug uniqueness if changing
    if (result.data.slug && result.data.slug !== existing.slug) {
      const duplicate = await queries.getBlogPostBySlug(db, result.data.slug);
      if (duplicate) {
        return c.json({
          error: { code: 'CONFLICT', message: 'A post with this slug already exists' }
        }, 409);
      }
    }
    
    // Sanitize HTML content if provided
    const updates: Parameters<typeof queries.updateBlogPost>[2] = { ...result.data };
    if (result.data.content_html) {
      updates.content_html = sanitizeHtml(result.data.content_html);
      
      // Auto-generate excerpt if not provided
      if (!result.data.excerpt) {
        const text = extractText(updates.content_html);
        updates.excerpt = text.slice(0, 200) + (text.length > 200 ? '...' : '');
      }
    }
    
    await queries.updateBlogPost(db, id, updates);
    
    const post = await queries.getBlogPostById(db, id);
    return c.json({ post });
  } catch (error) {
    console.error('[Admin Blog Update Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// DELETE /api/admin/blog/:id - Delete blog post
app.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = c.env.DB;
    
    const existing = await queries.getBlogPostById(db, id);
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Blog post not found' } }, 404);
    }
    
    await queries.deleteBlogPost(db, id);
    return c.json({ success: true });
  } catch (error) {
    console.error('[Admin Blog Delete Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

export default app;
