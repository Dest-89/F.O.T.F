// Consultation booking-related database queries
import type { ConsultationBooking } from '../schema';

export async function getAllBookings(
  db: D1Database,
  options: { userId?: number; limit?: number; offset?: number } = {}
): Promise<{ bookings: ConsultationBooking[]; total: number }> {
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  
  let whereClause = '';
  const bindValues: (number)[] = [];
  
  if (options.userId) {
    whereClause = 'WHERE user_id = ?';
    bindValues.push(options.userId);
  }
  
  const [bookingsResult, countResult] = await Promise.all([
    db.prepare(
      `SELECT * FROM consultation_bookings ${whereClause} ORDER BY scheduled_at DESC LIMIT ? OFFSET ?`
    ).bind(...bindValues, limit, offset).all<ConsultationBooking>(),
    db.prepare(
      `SELECT COUNT(*) as count FROM consultation_bookings ${whereClause}`
    ).bind(...bindValues).first<{ count: number }>()
  ]);
  
  return {
    bookings: bookingsResult.results || [],
    total: countResult?.count || 0
  };
}

export async function getBookingById(
  db: D1Database,
  id: number
): Promise<ConsultationBooking | null> {
  const result = await db.prepare(
    'SELECT * FROM consultation_bookings WHERE id = ?'
  ).bind(id).first<ConsultationBooking>();
  return result || null;
}

export async function getBookingByCalId(
  db: D1Database,
  calBookingId: string
): Promise<ConsultationBooking | null> {
  const result = await db.prepare(
    'SELECT * FROM consultation_bookings WHERE cal_booking_id = ?'
  ).bind(calBookingId).first<ConsultationBooking>();
  return result || null;
}

export async function createBooking(
  db: D1Database,
  params: {
    user_id: number;
    cal_booking_id: string;
    service_type: string;
    scheduled_at: string;
  }
): Promise<number> {
  const result = await db.prepare(
    `INSERT INTO consultation_bookings (user_id, cal_booking_id, service_type, scheduled_at, status, created_at)
     VALUES (?, ?, ?, ?, 'confirmed', ?)`
  ).bind(
    params.user_id,
    params.cal_booking_id,
    params.service_type,
    params.scheduled_at,
    new Date().toISOString()
  ).run();
  
  return result.meta.last_row_id as number;
}

export async function updateBookingStatus(
  db: D1Database,
  id: number,
  status: 'confirmed' | 'cancelled' | 'completed'
): Promise<void> {
  await db.prepare(
    'UPDATE consultation_bookings SET status = ? WHERE id = ?'
  ).bind(status, id).run();
}

export async function updateBookingByCalId(
  db: D1Database,
  calBookingId: string,
  params: {
    scheduled_at?: string;
    status?: 'confirmed' | 'cancelled' | 'completed';
  }
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number)[] = [];
  
  if (params.scheduled_at !== undefined) {
    fields.push('scheduled_at = ?');
    values.push(params.scheduled_at);
  }
  if (params.status !== undefined) {
    fields.push('status = ?');
    values.push(params.status);
  }
  
  values.push(calBookingId);
  
  await db.prepare(
    `UPDATE consultation_bookings SET ${fields.join(', ')} WHERE cal_booking_id = ?`
  ).bind(...values).run();
}

export async function getUpcomingBookings(
  db: D1Database,
  userId?: number,
  limit: number = 10
): Promise<ConsultationBooking[]> {
  let query = 'SELECT * FROM consultation_bookings WHERE status = \'confirmed\' AND scheduled_at > ?';
  const bindValues: (string | number)[] = [new Date().toISOString()];
  
  if (userId) {
    query += ' AND user_id = ?';
    bindValues.push(userId);
  }
  
  query += ' ORDER BY scheduled_at ASC LIMIT ?';
  bindValues.push(limit);
  
  const result = await db.prepare(query).bind(...bindValues).all<ConsultationBooking>();
  return result.results || [];
}
