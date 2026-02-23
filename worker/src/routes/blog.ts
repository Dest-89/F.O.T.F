// Blog routes
import { Hono } from 'hono';
import { z } from 'zod';
import * as queries from '../db/queries';

const app = new Hono<{ Bindings: CloudflareBindings }>();

const slugSchema = z.object({
  slug: z.string().min(1)
});

// GET /api/blog - List all published blog posts
app.get('/', async (c) => {
  try {
    const db = c.env.DB;
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const offset = (page - 1) * limit;
    
    const { posts, total } = await queries.getAllBlogPosts(db, {
      publishedOnly: true,
      limit,
      offset
    });
    
    // Simplify for list view
    const simplified = posts.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      cover_image_url: post.cover_image_url,
      published_at: post.published_at,
      created_at: post.created_at
    }));
    
    return c.json({
      posts: simplified,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Blog List Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500);
  }
});

// GET /api/blog/:slug - Get single blog post
app.get('/:slug', async (c) => {
  try {
    const { slug } = slugSchema.parse({ slug: c.req.param('slug') });
    const db = c.env.DB;
    
    const post = await queries.getBlogPostBySlug(db, slug, { publishedOnly: true });
    
    if (!post) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Blog post not found'
        }
      }, 404);
    }
    
    return c.json({
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content_html: post.content_html,
        cover_image_url: post.cover_image_url,
        meta_title: post.meta_title,
        meta_description: post.meta_description,
        published_at: post.published_at,
        created_at: post.created_at,
        updated_at: post.updated_at
      }
    });
  } catch (error) {
    console.error('[Blog Detail Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500);
  }
});

// GET /api/blog/search?q=query - Search blog posts
app.get('/search', async (c) => {
  try {
    const query = c.req.query('q');
    
    if (!query || query.trim().length < 2) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query must be at least 2 characters'
        }
      }, 400);
    }
    
    const db = c.env.DB;
    const posts = await queries.searchBlogPosts(db, query, 10);
    
    const simplified = posts.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      cover_image_url: post.cover_image_url,
      published_at: post.published_at
    }));
    
    return c.json({ posts: simplified });
  } catch (error) {
    console.error('[Blog Search Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500);
  }
});

export default app;
