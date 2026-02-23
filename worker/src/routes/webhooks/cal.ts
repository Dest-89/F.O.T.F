// Cal.com webhook handler
import { Hono } from 'hono';
import * as queries from '../../db/queries';
import * as emailit from '../../lib/emailit';
import * as encharge from '../../lib/encharge';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// POST /api/webhooks/cal
app.post('/', async (c) => {
  try {
    const payload = await c.req.json();
    const signature = c.req.header('X-Cal-Signature-256');
    
    // Note: Cal.com webhooks don't use HMAC signatures like Stripe
    // They use a shared secret that can be validated if needed
    // For now, we trust the webhook and validate payload structure
    
    const { triggerEvent, payload: eventPayload } = payload;
    
    if (!triggerEvent || !eventPayload) {
      return c.json({ error: 'Invalid payload structure' }, 400);
    }
    
    const db = c.env.DB;
    
    switch (triggerEvent) {
      case 'BOOKING_CREATED': {
        const {
          bookingId,
          eventType: { title: serviceType },
          startTime,
          attendees
        } = eventPayload;
        
        const attendee = attendees?.[0];
        if (!attendee?.email) {
          console.error('[Cal Webhook] No attendee email found');
          return c.json({ received: true });
        }
        
        // Find or create user
        let user = await queries.getUserByEmail(db, attendee.email);
        
        if (!user) {
          // Create a placeholder user for the booking
          // They'll need to register to access the full platform
          const userId = await queries.createUser(db, {
            email: attendee.email,
            password_hash: 'pending', // Will need to set password later
            name: attendee.name || null
          });
          user = await queries.getUserById(db, userId);
        }
        
        if (!user) {
          console.error('[Cal Webhook] Failed to find or create user');
          return c.json({ received: true });
        }
        
        // Create booking record
        await queries.createBooking(db, {
          user_id: user.id,
          cal_booking_id: bookingId,
          service_type: serviceType,
          scheduled_at: startTime
        });
        
        // Log activity
        await queries.logActivity(db, {
          user_id: user.id,
          event_type: 'consultation_booked',
          metadata: { cal_booking_id: bookingId, service_type: serviceType }
        });
        
        // Fire-and-forget: Send confirmation email
        c.executionCtx.waitUntil(
          emailit.sendBookingConfirmationEmail(
            c.env.EMAILIT_API_KEY,
            attendee.email,
            attendee.name || 'there',
            serviceType,
            startTime,
            `https://cal.com/booking/${bookingId}` // Cal.com booking link
          ).catch(err => console.error('[Emailit] Booking confirmation failed:', err))
        );
        
        // Fire-and-forget: Encharge pre-call nurture
        c.executionCtx.waitUntil(
          encharge.tagCallBooked(c.env.ENCHARGE_API_KEY, attendee.email)
            .catch(err => console.error('[Encharge] Call booked tag failed:', err))
        );
        
        break;
      }
      
      case 'BOOKING_CANCELLED': {
        const { bookingId, startTime, attendees } = eventPayload;
        
        const attendee = attendees?.[0];
        if (!attendee?.email) {
          console.error('[Cal Webhook] No attendee email found for cancellation');
          return c.json({ received: true });
        }
        
        // Find booking
        const booking = await queries.getBookingByCalId(db, bookingId);
        
        if (booking) {
          // Update status
          await queries.updateBookingStatus(db, booking.id, 'cancelled');
          
          // Log activity
          await queries.logActivity(db, {
            user_id: booking.user_id,
            event_type: 'consultation_cancelled',
            metadata: { cal_booking_id: bookingId }
          });
        }
        
        // Fire-and-forget: Send cancellation email
        c.executionCtx.waitUntil(
          emailit.sendBookingCancellationEmail(
            c.env.EMAILIT_API_KEY,
            attendee.email,
            attendee.name || 'there',
            eventPayload.eventType?.title || 'Consultation',
            startTime,
            'https://fotf-school.com/services' // Rebooking link
          ).catch(err => console.error('[Emailit] Cancellation email failed:', err))
        );
        
        break;
      }
      
      case 'BOOKING_RESCHEDULED': {
        const { bookingId, startTime } = eventPayload;
        
        // Update booking
        await queries.updateBookingByCalId(db, bookingId, {
          scheduled_at: startTime
        });
        
        // Find user for notification
        const booking = await queries.getBookingByCalId(db, bookingId);
        if (booking) {
          // Log activity
          await queries.logActivity(db, {
            user_id: booking.user_id,
            event_type: 'consultation_rescheduled',
            metadata: { cal_booking_id: bookingId, new_time: startTime }
          });
        }
        
        // Note: Cal.com typically sends a new BOOKING_CREATED event for reschedules
        // with the new time, so we might not need additional email handling here
        
        break;
      }
    }
    
    return c.json({ received: true });
  } catch (error) {
    console.error('[Cal Webhook Error]', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

export default app;
