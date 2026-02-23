// Emailit transactional email library
// REST API integration for immediate transactional emails

const EMAILIT_API_URL = 'https://api.emailit.io/v1';

export interface EmailitSendParams {
  to: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
}

// Send email via Emailit API
export async function sendEmail(
  apiKey: string,
  params: EmailitSendParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(`${EMAILIT_API_URL}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      return { success: false, error: error.message || `HTTP ${response.status}` };
    }

    const result = await response.json();
    return { success: true, messageId: result.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Pre-defined email templates

export async function sendWelcomeEmail(
  apiKey: string,
  to: string,
  name: string
): Promise<void> {
  await sendEmail(apiKey, {
    to,
    from: 'welcome@fotf-school.com',
    subject: 'Welcome to Direct Marketing Mastery School',
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #4b6cb7; margin-bottom: 24px;">Welcome, ${name}!</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          You've successfully created your account at Direct Marketing Mastery School. 
          We're excited to help you master marketing from first principles.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Start exploring our free lessons or browse the course catalog to begin your journey.
        </p>
        <div style="margin-top: 32px; padding: 24px; background: #f8f9fa; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            <strong>Your account details:</strong><br>
            Email: ${to}
          </p>
        </div>
        <p style="margin-top: 32px; font-size: 14px; color: #999;">
          If you have any questions, simply reply to this email.
        </p>
      </div>
    `
  });
}

export async function sendPasswordResetEmail(
  apiKey: string,
  to: string,
  resetUrl: string,
  expiresIn: string = '1 hour'
): Promise<void> {
  await sendEmail(apiKey, {
    to,
    from: 'support@fotf-school.com',
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #4b6cb7; margin-bottom: 24px;">Password Reset</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          We received a request to reset your password. Click the button below to create a new password:
        </p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 16px 32px; background: #4b6cb7; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #666;">
          This link will expire in ${expiresIn}. If you didn't request this reset, you can safely ignore this email.
        </p>
        <p style="margin-top: 32px; font-size: 12px; color: #999;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          ${resetUrl}
        </p>
      </div>
    `
  });
}

export async function sendPurchaseReceiptEmail(
  apiKey: string,
  to: string,
  name: string,
  courseName: string,
  amount: number, // in cents
  dashboardUrl: string
): Promise<void> {
  const formattedAmount = (amount / 100).toFixed(2);
  
  await sendEmail(apiKey, {
    to,
    from: 'receipts@fotf-school.com',
    subject: `Your purchase receipt: ${courseName}`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #4b6cb7; margin-bottom: 24px;">Thank you for your purchase!</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Hi ${name},
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          You've successfully purchased <strong>${courseName}</strong>. You now have lifetime access to all course materials.
        </p>
        <div style="margin: 32px 0; padding: 24px; background: #f0f4f8; border-radius: 8px; border-left: 4px solid #4b6cb7;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Order Summary</p>
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #333;">
            ${courseName}: $${formattedAmount}
          </p>
        </div>
        <div style="margin: 32px 0; text-align: center;">
          <a href="${dashboardUrl}" 
             style="display: inline-block; padding: 16px 32px; background: #4b6cb7; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Go to Dashboard
          </a>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #666;">
          Questions? Reply to this email anytime.
        </p>
      </div>
    `
  });
}

export async function sendBookingConfirmationEmail(
  apiKey: string,
  to: string,
  name: string,
  serviceType: string,
  scheduledAt: string,
  calLink: string
): Promise<void> {
  const formattedDate = new Date(scheduledAt).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  await sendEmail(apiKey, {
    to,
    from: 'consulting@fotf-school.com',
    subject: `Confirmed: ${serviceType} on ${formattedDate}`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #4b6cb7; margin-bottom: 24px;">You're all set!</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Hi ${name},
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Your consultation has been confirmed:
        </p>
        <div style="margin: 32px 0; padding: 24px; background: #f0f4f8; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Service</p>
          <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #333;">${serviceType}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Date & Time</p>
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #333;">${formattedDate}</p>
        </div>
        <div style="margin: 32px 0; text-align: center;">
          <a href="${calLink}" 
             style="display: inline-block; padding: 16px 32px; background: #4b6cb7; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            View in Calendar
          </a>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #666;">
          You'll receive a reminder 24 hours before our call. Looking forward to speaking with you!
        </p>
      </div>
    `
  });
}

export async function sendBookingCancellationEmail(
  apiKey: string,
  to: string,
  name: string,
  serviceType: string,
  scheduledAt: string,
  rebookUrl: string
): Promise<void> {
  const formattedDate = new Date(scheduledAt).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  await sendEmail(apiKey, {
    to,
    from: 'consulting@fotf-school.com',
    subject: `Cancelled: ${serviceType}`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #666; margin-bottom: 24px;">Booking Cancelled</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Hi ${name},
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Your ${serviceType} session scheduled for ${formattedDate} has been cancelled.
        </p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="${rebookUrl}" 
             style="display: inline-block; padding: 16px 32px; background: #4b6cb7; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Reschedule
          </a>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #666;">
          No problem at all — things come up. Feel free to book another time that works better.
        </p>
      </div>
    `
  });
}

export async function sendPaymentFailedAdminAlert(
  apiKey: string,
  adminEmail: string,
  customerEmail: string,
  amount: number,
  errorMessage: string
): Promise<void> {
  const formattedAmount = (amount / 100).toFixed(2);

  await sendEmail(apiKey, {
    to: adminEmail,
    from: 'alerts@fotf-school.com',
    subject: 'ALERT: Payment Failed',
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #dc2626; margin-bottom: 24px;">⚠️ Payment Failed</h1>
        <div style="padding: 24px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Customer</p>
          <p style="margin: 0 0 16px 0; font-size: 16px; color: #333;">${customerEmail}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Amount</p>
          <p style="margin: 0 0 16px 0; font-size: 16px; color: #333;">$${formattedAmount}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Error</p>
          <p style="margin: 0; font-size: 14px; color: #dc2626;">${errorMessage}</p>
        </div>
        <p style="margin-top: 24px; font-size: 14px; color: #666;">
          Dunning sequence has been triggered automatically via Encharge.
        </p>
      </div>
    `
  });
}
