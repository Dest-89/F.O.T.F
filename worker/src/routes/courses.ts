// Course and lesson routes
import { Hono } from 'hono';
import { z } from 'zod';
import * as queries from '../db/queries';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { sanitizeHtml } from '../lib/sanitize';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Validation schemas
const courseSlugSchema = z.object({
  slug: z.string().min(1)
});

const lessonSlugSchema = z.object({
  courseSlug: z.string().min(1),
  lessonSlug: z.string().min(1)
});

// GET /api/courses - List all published courses
app.get('/', async (c) => {
  try {
    const db = c.env.DB;
    const courses = await queries.getAllCourses(db, { publishedOnly: true });
    
    // Don't include full description in list view
    const simplified = courses.map(course => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      cover_image_url: course.cover_image_url,
      price: course.price,
      created_at: course.created_at
    }));
    
    return c.json({ courses: simplified });
  } catch (error) {
    console.error('[Courses List Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500);
  }
});

// GET /api/courses/:slug - Get course details with lessons
app.get('/:slug', optionalAuthMiddleware, async (c) => {
  try {
    const { slug } = courseSlugSchema.parse({ slug: c.req.param('slug') });
    const db = c.env.DB;
    const user = c.get('user');
    
    // Get course
    const course = await queries.getCourseBySlug(db, slug, { publishedOnly: true });
    if (!course) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Course not found'
        }
      }, 404);
    }
    
    // Get lessons
    const lessons = await queries.getLessonsForCourse(db, course.id, { publishedOnly: true });
    
    // Check if user has purchased this course
    let hasAccess = false;
    let progress = null;
    
    if (user) {
      hasAccess = await queries.hasUserPurchasedCourse(db, user.id, course.id);
      
      if (hasAccess) {
        // Get progress
        const courseProgress = await queries.getCourseProgress(db, user.id, course.id);
        progress = courseProgress.percentage;
      }
    }
    
    // Build lesson list with access info
    const lessonList = lessons.map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      slug: lesson.slug,
      video_url: lesson.video_url,
      order: lesson.order,
      is_free_preview: lesson.is_free_preview,
      has_access: hasAccess || lesson.is_free_preview
    }));
    
    return c.json({
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        cover_image_url: course.cover_image_url,
        price: course.price,
        created_at: course.created_at
      },
      lessons: lessonList,
      has_access: hasAccess,
      progress,
      total_lessons: lessons.length
    });
  } catch (error) {
    console.error('[Course Detail Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500);
  }
});

// GET /api/courses/:courseSlug/lessons/:lessonSlug - Get lesson content
app.get('/:courseSlug/lessons/:lessonSlug', authMiddleware, async (c) => {
  try {
    const { courseSlug, lessonSlug } = lessonSlugSchema.parse({
      courseSlug: c.req.param('courseSlug'),
      lessonSlug: c.req.param('lessonSlug')
    });
    
    const db = c.env.DB;
    const user = c.get('user');
    
    // Get course
    const course = await queries.getCourseBySlug(db, courseSlug, { publishedOnly: true });
    if (!course) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Course not found'
        }
      }, 404);
    }
    
    // Get lesson
    const lesson = await queries.getLessonBySlug(db, course.id, lessonSlug, { publishedOnly: true });
    if (!lesson) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Lesson not found'
        }
      }, 404);
    }
    
    // Check access
    const hasAccess = await queries.hasUserPurchasedCourse(db, user.id, course.id);
    const isFreePreview = lesson.is_free_preview;
    
    if (!hasAccess && !isFreePreview) {
      return c.json({
        error: {
          code: 'FORBIDDEN',
          message: 'Purchase required to access this lesson'
        }
      }, 403);
    }
    
    // Get all lessons for navigation
    const allLessons = await queries.getLessonsForCourse(db, course.id, { publishedOnly: true });
    const currentIndex = allLessons.findIndex(l => l.id === lesson.id);
    const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
    
    // Check if lesson is completed
    const progress = await queries.getLessonProgress(db, user.id, lesson.id);
    const isCompleted = !!progress;
    
    // Get course progress
    const courseProgress = await queries.getCourseProgress(db, user.id, course.id);
    
    return c.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        content_html: lesson.content_html,
        video_url: lesson.video_url,
        order: lesson.order,
        is_free_preview: lesson.is_free_preview,
        is_completed: isCompleted
      },
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug
      },
      navigation: {
        previous: prevLesson ? { id: prevLesson.id, title: prevLesson.title, slug: prevLesson.slug } : null,
        next: nextLesson ? { id: nextLesson.id, title: nextLesson.title, slug: nextLesson.slug } : null,
        current_index: currentIndex + 1,
        total: allLessons.length
      },
      course_progress: courseProgress.percentage
    });
  } catch (error) {
    console.error('[Lesson Detail Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500);
  }
});

// POST /api/courses/:courseSlug/lessons/:lessonSlug/complete - Mark lesson complete
app.post('/:courseSlug/lessons/:lessonSlug/complete', authMiddleware, async (c) => {
  try {
    const { courseSlug, lessonSlug } = lessonSlugSchema.parse({
      courseSlug: c.req.param('courseSlug'),
      lessonSlug: c.req.param('lessonSlug')
    });
    
    const db = c.env.DB;
    const user = c.get('user');
    
    // Get course
    const course = await queries.getCourseBySlug(db, courseSlug, { publishedOnly: true });
    if (!course) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Course not found'
        }
      }, 404);
    }
    
    // Get lesson
    const lesson = await queries.getLessonBySlug(db, course.id, lessonSlug, { publishedOnly: true });
    if (!lesson) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Lesson not found'
        }
      }, 404);
    }
    
    // Check access
    const hasAccess = await queries.hasUserPurchasedCourse(db, user.id, course.id);
    if (!hasAccess && !lesson.is_free_preview) {
      return c.json({
        error: {
          code: 'FORBIDDEN',
          message: 'Purchase required'
        }
      }, 403);
    }
    
    // Mark complete (idempotent)
    await queries.markLessonComplete(db, user.id, lesson.id);
    
    // Get updated progress
    const courseProgress = await queries.getCourseProgress(db, user.id, course.id);
    
    // Log activity
    c.executionCtx.waitUntil(
      queries.logActivity(db, {
        user_id: user.id,
        event_type: 'lesson_completed',
        metadata: { lesson_id: lesson.id, course_id: course.id, progress: courseProgress.percentage }
      }).catch(err => console.error('[Activity] Log failed:', err))
    );
    
    return c.json({
      success: true,
      progress: courseProgress.percentage,
      completed: courseProgress.completed,
      total: courseProgress.total
    });
  } catch (error) {
    console.error('[Lesson Complete Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500);
  }
});

export default app;
