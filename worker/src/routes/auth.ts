// Authentication routes
import { Hono } from 'hono';
import { z } from 'zod';
import {
  hashPassword,
  verifyPassword,
  signJwt,
  generateSecureToken,
  hashToken
} from '../lib/auth';
import * as queries from '../db/queries';
import * as emailit from '../lib/emailit';
import * as encharge from '../lib/encharge';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  // UTM attribution (optional)
  first_touch_source: z.string().optional(),
  first_touch_medium: z.string().optional(),
  first_touch_campaign: z.string().optional(),
  first_touch_page: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const resetRequestSchema = z.object({
  email: z.string().email('Invalid email address')
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

// POST /api/auth/register
app.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const result = registerSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: result.error.errors[0].message
        }
      }, 400);
    }
    
    const { email, password, name, ...utmParams } = result.data;
    const db = c.env.DB;
    
    // Check if user already exists
    const existingUser = await queries.getUserByEmail(db, email);
    if (existingUser) {
      return c.json({
        error: {
          code: 'CONFLICT',
          message: 'An account with this email already exists'
        }
      }, 409);
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user
    const userId = await queries.createUser(db, {
      email,
      password_hash: passwordHash,
      name: name || null,
      first_touch_source: utmParams.first_touch_source,
      first_touch_medium: utmParams.first_touch_medium,
      first_touch_campaign: utmParams.first_touch_campaign,
      first_touch_page: utmParams.first_touch_page
    });
    
    // Get created user
    const user = await queries.getUserById(db, userId);
    if (!user) {
      throw new Error('Failed to create user');
    }
    
    // Generate JWT
    const token = await signJwt(
      { userId: user.id, email: user.email, role: user.role },
      c.env.JWT_SECRET
    );
    
    // Fire-and-forget: Send welcome email
    c.executionCtx.waitUntil(
      emailit.sendWelcomeEmail(c.env.EMAILIT_API_KEY, email, name || 'there')
        .catch(err => console.error('[Emailit] Welcome email failed:', err))
    );
    
    // Fire-and-forget: Add to Encharge
    c.executionCtx.waitUntil(
      (async () => {
        await encharge.upsertContact(c.env.ENCHARGE_API_KEY, {
          email,
          firstName: name
        });
        await encharge.tagLead(c.env.ENCHARGE_API_KEY, email);
      })().catch(err => console.error('[Encharge] Lead tagging failed:', err))
    );
    
    // Log activity
    c.executionCtx.waitUntil(
      queries.logActivity(db, {
        user_id: userId,
        event_type: 'user_registered',
        metadata: { source: utmParams.first_touch_source || 'direct' }
      }).catch(err => console.error('[Activity] Log failed:', err))
    );
    
    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }, 201);
  } catch (error) {
    console.error('[Register Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500);
  }
});

// POST /api/auth/login
app.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: result.error.errors[0].message
        }
      }, 400);
    }
    
    const { email, password } = result.data;
    const db = c.env.DB;
    
    // Get user
    const user = await queries.getUserByEmail(db, email);
    if (!user) {
      return c.json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password'
        }
      }, 401);
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return c.json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password'
        }
      }, 401);
    }
    
    // Update last login and streak
    await queries.updateLastLogin(db, user.id);
    
    // Generate JWT
    const token = await signJwt(
      { userId: user.id, email: user.email, role: user.role },
      c.env.JWT_SECRET
    );
    
    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[Login Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500);
  }
});

// POST /api/auth/reset-password-request
app.post('/reset-password-request', async (c) => {
  try {
    const body = await c.req.json();
    const result = resetRequestSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: result.error.errors[0].message
        }
      }, 400);
    }
    
    const { email } = result.data;
    const db = c.env.DB;
    
    // Get user
    const user = await queries.getUserByEmail(db, email);
    if (!user) {
      // Return success even if user not found (security best practice)
      return c.json({ success: true });
    }
    
    // Generate reset token
    const token = await generateSecureToken(32);
    const tokenHash = await hashToken(token);
    
    // Store token (expires in 1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    await db.prepare(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)'
    ).bind(user.id, tokenHash, expiresAt.toISOString(), new Date().toISOString()).run();
    
    // Build reset URL
    const resetUrl = `${c.req.header('origin') || 'https://fotf-school.com'}/reset-password.html?token=${token}`;
    
    // Fire-and-forget: Send reset email
    c.executionCtx.waitUntil(
      emailit.sendPasswordResetEmail(c.env.EMAILIT_API_KEY, email, resetUrl)
        .catch(err => console.error('[Emailit] Reset email failed:', err))
    );
    
    return c.json({ success: true });
  } catch (error) {
    console.error('[Reset Request Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500);
  }
});

// POST /api/auth/reset-password
app.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const result = resetPasswordSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: result.error.errors[0].message
        }
      }, 400);
    }
    
    const { token, password } = result.data;
    const db = c.env.DB;
    
    // Hash the provided token to compare
    const tokenHash = await hashToken(token);
    
    // Find valid token
    const tokenRecord = await db.prepare(
      `SELECT t.*, u.email FROM password_reset_tokens t
       JOIN users u ON t.user_id = u.id
       WHERE t.token_hash = ? AND t.used = 0 AND t.expires_at > ?`
    ).bind(tokenHash, new Date().toISOString()).first<{
      id: number;
      user_id: number;
      email: string;
    }>();
    
    if (!tokenRecord) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid or expired reset token'
        }
      }, 400);
    }
    
    // Hash new password
    const passwordHash = await hashPassword(password);
    
    // Update password
    await queries.updateUserPassword(db, tokenRecord.user_id, passwordHash);
    
    // Mark token as used
    await db.prepare(
      'UPDATE password_reset_tokens SET used = 1 WHERE id = ?'
    ).bind(tokenRecord.id).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('[Reset Password Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500);
  }
});

// GET /api/auth/me - Get current user
app.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  
  // Get full user details
  const fullUser = await queries.getUserById(db, user.id);
  if (!fullUser) {
    return c.json({
      error: {
        code: 'NOT_FOUND',
        message: 'User not found'
      }
    }, 404);
  }
  
  return c.json({
    id: fullUser.id,
    email: fullUser.email,
    name: fullUser.name,
    role: fullUser.role,
    login_streak: fullUser.login_streak,
    last_login_at: fullUser.last_login_at
  });
});

export default app;
