/**
 * Jobber Integration Library
 *
 * Integrates with Jobber's GraphQL API for field service management.
 * Requires OAuth 2.0 credentials set in environment variables.
 *
 * Flow: OpenPhone call → AI summary → Admin approval → Jobber job creation
 *
 * Environment variables:
 *   JOBBER_CLIENT_ID       - OAuth app client ID
 *   JOBBER_CLIENT_SECRET   - OAuth app client secret
 *   JOBBER_ACCESS_TOKEN    - OAuth access token (refreshed automatically)
 *   JOBBER_REFRESH_TOKEN   - OAuth refresh token
 */

const JOBBER_API_URL = "https://api.getjobber.com/api/graphql";
const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";

// ─── Types ───

export type JobberClient = {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  emails: { address: string; primary: boolean }[];
  phones: { number: string; primary: boolean }[];
  billingAddress?: {
    street1: string;
    street2?: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
};

export type JobberJobInput = {
  clientId: string;
  title: string;
  instructions?: string;
  startAt?: string; // ISO date
  endAt?: string;
  lineItems?: { name: string; description?: string; qty: number; unitPrice: number }[];
};

export type JobberVisitInput = {
  jobId: string;
  startAt: string; // ISO datetime
  endAt: string;
  title?: string;
  instructions?: string;
  teamMembers?: string[]; // Jobber user IDs
};

export type AdminApprovalRequest = {
  id: string;
  type: "jobber_schedule";
  callTranscriptId?: string;
  customerName: string;
  customerPhone: string;
  address: string;
  serviceType: string;
  estimatedHours: number;
  requestedDay?: string;
  requestedTime?: string;
  aiSummary: string;
  cleanerBroadcast?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
};

// ─── Auth helpers ───

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string | null> {
  // Check environment
  const accessToken = process.env.JOBBER_ACCESS_TOKEN;
  const refreshToken = process.env.JOBBER_REFRESH_TOKEN;
  const clientId = process.env.JOBBER_CLIENT_ID;
  const clientSecret = process.env.JOBBER_CLIENT_SECRET;

  if (!accessToken && !refreshToken) {
    console.log("[jobber] No credentials configured — skipping");
    return null;
  }

  // Use cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  // If we have a refresh token, try refreshing
  if (refreshToken && clientId && clientSecret) {
    try {
      const res = await fetch(JOBBER_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        cachedToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // refresh 60s early
        console.log("[jobber] Token refreshed successfully");
        return cachedToken;
      }
      console.error("[jobber] Token refresh failed:", res.status);
    } catch (err) {
      console.error("[jobber] Token refresh error:", err);
    }
  }

  // Fallback to static access token
  if (accessToken) {
    cachedToken = accessToken;
    tokenExpiry = Date.now() + 3600_000; // assume 1 hour
    return cachedToken;
  }

  return null;
}

// ─── GraphQL helper ───

async function jobberQuery(query: string, variables?: Record<string, any>): Promise<any> {
  const token = await getAccessToken();
  if (!token) throw new Error("Jobber not configured");

  const res = await fetch(JOBBER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await res.json();
  if (data.errors) {
    console.error("[jobber] GraphQL errors:", JSON.stringify(data.errors));
    throw new Error(`Jobber API error: ${data.errors[0]?.message}`);
  }
  return data.data;
}

// ─── Public API ───

export function isJobberConfigured(): boolean {
  return !!(process.env.JOBBER_ACCESS_TOKEN || process.env.JOBBER_REFRESH_TOKEN);
}

/** Find or create a client in Jobber by phone number */
export async function findOrCreateJobberClient(info: {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: {
    street1: string;
    city: string;
    province: string;
    postalCode: string;
  };
}): Promise<string> {
  // First, try to find existing client by phone
  const searchResult = await jobberQuery(`
    query SearchClients($searchTerm: String!) {
      clients(searchTerm: $searchTerm, first: 5) {
        nodes {
          id
          firstName
          lastName
          phones { number }
        }
      }
    }
  `, { searchTerm: info.phone.replace(/\D/g, "").slice(-10) });

  const existing = searchResult.clients?.nodes?.[0];
  if (existing) {
    console.log(`[jobber] Found existing client: ${existing.id}`);
    return existing.id;
  }

  // Create new client
  const createResult = await jobberQuery(`
    mutation CreateClient($input: ClientCreateInput!) {
      clientCreate(input: $input) {
        client { id firstName lastName }
        userErrors { message path }
      }
    }
  `, {
    input: {
      firstName: info.firstName,
      lastName: info.lastName,
      ...(info.email ? { emails: [{ address: info.email, description: "MAIN", primary: true }] } : {}),
      phones: [{ number: info.phone, description: "MAIN", primary: true }],
      ...(info.address ? {
        billingAddress: {
          street1: info.address.street1,
          city: info.address.city,
          province: info.address.province,
          postalCode: info.address.postalCode,
          country: "US",
        },
      } : {}),
    },
  });

  const clientId = createResult.clientCreate?.client?.id;
  if (!clientId) {
    const errors = createResult.clientCreate?.userErrors;
    throw new Error(`Failed to create Jobber client: ${JSON.stringify(errors)}`);
  }
  console.log(`[jobber] Created new client: ${clientId}`);
  return clientId;
}

/** Create a job in Jobber (work order) */
export async function createJobberJob(input: {
  clientId: string;
  title: string;
  instructions?: string;
}): Promise<string> {
  const result = await jobberQuery(`
    mutation CreateJob($input: JobCreateInput!) {
      jobCreate(input: $input) {
        job { id title }
        userErrors { message path }
      }
    }
  `, {
    input: {
      clientId: input.clientId,
      title: input.title,
      instructions: input.instructions || "",
    },
  });

  const jobId = result.jobCreate?.job?.id;
  if (!jobId) {
    throw new Error(`Failed to create Jobber job: ${JSON.stringify(result.jobCreate?.userErrors)}`);
  }
  console.log(`[jobber] Created job: ${jobId}`);
  return jobId;
}

/** Schedule a visit (appointment) on a Jobber job */
export async function scheduleJobberVisit(input: {
  jobId: string;
  startAt: string; // ISO datetime
  endAt: string;
  instructions?: string;
}): Promise<string> {
  const result = await jobberQuery(`
    mutation CreateVisit($input: VisitCreateInput!) {
      visitCreate(input: $input) {
        visit { id startAt endAt }
        userErrors { message path }
      }
    }
  `, {
    input: {
      jobId: input.jobId,
      startAt: input.startAt,
      endAt: input.endAt,
      instructions: input.instructions || "",
    },
  });

  const visitId = result.visitCreate?.visit?.id;
  if (!visitId) {
    throw new Error(`Failed to create Jobber visit: ${JSON.stringify(result.visitCreate?.userErrors)}`);
  }
  console.log(`[jobber] Scheduled visit: ${visitId}`);
  return visitId;
}

/** Check Jobber connection health */
export async function checkJobberConnection(): Promise<{
  connected: boolean;
  companyName?: string;
  error?: string;
}> {
  try {
    const data = await jobberQuery(`
      query HealthCheck {
        account {
          name
        }
      }
    `);
    return {
      connected: true,
      companyName: data.account?.name,
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message,
    };
  }
}
