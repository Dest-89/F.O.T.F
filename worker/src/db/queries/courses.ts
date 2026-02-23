// Course and lesson-related database queries
import type { Course, Lesson, MilestoneSent } from '../schema';

export async function getAllCourses(
  db: D1Database,
  options: { publishedOnly?: boolean; limit?: number; offset?: number } = {}
): Promise<Course[]> {
  let query = 'SELECT * FROM courses';
  
  if (options.publishedOnly) {
    query += ' WHERE published = 1';
  }
  
  query += ' ORDER BY created_at DESC';
  
  if (options.limit) {
    query += ` LIMIT ${options.limit}`;
  }
  if (options.offset) {
    query += ` OFFSET ${options.offset}`;
  }
  
  const result = await db.prepare(query).all<Course>();
  return result.results || [];
}

export async function getCourseById(
  db: D1Database,
  id: number,
  options: { publishedOnly?: boolean } = {}
): Promise<Course | null> {
  let query = 'SELECT * FROM courses WHERE id = ?';
  
  if (options.publishedOnly) {
    query += ' AND published = 1';
  }
  
  const result = await db.prepare(query).bind(id).first<Course>();
  return result || null;
}

export async function getCourseBySlug(
  db: D1Database,
  slug: string,
  options: { publishedOnly?: boolean } = {}
): Promise<Course | null> {
  let query = 'SELECT * FROM courses WHERE slug = ?';
  
  if (options.publishedOnly) {
    query += ' AND published = 1';
  }
  
  const result = await db.prepare(query).bind(slug).first<Course>();
  return result || null;
}

