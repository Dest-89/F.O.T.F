// Admin student CRM routes
import { Hono } from 'hono';
import { z } from 'zod';
import * as queries from '../../db/queries';
import { adminMiddleware } from '../../middleware/auth';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// All routes require admin
app.use('*', adminMiddleware);

// GET /api/admin/students - List all students
app.get('/', async (c) => {
  try {
    const db = c.env.DB;
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = (page - 1) * limit;
    
    const { users, total } = await queries.getAllUsers(db, { limit, offset });
    
    // Don't expose password hashes
    const sanitized = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
      login_streak: user.login_streak,
      first_touch_source: user.first_touch_source,
      first_touch_medium: user.first_touch_medium
    }));
    
    return c.json({
      students: sanitized,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Admin Students List Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// GET /api/admin/students/:id - Get student details with journey
app.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = c.env.DB;
    
    const user = await queries.getUserById(db, id);
    if (!user) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Student not found' } }, 404);
    }
    
    // Get purchases
    const purchases = await queries.getUserPurchases(db, id);
    const purchasesWithDetails = await Promise.all(
      purchases.map(async (purchase) => {
        const course = await queries.getCourseById(db, purchase.course_id);
        return {
          id: purchase.id,
          course_id: purchase.course_id,
          course_title: course?.title || 'Unknown Course',
          course_slug: course?.slug || '',
          amount: purchase.amount,
          purchased_at: purchase.purchased_at,
          attribution_source: purchase.attribution_source,
          attribution_medium: purchase.attribution_medium
        };
      })
    );
    
    // Get activity timeline
    const timeline = await queries.getStudentJourneyTimeline(db, id);
    
    // Get bookings
    const { bookings } = await queries.getAllBookings(db, { userId: id });
    
    return c.json({
      student: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
        login_streak: user.login_streak,
        first_touch_source: user.first_touch_source,
        first_touch_medium: user.first_touch_medium,
        first_touch_campaign: user.first_touch_campaign,
        first_touch_page: user.first_touch_page
      },
      purchases: purchasesWithDetails,
      timeline,
      bookings
    });
  } catch (error) {
    console.error('[Admin Student Detail Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// GET /api/admin/students/:id/progress - Get student progress
app.get('/:id/progress', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = c.env.DB;
    
    const user = await queries.getUserById(db, id);
    if (!user) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Student not found' } }, 404);
    }
    
    // Get all courses with progress
    const purchases = await queries.getUserPurchases(db, id);
    const progressData = await Promise.all(
      purchases.map(async (purchase) => {
        const course = await queries.getCourseById(db, purchase.course_id);
        if (!course) return null;
        
        const progress = await queries.getCourseProgress(db, id, course.id);
        const lessons = await queries.getLessonsForCourse(db, course.id);
        
        // Get completed lessons
        const completedLessons = await db.prepare(
          `SELECT l.id, l.title, l.slug, lp.completed_at 
           FROM lesson_progress lp
           JOIN lessons l ON lp.lesson_id = l.id
           WHERE lp.user_id = ? AND l.course_id = ?`
        ).bind(id, course.id).all<{
          id: number;
          title: string;
          slug: string;
          completed_at: string;
        }>();
        
        return {
          course_id: course.id,
          course_title: course.title,
          course_slug: course.slug,
          progress: progress.percentage,
          completed_lessons: progress.completed,
          total_lessons: progress.total,
          lessons: lessons.map(lesson => ({
            id: lesson.id,
            title: lesson.title,
            slug: lesson.slug,
            completed: completedLessons.results?.some(
              cl => cl.id === lesson.id
            ) || false,
            completed_at: completedLessons.results?.find(
              cl => cl.id === lesson.id
            )?.completed_at || null
          }))
        };
      })
    );
    
    return c.json({
      student_id: id,
      courses: progressData.filter(Boolean)
    });
  } catch (error) {
    console.error('[Admin Student Progress Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

export default app;
