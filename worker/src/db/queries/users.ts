// User-related database queries
import type { User, UserPurchase, LessonProgress, StudentActivityLog } from '../schema';

export async function getUserById(db: D1Database, id: number): Promise<User | null> {
  const result = await db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(id).first<User>();
  return result || null;
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const result = await db.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(email).first<User>();
  return result || null;
}

export async function createUser(
  db: D1Database,
  params: {
    email: string;
    password_hash: string;
    name: string | null;
    first_touch_source?: string;
    first_touch_medium?: string;
    first_touch_campaign?: string;
    first_touch_page?: string;
  }
): Promise<number> {
  const result = await db.prepare(
    `INSERT INTO users (email, password_hash, name, first_touch_source, first_touch_medium, first_touch_campaign, first_touch_page)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    params.email,
    params.password_hash,
    params.name,
    params.first_touch_source || null,
    params.first_touch_medium || null,
    params.first_touch_campaign || null,
    params.first_touch_page || null
  ).run();
  
  return result.meta.last_row_id as number;
}

export async function updateLastLogin(db: D1Database, userId: number): Promise<void> {
  const now = new Date().toISOString();
  
  // Get current user to check streak
  const user = await getUserById(db, userId);
  if (user) {
    let newStreak = 1;
    let lastStreakDate = user.last_streak_at;
    
    if (lastStreakDate) {
      const lastDate = new Date(lastStreakDate);
      const today = new Date(now);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Reset to beginning of day for comparison
      lastDate.setHours(0, 0, 0, 0);
      yesterday.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      if (lastDate.getTime() === yesterday.getTime()) {
        // Consecutive day - increment streak
        newStreak = (user.login_streak || 0) + 1;
      } else if (lastDate.getTime() === today.getTime()) {
        // Same day - keep current streak
        newStreak = user.login_streak || 1;
      }
      // Otherwise (gap > 1 day) - reset to 1
    }
    
    await db.prepare(
      'UPDATE users SET last_login_at = ?, login_streak = ?, last_streak_at = ? WHERE id = ?'
    ).bind(now, newStreak, now, userId).run();
  }
}

export async function updateUserPassword(
  db: D1Database,
  userId: number,
  password_hash: string
): Promise<void> {
  await db.prepare(
    'UPDATE users SET password_hash = ? WHERE id = ?'
  ).bind(password_hash, userId).run();
}

export async function getUserPurchases(db: D1Database, userId: number): Promise<UserPurchase[]> {
  const result = await db.prepare(
    'SELECT * FROM user_purchases WHERE user_id = ? ORDER BY purchased_at DESC'
  ).bind(userId).all<UserPurchase>();
  return result.results || [];
}

export async function hasUserPurchasedCourse(
  db: D1Database,
  userId: number,
  courseId: number
): Promise<boolean> {
  const result = await db.prepare(
    'SELECT 1 FROM user_purchases WHERE user_id = ? AND course_id = ?'
  ).bind(userId, courseId).first();
  return !!result;
}

export async function createPurchase(
  db: D1Database,
  params: {
    user_id: number;
    course_id: number;
    stripe_session_id: string | null;
    amount: number;
    attribution_source?: string;
    attribution_medium?: string;
    attribution_campaign?: string;
  }
): Promise<void> {
  await db.prepare(
    `INSERT INTO user_purchases (user_id, course_id, stripe_session_id, amount, attribution_source, attribution_medium, attribution_campaign)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    params.user_id,
    params.course_id,
    params.stripe_session_id,
    params.amount,
    params.attribution_source || null,
    params.attribution_medium || null,
    params.attribution_campaign || null
  ).run();
}

export async function getLessonProgress(
  db: D1Database,
  userId: number,
  lessonId: number
): Promise<LessonProgress | null> {
  const result = await db.prepare(
    'SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?'
  ).bind(userId, lessonId).first<LessonProgress>();
  return result || null;
}

export async function getUserProgressForCourse(
  db: D1Database,
  userId: number,
  courseId: number
): Promise<LessonProgress[]> {
  const result = await db.prepare(
    `SELECT lp.* FROM lesson_progress lp
     JOIN lessons l ON lp.lesson_id = l.id
     WHERE lp.user_id = ? AND l.course_id = ?`
  ).bind(userId, courseId).all<LessonProgress>();
  return result.results || [];
}

export async function markLessonComplete(
  db: D1Database,
  userId: number,
  lessonId: number
): Promise<void> {
  await db.prepare(
    `INSERT OR IGNORE INTO lesson_progress (user_id, lesson_id, completed_at)
     VALUES (?, ?, ?)`
  ).bind(userId, lessonId, new Date().toISOString()).run();
}

export async function logActivity(
  db: D1Database,
  params: {
    user_id: number;
    event_type: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await db.prepare(
    'INSERT INTO student_activity_log (user_id, event_type, metadata_json, created_at) VALUES (?, ?, ?, ?)'
  ).bind(
    params.user_id,
    params.event_type,
    JSON.stringify(params.metadata || {}),
    new Date().toISOString()
  ).run();
}

export async function getUserActivityLog(
  db: D1Database,
  userId: number,
  limit: number = 50
): Promise<StudentActivityLog[]> {
  const result = await db.prepare(
    'SELECT * FROM student_activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).bind(userId, limit).all<StudentActivityLog>();
  return result.results || [];
}

export async function getAllUsers(
  db: D1Database,
  options: { limit?: number; offset?: number } = {}
): Promise<{ users: User[]; total: number }> {
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  
  const [usersResult, countResult] = await Promise.all([
    db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset).all<User>(),
    db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>()
  ]);
  
  return {
    users: usersResult.results || [],
    total: countResult?.count || 0
  };
}
