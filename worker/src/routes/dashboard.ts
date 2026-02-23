// Student dashboard routes
import { Hono } from 'hono';
import * as queries from '../db/queries';
import { authMiddleware } from '../middleware/auth';
import * as encharge from '../lib/encharge';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// GET /api/dashboard - Get full dashboard data
app.get('/', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const user = c.get('user');
    
    // Get user details
    const userDetails = await queries.getUserById(db, user.id);
    if (!userDetails) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      }, 404);
    }
    
    // Get user's courses with progress
    const purchases = await queries.getUserPurchases(db, user.id);
    const coursesWithProgress = await Promise.all(
      purchases.map(async (purchase) => {
        const course = await queries.getCourseById(db, purchase.course_id);
        if (!course) return null;
        
        const progress = await queries.getCourseProgress(db, user.id, course.id);
        const nextLesson = await queries.getNextLesson(db, user.id, course.id);
        const lessons = await queries.getLessonsForCourse(db, course.id, { publishedOnly: true });
        
        return {
          id: course.id,
          title: course.title,
          slug: course.slug,
          cover_image_url: course.cover_image_url,
          progress: progress.percentage,
          completed_lessons: progress.completed,
          total_lessons: progress.total,
          next_lesson: nextLesson ? {
            id: nextLesson.id,
            title: nextLesson.title,
            slug: nextLesson.slug
          } : null,
          is_completed: progress.percentage === 100,
          purchased_at: purchase.purchased_at
        };
      })
    );
    
    // Get recent activity
    const activityLog = await queries.getUserActivityLog(db, user.id, 10);
    const recentActivity = activityLog.map(log => ({
      id: log.id,
      event_type: log.event_type,
      metadata: JSON.parse(log.metadata_json || '{}'),
      created_at: log.created_at
    }));
    
    // Get recent blog posts
    const recentPosts = await queries.getRecentBlogPosts(db, 3);
    const blogPosts = recentPosts.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      cover_image_url: post.cover_image_url,
      published_at: post.published_at
    }));
    
    // Get upcoming consultation bookings
    const upcomingBookings = await queries.getUpcomingBookings(db, user.id, 5);
    const consultations = upcomingBookings.map(booking => ({
      id: booking.id,
      service_type: booking.service_type,
      scheduled_at: booking.scheduled_at,
      status: booking.status
    }));
    
    // Get all available courses (for "Unlock More" section)
    const allCourses = await queries.getAllCourses(db, { publishedOnly: true });
    const purchasedCourseIds = new Set(purchases.map(p => p.course_id));
    const availableCourses = allCourses
      .filter(course => !purchasedCourseIds.has(course.id))
      .slice(0, 3)
      .map(course => ({
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        cover_image_url: course.cover_image_url,
        price: course.price
      }));
    
    return c.json({
      user: {
        id: userDetails.id,
        email: userDetails.email,
        name: userDetails.name,
        login_streak: userDetails.login_streak,
        last_login_at: userDetails.last_login_at
      },
      courses: coursesWithProgress.filter(Boolean),
      recent_activity: recentActivity,
      blog_posts: blogPosts,
      consultations,
      available_courses: availableCourses
    });
  } catch (error) {
    console.error('[Dashboard Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500);
  }
});

// GET /api/dashboard/progress - Get progress across all courses
app.get('/progress', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const user = c.get('user');
    
    // Get all user's courses with progress
    const purchases = await queries.getUserPurchases(db, user.id);
    
    const progressData = await Promise.all(
      purchases.map(async (purchase) => {
        const course = await queries.getCourseById(db, purchase.course_id);
        if (!course) return null;
        
        const progress = await queries.getCourseProgress(db, user.id, course.id);
        
        return {
          course_id: course.id,
          course_title: course.title,
          course_slug: course.slug,
          completed: progress.completed,
          total: progress.total,
          percentage: progress.percentage
        };
      })
    );
    
    // Calculate overall progress
    const validProgress = progressData.filter(Boolean) as {
      course_id: number;
      course_title: string;
      course_slug: string;
      completed: number;
      total: number;
      percentage: number;
    }[];
    
    const totalLessons = validProgress.reduce((sum, p) => sum + p.total, 0);
    const completedLessons = validProgress.reduce((sum, p) => sum + p.completed, 0);
    const overallPercentage = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0;
    
    return c.json({
      overall: {
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        percentage: overallPercentage
      },
      courses: validProgress
    });
  } catch (error) {
    console.error('[Progress Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500);
  }
});

// GET /api/dashboard/activity - Get user activity log
app.get('/activity', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const user = c.get('user');
    const limit = parseInt(c.req.query('limit') || '50');
    
    const activityLog = await queries.getUserActivityLog(db, user.id, limit);
    
    return c.json({
      activity: activityLog.map(log => ({
        id: log.id,
        event_type: log.event_type,
        metadata: JSON.parse(log.metadata_json || '{}'),
        created_at: log.created_at
      }))
    });
  } catch (error) {
    console.error('[Activity Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500);
  }
});

// POST /api/dashboard/check-milestone - Check and trigger milestone
app.post('/check-milestone', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const user = c.get('user');
    const body = await c.req.json();
    const { course_id } = body;
    
    if (!course_id) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'course_id is required'
        }
      }, 400);
    }
    
    // Check if user owns the course
    const hasAccess = await queries.hasUserPurchasedCourse(db, user.id, course_id);
    if (!hasAccess) {
      return c.json({
        error: {
          code: 'FORBIDDEN',
          message: 'Course purchase required'
        }
      }, 403);
    }
    
    // Get progress
    const progress = await queries.getCourseProgress(db, user.id, course_id);
    const course = await queries.getCourseById(db, course_id);
    
    if (!course) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Course not found'
        }
      }, 404);
    }
    
    // Determine milestone thresholds crossed
    const thresholds: ('25' | '50' | '75' | '100')[] = ['25', '50', '75', '100'];
    const newMilestones: string[] = [];
    
    for (const threshold of thresholds) {
      const thresholdNum = parseInt(threshold);
      
      // Check if progress meets or exceeds threshold
      if (progress.percentage >= thresholdNum) {
        // Check if milestone already sent
        const alreadySent = await queries.hasMilestoneBeenSent(db, user.id, course_id, threshold);
        
        if (!alreadySent) {
          // Record milestone
          await queries.recordMilestoneSent(db, user.id, course_id, threshold);
          
          // Fire-and-forget: Tag in Encharge
          c.executionCtx.waitUntil(
            encharge.tagMilestone(c.env.ENCHARGE_API_KEY, user.email, threshold, course.slug)
              .catch(err => console.error('[Encharge] Milestone tag failed:', err))
          );
          
          newMilestones.push(threshold);
        }
      }
    }
    
    return c.json({
      progress: progress.percentage,
      new_milestones: newMilestones
    });
  } catch (error) {
    console.error('[Check Milestone Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500);
  }
});

export default app;
