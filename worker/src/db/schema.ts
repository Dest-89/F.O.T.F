// Database schema types for Direct Marketing Mastery School
// Cloudflare D1 (SQLite)

export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
  role: 'student' | 'admin';
  created_at: string;
  last_login_at: string | null;
  login_streak: number;
  last_streak_at: string | null;
  // UTM attribution
  first_touch_source: string | null;
  first_touch_medium: string | null;
  first_touch_campaign: string | null;
  first_touch_page: string | null;
}

export interface Course {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  price: number; // in cents
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: number;
  course_id: number;
  title: string;
  slug: string;
  content_html: string | null;
  video_url: string | null;
  order: number;
  is_free_preview: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface LessonProgress {
  id: number;
  user_id: number;
  lesson_id: number;
  completed_at: string;
}

export interface UserPurchase {
  id: number;
  user_id: number;
  course_id: number;
  stripe_session_id: string | null;
  amount: number; // in cents
  purchased_at: string;
  // Attribution
  attribution_source: string | null;
  attribution_medium: string | null;
  attribution_campaign: string | null;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content_html: string | null;
  cover_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultationBooking {
  id: number;
  user_id: number;
  cal_booking_id: string;
  service_type: string;
  scheduled_at: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
}

export interface StudentActivityLog {
  id: number;
  user_id: number;
  event_type: string;
  metadata_json: string | null;
  created_at: string;
}

export interface MilestoneSent {
  id: number;
  user_id: number;
  course_id: number;
  milestone_type: '25' | '50' | '75' | '100';
  sent_at: string;
}

export interface PasswordResetToken {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

// API Response types
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// JWT payload
export interface JwtPayload {
  userId: number;
  email: string;
  role: 'student' | 'admin';
  iat: number;
  exp: number;
}

// Request context
export interface AuthenticatedContext {
  user: {
    id: number;
    email: string;
    role: 'student' | 'admin';
  };
}
