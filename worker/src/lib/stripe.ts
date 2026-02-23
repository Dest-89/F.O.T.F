// Stripe abstraction layer - processor-agnostic design
// All Stripe SDK calls go through this file only

export interface StripeCheckoutSession {
  id: string;
  url: string;
}

export interface StripeEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

// Create a checkout session for course purchase
export async function createCheckoutSession(
  apiKey: string,
  params: {
    courseId: number;
    courseName: string;
    amount: number; // in cents
    userId: number;
    userEmail: string;
    successUrl: string;
    cancelUrl: string;
  }
): Promise<StripeCheckoutSession> {
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      'mode': 'payment',
      'payment_method_types[]': 'card',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': params.courseName,
      'line_items[0][price_data][unit_amount]': params.amount.toString(),
      'line_items[0][quantity]': '1',
      'success_url': params.successUrl,
      'cancel_url': params.cancelUrl,
      'client_reference_id': params.userId.toString(),
      'customer_email': params.userEmail,
      'metadata[course_id]': params.courseId.toString(),
      'metadata[user_id]': params.userId.toString()
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Stripe API error: ${JSON.stringify(error)}`);
  }

  const session = await response.json() as { id: string; url: string };
  return { id: session.id, url: session.url };
}

// Retrieve a checkout session
export async function getCheckoutSession(
  apiKey: string,
  sessionId: string
): Promise<{
  id: string;
  status: string;
  payment_status: string;
  metadata: Record<string, string>;
  customer_email: string;
  amount_total: number;
}> {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Stripe API error: ${JSON.stringify(error)}`);
  }

  return await response.json();
}

// Verify webhook signature
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<StripeEvent | null> {
  try {
    // Stripe signatures are in format: t=timestamp,v1=signature
    const elements = signature.split(',');
    const signatureHash = elements.find(el => el.startsWith('v1='))?.replace('v1=', '');
    
    if (!signatureHash) {
      return null;
    }

    // Compute expected signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const computedSignature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const computedHash = Array.from(new Uint8Array(computedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (computedHash !== signatureHash) {
      return null;
    }

    // Parse the event
    return JSON.parse(payload) as StripeEvent;
  } catch {
    return null;
  }
}

// Construct event from payload (used when signature verification is done separately)
export function constructEvent(payload: string): StripeEvent | null {
  try {
    return JSON.parse(payload) as StripeEvent;
  } catch {
    return null;
  }
}