export async function createCourse(
  db: D1Database,
  params: {
    title: string;
    slug: string;
    description?: string;
    cover_image_url?: string;
    price: number;
    published?: boolean;
  }
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.prepare(
    `INSERT INTO courses (title, slug, description, cover_image_url, price, published, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    params.title,
    params.slug,
    params.description || null,
    params.cover_image_url || null,
    params.price,
    params.published ? 1 : 0,
    now,
    now
  ).run();
  
  return result.meta.last_row_id as number;
}

export async function updateCourse(
  db: D1Database,
  id: number,
  params: {
    title?: string;
    slug?: string;
    description?: string;
    cover_image_url?: string;
    price?: number;
    published?: boolean;
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
  if (params.description !== undefined) {
    fields.push('description = ?');
    values.push(params.description);
  }
  if (params.cover_image_url !== undefined) {
    fields.push('cover_image_url = ?');
    values.push(params.cover_image_url);
  }
  if (params.price !== undefined) {
    fields.push('price = ?');
    values.push(params.price);
  }
  if (params.published !== undefined) {
    fields.push('published = ?');
    values.push(params.published ? 1 : 0);
  }
  
  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);
  
  await db.prepare(
    `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run();
}

export async function deleteCourse(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM courses WHERE id = ?').bind(id).run();
}

// Lessons

export async function getLessonsForCourse(
  db: D1Database,
  courseId: number,
  options: { publishedOnly?: boolean; includeContent?: boolean } = {}
): Promise<Lesson[]> {
  let query = 'SELECT id, course_id, title, slug, video_url, "order", is_free_preview, published, created_at, updated_at';
  
  if (options.includeContent) {
    query = 'SELECT *';
  }
  
  query += ' FROM lessons WHERE course_id = ?';
  
  if (options.publishedOnly) {
    query += ' AND published = 1';
  }
  
  query += ' ORDER BY "order" ASC';
  
  const result = await db.prepare(query).bind(courseId).all<Lesson>();
  return result.results || [];
}

export async function getLessonById(
  db: D1Database,
  id: number,
  options: { publishedOnly?: boolean } = {}
): Promise<Lesson | null> {
  let query = 'SELECT * FROM lessons WHERE id = ?';
  
  if (options.publishedOnly) {
    query += ' AND published = 1';
  }
  
  const result = await db.prepare(query).bind(id).first<Lesson>();
  return result || null;
}

export async function getLessonBySlug(
  db: D1Database,
  courseId: number,
  slug: string,
  options: { publishedOnly?: boolean } = {}
): Promise<Lesson | null> {
  let query = 'SELECT * FROM lessons WHERE course_id = ? AND slug = ?';
  
  if (options.publishedOnly) {
    query += ' AND published = 1';
  }
  
  const result = await db.prepare(query).bind(courseId, slug).first<Lesson>();
  return result || null;
}

export async function createLesson(
  db: D1Database,
  params: {
    course_id: number;
    title: string;
    slug: string;
    content_html?: string;
    video_url?: string;
    order: number;
    is_free_preview?: boolean;
    published?: boolean;
  }
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.prepare(
    `INSERT INTO lessons (course_id, title, slug, content_html, video_url, "order", is_free_preview, published, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    params.course_id,
    params.title,
    params.slug,
    params.content_html || null,
    params.video_url || null,
    params.order,
    params.is_free_preview ? 1 : 0,
    params.published ? 1 : 0,
    now,
    now
  ).run();
  
  return result.meta.last_row_id as number;
}

export async function updateLesson(
  db: D1Database,
  id: number,
  params: {
    title?: string;
    slug?: string;
    content_html?: string;
    video_url?: string;
    order?: number;
    is_free_preview?: boolean;
    published?: boolean;
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
  if (params.content_html !== undefined) {
    fields.push('content_html = ?');
    values.push(params.content_html);
  }
  if (params.video_url !== undefined) {
    fields.push('video_url = ?');
    values.push(params.video_url);
  }
  if (params.order !== undefined) {
    fields.push('"order" = ?');
    values.push(params.order);
  }
  if (params.is_free_preview !== undefined) {
    fields.push('is_free_preview = ?');
    values.push(params.is_free_preview ? 1 : 0);
  }
  if (params.published !== undefined) {
    fields.push('published = ?');
    values.push(params.published ? 1 : 0);
  }
  
  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);
  
  await db.prepare(
    `UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run();
}

export async function deleteLesson(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM lessons WHERE id = ?').bind(id).run();
}

// Milestones

export async function hasMilestoneBeenSent(
  db: D1Database,
  userId: number,
  courseId: number,
  milestoneType: '25' | '50' | '75' | '100'
): Promise<boolean> {
  const result = await db.prepare(
    'SELECT 1 FROM milestones_sent WHERE user_id = ? AND course_id = ? AND milestone_type = ?'
  ).bind(userId, courseId, milestoneType).first();
  return !!result;
}

export async function recordMilestoneSent(
  db: D1Database,
  userId: number,
  courseId: number,
  milestoneType: '25' | '50' | '75' | '100'
): Promise<void> {
  await db.prepare(
    `INSERT OR IGNORE INTO milestones_sent (user_id, course_id, milestone_type, sent_at)
     VALUES (?, ?, ?, ?)`
  ).bind(userId, courseId, milestoneType, new Date().toISOString()).run();
}

// Progress calculations

export async function getCourseProgress(
  db: D1Database,
  userId: number,
  courseId: number
): Promise<{ completed: number; total: number; percentage: number }> {
  const lessonsResult = await db.prepare(
    'SELECT COUNT(*) as count FROM lessons WHERE course_id = ? AND published = 1'
  ).bind(courseId).first<{ count: number }>();
  
  const completedResult = await db.prepare(
    `SELECT COUNT(*) as count FROM lesson_progress lp
     JOIN lessons l ON lp.lesson_id = l.id
     WHERE lp.user_id = ? AND l.course_id = ? AND l.published = 1`
  ).bind(userId, courseId).first<{ count: number }>();
  
  const total = lessonsResult?.count || 0;
  const completed = completedResult?.count || 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { completed, total, percentage };
}

export async function getNextLesson(
  db: D1Database,
  userId: number,
  courseId: number
): Promise<Lesson | null> {
  // Get the first incomplete lesson in order
  const result = await db.prepare(
    `SELECT l.* FROM lessons l
     WHERE l.course_id = ? AND l.published = 1
     AND l.id NOT IN (
       SELECT lesson_id FROM lesson_progress WHERE user_id = ?
     )
     ORDER BY l."order" ASC
     LIMIT 1`
  ).bind(courseId, userId).first<Lesson>();
  
  return result || null;
}
