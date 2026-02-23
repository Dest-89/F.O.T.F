// Payment routes
import { Hono } from 'hono';
import { z } from 'zod';
import * as queries from '../db/queries';
import * as stripe from '../lib/stripe';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: CloudflareBindings }>();

const checkoutSchema = z.object({
  course_id: z.number().int().positive('Course ID is required')
});

// POST /api/payments/checkout - Create a Stripe checkout session
app.post('/checkout', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const result = checkoutSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: result.error.errors[0].message
        }
      }, 400);
    }
    
    const { course_id } = result.data;
    const db = c.env.DB;
    const user = c.get('user');
    
    // Get course
    const course = await queries.getCourseById(db, course_id, { publishedOnly: true });
    if (!course) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Course not found'
        }
      }, 404);
    }
    
    // Check if already purchased
    const hasAccess = await queries.hasUserPurchasedCourse(db, user.id, course_id);
    if (hasAccess) {
      return c.json({
        error: {
          code: 'CONFLICT',
          message: 'You already own this course'
        }
      }, 409);
    }
    
    // Build success and cancel URLs
    const origin = c.req.header('origin') || 'https://fotf-school.com';
    const successUrl = `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/courses/${course.slug}`;
    
    // Create checkout session
    const session = await stripe.createCheckoutSession(
      c.env.STRIPE_SECRET_KEY,
      {
        courseId: course.id,
        courseName: course.title,
        amount: course.price,
        userId: user.id,
        userEmail: user.email,
        successUrl,
        cancelUrl
      }
    );
    
    return c.json({
      session_id: session.id,
      checkout_url: session.url
    });
  } catch (error) {
    console.error('[Checkout Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create checkout session'
      }
    }, 500);
  }
});

// GET /api/payments/session/:sessionId - Get checkout session status
app.get('/session/:sessionId', authMiddleware, async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    
    if (!sessionId.startsWith('cs_')) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid session ID'
        }
      }, 400);
    }
    
    const session = await stripe.getCheckoutSession(
      c.env.STRIPE_SECRET_KEY,
      sessionId
    );
    
    return c.json({
      status: session.status,
      payment_status: session.payment_status,
      course_id: session.metadata.course_id,
      customer_email: session.customer_email
    });
  } catch (error) {
    console.error('[Session Status Error]', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get session status'
      }
    }, 500);
  }
});

export default app;
