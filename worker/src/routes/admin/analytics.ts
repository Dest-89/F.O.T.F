// Admin analytics routes
import { Hono } from 'hono';
import * as queries from '../../db/queries';
import { adminMiddleware } from '../../middleware/auth';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// All routes require admin
app.use('*', adminMiddleware);

// GET /api/admin/analytics/dashboard - Dashboard stats
app.get('/dashboard', async (c) => {
  try {
    const db = c.env.DB;
    const stats = await queries.getDashboardStats(db);
    
    return c.json({
      stats: {
        total_users: stats.totalUsers,
        total_purchases: stats.totalPurchases,
        total_revenue_cents: stats.totalRevenue,
        total_revenue_dollars: (stats.totalRevenue / 100).toFixed(2),
        active_users_7d: stats.activeUsers7d,
        new_users_7d: stats.newUsers7d,
        new_purchases_7d: stats.newPurchases7d
      }
    });
  } catch (error) {
    console.error('[Admin Dashboard Stats Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// GET /api/admin/analytics/attribution - Revenue attribution report
app.get('/attribution', async (c) => {
  try {
    const db = c.env.DB;
    const [revenueAttribution, firstTouchAttribution] = await Promise.all([
      queries.getRevenueAttributionReport(db),
      queries.getFirstTouchAttributionReport(db)
    ]);
    
    return c.json({
      revenue_attribution: revenueAttribution.map(row => ({
        source: row.source,
        medium: row.medium,
        campaign: row.campaign,
        purchases: row.count,
        revenue_cents: row.totalRevenue,
        revenue_dollars: (row.totalRevenue / 100).toFixed(2)
      })),
      first_touch_attribution: firstTouchAttribution.map(row => ({
        source: row.source,
        medium: row.medium,
        registrations: row.count
      }))
    });
  } catch (error) {
    console.error('[Admin Attribution Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// GET /api/admin/analytics/courses - Course sales report
app.get('/courses', async (c) => {
  try {
    const db = c.env.DB;
    const report = await queries.getCourseSalesReport(db);
    
    return c.json({
      courses: report.map(row => ({
        course_id: row.courseId,
        course_title: row.courseTitle,
        sales_count: row.sales,
        revenue_cents: row.revenue,
        revenue_dollars: (row.revenue / 100).toFixed(2)
      }))
    });
  } catch (error) {
    console.error('[Admin Course Sales Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// GET /api/admin/analytics/activity - Recent activity feed
app.get('/activity', async (c) => {
  try {
    const db = c.env.DB;
    const limit = parseInt(c.req.query('limit') || '50');
    
    const activity = await db.prepare(
      `SELECT sal.*, u.email, u.name 
       FROM student_activity_log sal
       JOIN users u ON sal.user_id = u.id
       ORDER BY sal.created_at DESC
       LIMIT ?`
    ).bind(limit).all<{
      id: number;
      user_id: number;
      event_type: string;
      metadata_json: string;
      created_at: string;
      email: string;
      name: string;
    }>();
    
    return c.json({
      activity: (activity.results || []).map(row => ({
        id: row.id,
        user_id: row.user_id,
        user_email: row.email,
        user_name: row.name,
        event_type: row.event_type,
        metadata: JSON.parse(row.metadata_json || '{}'),
        created_at: row.created_at
      }))
    });
  } catch (error) {
    console.error('[Admin Activity Feed Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

// GET /api/admin/analytics/consultations - Consultation bookings report
app.get('/consultations', async (c) => {
  try {
    const db = c.env.DB;
    
    const [bookings, stats] = await Promise.all([
      db.prepare(
        `SELECT cb.*, u.email, u.name 
         FROM consultation_bookings cb
         JOIN users u ON cb.user_id = u.id
         ORDER BY cb.scheduled_at DESC`
      ).all<{
        id: number;
        user_id: number;
        service_type: string;
        scheduled_at: string;
        status: string;
        created_at: string;
        email: string;
        name: string;
      }>(),
      db.prepare(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
           SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
         FROM consultation_bookings`
      ).first<{
        total: number;
        confirmed: number;
        cancelled: number;
        completed: number;
      }>()
    ]);
    
    return c.json({
      bookings: (bookings.results || []).map(row => ({
        id: row.id,
        user_id: row.user_id,
        user_email: row.email,
        user_name: row.name,
        service_type: row.service_type,
        scheduled_at: row.scheduled_at,
        status: row.status,
        created_at: row.created_at
      })),
      stats: {
        total: stats?.total || 0,
        confirmed: stats?.confirmed || 0,
        cancelled: stats?.cancelled || 0,
        completed: stats?.completed || 0
      }
    });
  } catch (error) {
    console.error('[Admin Consultations Error]', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }, 500);
  }
});

export default app;
