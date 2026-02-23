// Authentication middleware for Hono
import { createMiddleware } from 'hono/factory';
import { verifyJwt } from '../lib/auth';
import type { JwtPayload } from '../db/schema';

// Extend Hono context types
declare module 'hono' {
  interface ContextVariableMap {
    user: {
      id: number;
      email: string;
      role: 'student' | 'admin';
    };
  }
}

// Auth middleware - verifies JWT and attaches user to context
export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ 
      error: { 
        code: 'UNAUTHORIZED', 
        message: 'Authorization header required' 
      } 
    }, 401);
  }
  
  const token = authHeader.slice(7);
  const jwtSecret = c.env.JWT_SECRET;
  
  if (!jwtSecret) {
    console.error('[Auth Middleware] JWT_SECRET not configured');
    return c.json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Authentication service unavailable' 
      } 
    }, 500);
  }
  
  const payload = await verifyJwt(token, jwtSecret);
  
  if (!payload) {
    return c.json({ 
      error: { 
        code: 'UNAUTHORIZED', 
        message: 'Invalid or expired token' 
      } 
    }, 401);
  }
  
  // Attach user to context
  c.set('user', {
    id: payload.userId,
    email: payload.email,
    role: payload.role
  });
  
  await next();
});

// Admin middleware - extends auth middleware with role check
export const adminMiddleware = createMiddleware(async (c, next) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ 
      error: { 
        code: 'UNAUTHORIZED', 
        message: 'Authentication required' 
      } 
    }, 401);
  }
  
  if (user.role !== 'admin') {
    return c.json({ 
      error: { 
        code: 'FORBIDDEN', 
        message: 'Admin access required' 
      } 
    }, 403);
  }
  
  await next();
});

// Optional auth middleware - attaches user if token valid, but doesn't require it
export const optionalAuthMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const jwtSecret = c.env.JWT_SECRET;
    
    if (jwtSecret) {
      const payload = await verifyJwt(token, jwtSecret);
      
      if (payload) {
        c.set('user', {
          id: payload.userId,
          email: payload.email,
          role: payload.role
        });
      }
    }
  }
  
  await next();
});
