// Admin course management routes
import { Hono } from 'hono';
import { z } from 'zod';
import * as queries from '../../db/queries';
import { adminMiddleware } from '../../middleware/auth';
import { sanitizeHtml } from '../../lib/sanitize';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Validation schemas
const courseCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),
  cover_image_url: z.string().url().optional().or(z.literal('')),
  price: z.number().int().min(0, 'Price must be 0 or greater'),
  published: z.boolean().optional()
});

const courseUpdateSchema = courseCreateSchema.partial();

const lessonCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  content_html: z.string().optional(),
  video_url: z.string().url().optional().or(z.literal('')),
  order: z.number().int().min(0),
  is_free_preview: z.boolean().optional(),
  published: z.boolean().optional()
});

const lessonUpdateSchema = lessonCreateSchema.partial();

// All routes require admin
app.use('*', adminMiddleware);

// GET /api/admin/courses - List all courses (including unpublished)
app.get('/', async (c) => {
  try {
    const db = c.env.DB;
    const courses = await queries.getAllCourses(db);
    return c.json({ courses });
  } catch (error) {
    console.error('[Admin Courses List Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// POST /api/admin/courses - Create course
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const result = courseCreateSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({
        error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message }
      }, 400);
    }
    
    const db = c.env.DB;
    
    // Check for duplicate slug
    const existing = await queries.getCourseBySlug(db, result.data.slug);
    if (existing) {
      return c.json({
        error: { code: 'CONFLICT', message: 'A course with this slug already exists' }
      }, 409);
    }
    
    const courseId = await queries.createCourse(db, {
      ...result.data,
      cover_image_url: result.data.cover_image_url || undefined
    });
    
    const course = await queries.getCourseById(db, courseId);
    return c.json({ course }, 201);
  } catch (error) {
    console.error('[Admin Course Create Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// GET /api/admin/courses/:id - Get course with lessons
app.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = c.env.DB;
    
    const course = await queries.getCourseById(db, id);
    if (!course) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Course not found' } }, 404);
    }
    
    const lessons = await queries.getLessonsForCourse(db, id, { includeContent: true });
    
    return c.json({ course, lessons });
  } catch (error) {
    console.error('[Admin Course Detail Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// PATCH /api/admin/courses/:id - Update course
app.patch('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const result = courseUpdateSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({
        error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message }
      }, 400);
    }
    
    const db = c.env.DB;
    
    // Check course exists
    const existing = await queries.getCourseById(db, id);
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Course not found' } }, 404);
    }
    
    // Check slug uniqueness if changing
    if (result.data.slug && result.data.slug !== existing.slug) {
      const duplicate = await queries.getCourseBySlug(db, result.data.slug);
      if (duplicate) {
        return c.json({
          error: { code: 'CONFLICT', message: 'A course with this slug already exists' }
        }, 409);
      }
    }
    
    await queries.updateCourse(db, id, result.data);
    
    const course = await queries.getCourseById(db, id);
    return c.json({ course });
  } catch (error) {
    console.error('[Admin Course Update Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// DELETE /api/admin/courses/:id - Delete course
app.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = c.env.DB;
    
    const existing = await queries.getCourseById(db, id);
    if (!existing) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Course not found' } }, 404);
    }
    
    await queries.deleteCourse(db, id);
    return c.json({ success: true });
  } catch (error) {
    console.error('[Admin Course Delete Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// POST /api/admin/courses/:id/lessons - Create lesson
app.post('/:id/lessons', async (c) => {
  try {
    const courseId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const result = lessonCreateSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({
        error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message }
      }, 400);
    }
    
    const db = c.env.DB;
    
    // Check course exists
    const course = await queries.getCourseById(db, courseId);
    if (!course) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Course not found' } }, 404);
    }
    
    // Check for duplicate slug in this course
    const existing = await queries.getLessonBySlug(db, courseId, result.data.slug);
    if (existing) {
      return c.json({
        error: { code: 'CONFLICT', message: 'A lesson with this slug already exists in this course' }
      }, 409);
    }
    
    // Sanitize HTML content
    const sanitizedHtml = result.data.content_html 
      ? sanitizeHtml(result.data.content_html) 
      : undefined;
    
    const lessonId = await queries.createLesson(db, {
      course_id: courseId,
      title: result.data.title,
      slug: result.data.slug,
      content_html: sanitizedHtml,
      video_url: result.data.video_url || undefined,
      order: result.data.order,
      is_free_preview: result.data.is_free_preview,
      published: result.data.published
    });
    
    const lesson = await queries.getLessonById(db, lessonId);
    return c.json({ lesson }, 201);
  } catch (error) {
    console.error('[Admin Lesson Create Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// PATCH /api/admin/courses/:courseId/lessons/:lessonId - Update lesson
app.patch('/:courseId/lessons/:lessonId', async (c) => {
  try {
    const courseId = parseInt(c.req.param('courseId'));
    const lessonId = parseInt(c.req.param('lessonId'));
    const body = await c.req.json();
    const result = lessonUpdateSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({
        error: { code: 'VALIDATION_ERROR', message: result.error.errors[0].message }
      }, 400);
    }
    
    const db = c.env.DB;
    
    // Check lesson exists
    const existing = await queries.getLessonById(db, lessonId);
    if (!existing || existing.course_id !== courseId) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Lesson not found' } }, 404);
    }
    
    // Check slug uniqueness if changing
    if (result.data.slug && result.data.slug !== existing.slug) {
      const duplicate = await queries.getLessonBySlug(db, courseId, result.data.slug);
      if (duplicate) {
        return c.json({
          error: { code: 'CONFLICT', message: 'A lesson with this slug already exists in this course' }
        }, 409);
      }
    }
    
    // Sanitize HTML content if provided
    const updates: Parameters<typeof queries.updateLesson>[2] = { ...result.data };
    if (result.data.content_html) {
      updates.content_html = sanitizeHtml(result.data.content_html);
    }
    
    await queries.updateLesson(db, lessonId, updates);
    
    const lesson = await queries.getLessonById(db, lessonId);
    return c.json({ lesson });
  } catch (error) {
    console.error('[Admin Lesson Update Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// DELETE /api/admin/courses/:courseId/lessons/:lessonId - Delete lesson
app.delete('/:courseId/lessons/:lessonId', async (c) => {
  try {
    const courseId = parseInt(c.req.param('courseId'));
    const lessonId = parseInt(c.req.param('lessonId'));
    const db = c.env.DB;
    
    const existing = await queries.getLessonById(db, lessonId);
    if (!existing || existing.course_id !== courseId) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Lesson not found' } }, 404);
    }
    
    await queries.deleteLesson(db, lessonId);
    return c.json({ success: true });
  } catch (error) {
    console.error('[Admin Lesson Delete Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

export default app;
