// Analytics and reporting queries

export interface RevenueAttribution {
  source: string;
  medium: string;
  campaign: string;
  count: number;
  totalRevenue: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalPurchases: number;
  totalRevenue: number;
  activeUsers7d: number;
  newUsers7d: number;
  newPurchases7d: number;
}

export async function getRevenueAttributionReport(
  db: D1Database
): Promise<RevenueAttribution[]> {
  const result = await db.prepare(
    `SELECT 
       COALESCE(attribution_source, 'direct') as source,
       COALESCE(attribution_medium, 'none') as medium,
       COALESCE(attribution_campaign, 'none') as campaign,
       COUNT(*) as count,
       SUM(amount) as totalRevenue
     FROM user_purchases
     GROUP BY attribution_source, attribution_medium, attribution_campaign
     ORDER BY totalRevenue DESC`
  ).all<{
    source: string;
    medium: string;
    campaign: string;
    count: number;
    totalRevenue: number;
  }>();
  
  return (result.results || []).map(row => ({
    source: row.source,
    medium: row.medium,
    campaign: row.campaign,
    count: row.count,
    totalRevenue: row.totalRevenue
  }));
}

export async function getFirstTouchAttributionReport(
  db: D1Database
): Promise<{ source: string; medium: string; count: number }[]> {
  const result = await db.prepare(
    `SELECT 
       COALESCE(first_touch_source, 'direct') as source,
       COALESCE(first_touch_medium, 'none') as medium,
       COUNT(*) as count
     FROM users
     GROUP BY first_touch_source, first_touch_medium
     ORDER BY count DESC`
  ).all<{
    source: string;
    medium: string;
    count: number;
  }>();
  
  return result.results || [];
}

export async function getDashboardStats(db: D1Database): Promise<DashboardStats> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString();
  
  const [
    totalUsersResult,
    totalPurchasesResult,
    totalRevenueResult,
    activeUsersResult,
    newUsersResult,
    newPurchasesResult
  ] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM user_purchases').first<{ count: number }>(),
    db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM user_purchases').first<{ total: number }>(),
    db.prepare(
      'SELECT COUNT(DISTINCT user_id) as count FROM student_activity_log WHERE created_at > ?'
    ).bind(sevenDaysAgoStr).first<{ count: number }>(),
    db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE created_at > ?'
    ).bind(sevenDaysAgoStr).first<{ count: number }>(),
    db.prepare(
      'SELECT COUNT(*) as count FROM user_purchases WHERE purchased_at > ?'
    ).bind(sevenDaysAgoStr).first<{ count: number }>()
  ]);
  
  return {
    totalUsers: totalUsersResult?.count || 0,
    totalPurchases: totalPurchasesResult?.count || 0,
    totalRevenue: totalRevenueResult?.total || 0,
    activeUsers7d: activeUsersResult?.count || 0,
    newUsers7d: newUsersResult?.count || 0,
    newPurchases7d: newPurchasesResult?.count || 0
  };
}

export async function getCourseSalesReport(
  db: D1Database
): Promise<{ courseId: number; courseTitle: string; sales: number; revenue: number }[]> {
  const result = await db.prepare(
    `SELECT 
       c.id as courseId,
       c.title as courseTitle,
       COUNT(up.id) as sales,
       COALESCE(SUM(up.amount), 0) as revenue
     FROM courses c
     LEFT JOIN user_purchases up ON c.id = up.course_id
     GROUP BY c.id, c.title
     ORDER BY revenue DESC`
  ).all<{
    courseId: number;
    courseTitle: string;
    sales: number;
    revenue: number;
  }>();
  
  return result.results || [];
}

export async function getStudentJourneyTimeline(
  db: D1Database,
  userId: number
): Promise<{ date: string; event: string; metadata: Record<string, unknown> }[]> {
  const [activityResult, registrationResult, purchasesResult] = await Promise.all([
    db.prepare(
      'SELECT created_at as date, event_type as event, metadata_json as metadata FROM student_activity_log WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all<{ date: string; event: string; metadata: string }>(),
    db.prepare(
      'SELECT created_at as date, \'registration\' as event FROM users WHERE id = ?'
    ).bind(userId).all<{ date: string; event: string }>(),
    db.prepare(
      'SELECT purchased_at as date, \'course_purchase\' as event, course_id FROM user_purchases WHERE user_id = ?'
    ).bind(userId).all<{ date: string; event: string; course_id: number }>()
  ]);
  
  const timeline: { date: string; event: string; metadata: Record<string, unknown> }[] = [];
  
  // Add registration
  if (registrationResult.results?.[0]) {
    timeline.push({
      date: registrationResult.results[0].date,
      event: 'registration',
      metadata: {}
    });
  }
  
  // Add purchases
  for (const purchase of purchasesResult.results || []) {
    timeline.push({
      date: purchase.date,
      event: 'course_purchase',
      metadata: { course_id: purchase.course_id }
    });
  }
  
  // Add activity log events
  for (const activity of activityResult.results || []) {
    timeline.push({
      date: activity.date,
      event: activity.event,
      metadata: JSON.parse(activity.metadata || '{}')
    });
  }
  
  // Sort by date descending
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return timeline;
}
