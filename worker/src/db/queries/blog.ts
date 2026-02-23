// Blog post-related database queries
import type { BlogPost } from '../schema';

export async function getAllBlogPosts(
  db: D1Database,
  options: { publishedOnly?: boolean; limit?: number; offset?: number } = {}
): Promise<{ posts: BlogPost[]; total: number }> {
  const limit = options.limit || 20;
  const offset = options.offset || 0;
  
  let whereClause = '';
  if (options.publishedOnly) {
    whereClause = 'WHERE published = 1';
  }
  
  const [postsResult, countResult] = await Promise.all([
    db.prepare(
      `SELECT * FROM blog_posts ${whereClause} ORDER BY published_at DESC, created_at DESC LIMIT ? OFFSET ?`
    ).bind(limit, offset).all<BlogPost>(),
    db.prepare(
      `SELECT COUNT(*) as count FROM blog_posts ${whereClause}`
    ).first<{ count: number }>()
  ]);
  
  return {
    posts: postsResult.results || [],
    total: countResult?.count || 0
  };
}

export async function getBlogPostById(
  db: D1Database,
  id: number,
  options: { publishedOnly?: boolean } = {}
): Promise<BlogPost | null> {
  let query = 'SELECT * FROM blog_posts WHERE id = ?';
  
  if (options.publishedOnly) {
    query += ' AND published = 1';
  }
  
  const result = await db.prepare(query).bind(id).first<BlogPost>();
  return result || null;
}

export async function getBlogPostBySlug(
  db: D1Database,
  slug: string,
  options: { publishedOnly?: boolean } = {}
): Promise<BlogPost | null> {
  let query = 'SELECT * FROM blog_posts WHERE slug = ?';
  
  if (options.publishedOnly) {
    query += ' AND published = 1';
  }
  
  const result = await db.prepare(query).bind(slug).first<BlogPost>();
  return result || null;
}

export async function createBlogPost(
  db: D1Database,
  params: {
    title: string;
    slug: string;
    excerpt?: string;
    content_html?: string;
    cover_image_url?: string;
    meta_title?: string;
    meta_description?: string;
    published?: boolean;
    published_at?: string;
  }
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.prepare(
    `INSERT INTO blog_posts (title, slug, excerpt, content_html, cover_image_url, meta_title, meta_description, published, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    params.title,
    params.slug,
    params.excerpt || null,
    params.content_html || null,
    params.cover_image_url || null,
    params.meta_title || null,
    params.meta_description || null,
    params.published ? 1 : 0,
    params.published ? (params.published_at || now) : null,
    now,
    now
  ).run();
  
  return result.meta.last_row_id as number;
}

export async function updateBlogPost(
  db: D1Database,
  id: number,
  params: {
    title?: string;
    slug?: string;
    excerpt?: string;
    content_html?: string;
    cover_image_url?: string;
    meta_title?: string;
    meta_description?: string;
    published?: boolean;
    published_at?: string;
  }
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  
  if (params.title !== undefined) {
    fields.push('title = ?');
    values.push(params.title);
  }
  if (params.slug !== undefined) {
    fields.push('slug = ?');
    values.push(params.slug);
  }
  if (params.excerpt !== undefined) {
    fields.push('excerpt = ?');
    values.push(params.excerpt);
  }
  if (params.content_html !== undefined) {
    fields.push('content_html = ?');
    values.push(params.content_html);
  }
  if (params.cover_image_url !== undefined) {
    fields.push('cover_image_url = ?');
    values.push(params.cover_image_url);
  }
  if (params.meta_title !== undefined) {
    fields.push('meta_title = ?');
    values.push(params.meta_title);
  }
  if (params.meta_description !== undefined) {
    fields.push('meta_description = ?');
    values.push(params.meta_description);
  }
  if (params.published !== undefined) {
    fields.push('published = ?');
    values.push(params.published ? 1 : 0);
    // Set published_at when publishing
    if (params.published) {
      fields.push('published_at = ?');
      values.push(params.published_at || new Date().toISOString());
    }
  }
  
  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);
  
  await db.prepare(
    `UPDATE blog_posts SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run();
}

export async function deleteBlogPost(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM blog_posts WHERE id = ?').bind(id).run();
}

export async function getRecentBlogPosts(
  db: D1Database,
  limit: number = 3
): Promise<BlogPost[]> {
  const result = await db.prepare(
    'SELECT * FROM blog_posts WHERE published = 1 ORDER BY published_at DESC, created_at DESC LIMIT ?'
  ).bind(limit).all<BlogPost>();
  return result.results || [];
}

// Search blog posts (basic implementation)
export async function searchBlogPosts(
  db: D1Database,
  query: string,
  limit: number = 10
): Promise<BlogPost[]> {
  const searchPattern = `%${query}%`;
  const result = await db.prepare(
    `SELECT * FROM blog_posts 
     WHERE published = 1 
     AND (title LIKE ? OR excerpt LIKE ? OR content_html LIKE ?)
     ORDER BY published_at DESC
     LIMIT ?`
  ).bind(searchPattern, searchPattern, searchPattern, limit).all<BlogPost>();
  return result.results || [];
}
