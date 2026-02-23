// Stripe webhook handler
import { Hono } from 'hono';
import * as stripe from '../../lib/stripe';
import * as queries from '../../db/queries';
import * as emailit from '../../lib/emailit';
import * as encharge from '../../lib/encharge';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// POST /api/webhooks/stripe
app.post('/', async (c) => {
  try {
    const payload = await c.req.text();
    const signature = c.req.header('stripe-signature');
    
    if (!signature) {
      return c.json({ error: 'Missing signature' }, 400);
    }
    
    // Verify signature
    const event = await stripe.verifyWebhookSignature(
      payload,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET
    );
    
    if (!event) {
      return c.json({ error: 'Invalid signature' }, 400);
    }
    
    const db = c.env.DB;
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          id: string;
          metadata: { course_id: string; user_id: string };
          customer_email: string;
          amount_total: number;
        };
        
        const courseId = parseInt(session.metadata.course_id);
        const userId = parseInt(session.metadata.user_id);
        
        // Check if already processed
        const existingPurchase = await db.prepare(
          'SELECT 1 FROM user_purchases WHERE stripe_session_id = ?'
        ).bind(session.id).first();
        
        if (existingPurchase) {
          return c.json({ received: true });
        }
        
        // Get user
        const user = await queries.getUserById(db, userId);
        if (!user) {
          console.error(`[Stripe Webhook] User not found: ${userId}`);
          return c.json({ error: 'User not found' }, 400);
        }
        
        // Get course
        const course = await queries.getCourseById(db, courseId);
        if (!course) {
          console.error(`[Stripe Webhook] Course not found: ${courseId}`);
          return c.json({ error: 'Course not found' }, 400);
        }
        
        // Create purchase record
        await queries.createPurchase(db, {
          user_id: userId,
          course_id: courseId,
          stripe_session_id: session.id,
          amount: session.amount_total,
          attribution_source: user.first_touch_source || undefined,
          attribution_medium: user.first_touch_medium || undefined,
          attribution_campaign: user.first_touch_campaign || undefined
        });
        
        // Log activity
        await queries.logActivity(db, {
          user_id: userId,
          event_type: 'course_purchased',
          metadata: { course_id: courseId, amount: session.amount_total }
        });
        
        // Fire-and-forget: Send receipt email
        c.executionCtx.waitUntil(
          emailit.sendPurchaseReceiptEmail(
            c.env.EMAILIT_API_KEY,
            user.email,
            user.name || 'there',
            course.title,
            session.amount_total,
            `${c.req.header('origin') || 'https://fotf-school.com'}/dashboard`
          ).catch(err => console.error('[Emailit] Receipt failed:', err))
        );
        
        // Fire-and-forget: Encharge automation
        c.executionCtx.waitUntil(
          (async () => {
            await encharge.convertLeadToCustomer(c.env.ENCHARGE_API_KEY, user.email);
            await encharge.tagCoursePurchase(c.env.ENCHARGE_API_KEY, user.email, course.slug);
          })().catch(err => console.error('[Encharge] Purchase tagging failed:', err))
        );
        
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as {
          id: string;
          amount: number;
          charges: { data: Array<{ billing_details: { email: string; name: string } }> };
          last_payment_error?: { message: string };
        };
        
        const customerEmail = paymentIntent.charges?.data[0]?.billing_details?.email;
        const errorMessage = paymentIntent.last_payment_error?.message || 'Unknown error';
        
        if (customerEmail) {
          // Fire-and-forget: Tag for dunning sequence
          c.executionCtx.waitUntil(
            encharge.tagPaymentFailed(c.env.ENCHARGE_API_KEY, customerEmail)
              .catch(err => console.error('[Encharge] Payment failed tag failed:', err))
          );
        }
        
        // Fire-and-forget: Alert admin
        c.executionCtx.waitUntil(
          emailit.sendPaymentFailedAdminAlert(
            c.env.EMAILIT_API_KEY,
            'admin@fotf-school.com', // TODO: Configure admin email
            customerEmail || 'unknown',
            paymentIntent.amount,
            errorMessage
          ).catch(err => console.error('[Emailit] Admin alert failed:', err))
        );
        
        break;
      }
    }
    
    return c.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook Error]', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

export default app;
