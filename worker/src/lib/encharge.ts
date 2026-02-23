// Encharge lifecycle automation library
// Tag-based REST API only (LTD plan - Ingest API not available)
// All flows trigger on "Tag Added" conditions in Encharge

const ENCHARGE_API_URL = 'https://api.encharge.io/v1';

// Upsert a contact in Encharge
export async function upsertContact(
  apiKey: string,
  params: {
    email: string;
    firstName?: string;
    lastName?: string;
    fields?: Record<string, string | number | boolean>;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${ENCHARGE_API_URL}/people`, {
      method: 'POST',
      headers: {
        'X-Encharge-Token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        ...params.fields
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      return { success: false, error: error.message || `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Add a tag to a contact
export async function addTag(
  apiKey: string,
  email: string,
  tag: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${ENCHARGE_API_URL}/people/tags`, {
      method: 'POST',
      headers: {
        'X-Encharge-Token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        people: [{ email }],
        tags: [tag]
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      return { success: false, error: error.message || `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Remove a tag from a contact
export async function removeTag(
  apiKey: string,
  email: string,
  tag: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${ENCHARGE_API_URL}/people/tags`, {
      method: 'DELETE',
      headers: {
        'X-Encharge-Token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        people: [{ email }],
        tags: [tag]
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      return { success: false, error: error.message || `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ============================================================
// Convenience methods for specific lifecycle events
// These map to the Encharge Tag Vocabulary defined in architecture.md
// ============================================================

// User registered - triggers welcome sequence
export async function tagLead(
  apiKey: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  return addTag(apiKey, email, 'Lead');
}

// Course purchased - triggers course onboarding
export async function tagCustomer(
  apiKey: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  return addTag(apiKey, email, 'Customer');
}

// Tag with specific course - triggers course-specific onboarding
export async function tagCoursePurchase(
  apiKey: string,
  email: string,
  courseSlug: string
): Promise<{ success: boolean; error?: string }> {
  return addTag(apiKey, email, `Course-${courseSlug}`);
}

// Convert Lead to Customer (remove Lead tag, add Customer tag)
export async function convertLeadToCustomer(
  apiKey: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  await removeTag(apiKey, email, 'Lead');
  return addTag(apiKey, email, 'Customer');
}

// Call booked - triggers pre-call nurture sequence
export async function tagCallBooked(
  apiKey: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  return addTag(apiKey, email, 'Call-Booked');
}

// Post-call follow-up - triggers proposal + payment link
export async function tagPostCall(
  apiKey: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  return addTag(apiKey, email, 'Post-Call');
}

// Progress milestones - triggers milestone emails
export async function tagMilestone(
  apiKey: string,
  email: string,
  threshold: 25 | 50 | 75 | 100,
  courseSlug: string
): Promise<{ success: boolean; error?: string }> {
  return addTag(apiKey, email, `Milestone-${threshold}-${courseSlug}`);
}

// Payment failed - triggers dunning sequence
export async function tagPaymentFailed(
  apiKey: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  return addTag(apiKey, email, 'Payment-Failed');
}

// Cart abandoned - triggers recovery email
export async function tagCartAbandoned(
  apiKey: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  return addTag(apiKey, email, 'Cart-Abandoned');
}

// ============================================================
// Helper for environment access
// ============================================================

export interface EnchargeEnv {
  ENCHARGE_API_KEY: string;
}
