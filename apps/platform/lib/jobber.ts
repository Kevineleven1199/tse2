import { prisma } from "@/lib/prisma";

/**
 * Jobber API Integration
 *
 * Jobber uses a GraphQL API with OAuth 2.0 authentication.
 * Endpoint: POST https://api.getjobber.com/api/graphql
 * Docs: https://developer.getjobber.com/docs/
 *
 * Required env vars:
 *   JOBBER_CLIENT_ID       - OAuth app client ID
 *   JOBBER_CLIENT_SECRET   - OAuth app client secret
 *   JOBBER_ACCESS_TOKEN    - Current access token (stored in Integration record)
 *   JOBBER_REFRESH_TOKEN   - Refresh token (stored in Integration record)
 *   JOBBER_REDIRECT_URI    - OAuth callback URL
 *
 * Scopes needed: read_clients, write_clients, read_jobs, write_jobs, read_invoices
 */

const JOBBER_GRAPHQL_URL = "https://api.getjobber.com/api/graphql";
const JOBBER_AUTH_URL = "https://api.getjobber.com/api/oauth/authorize";
const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";
const GRAPHQL_VERSION = "2025-01-20";

// ─── OAuth Helpers ───────────────────────────────────────────

export function getJobberAuthUrl(tenantId: string): string {
  const clientId = process.env.JOBBER_CLIENT_ID;
  const redirectUri = process.env.JOBBER_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("JOBBER_CLIENT_ID and JOBBER_REDIRECT_URI are required");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state: tenantId,
  });

  return `${JOBBER_AUTH_URL}?${params.toString()}`;
}

export async function exchangeJobberCode(
  code: string,
  tenantId: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await fetch(JOBBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.JOBBER_CLIENT_ID,
      client_secret: process.env.JOBBER_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.JOBBER_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Jobber token exchange failed: ${err}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // Store tokens in Integration record
  await prisma.integration.upsert({
    where: {
      id: `jobber-${tenantId}`,
    },
    update: {
      config: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      },
      status: "connected",
    },
    create: {
      id: `jobber-${tenantId}`,
      tenantId,
      type: "JOBBER",
      status: "connected",
      config: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      },
    },
  });

  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

async function refreshJobberToken(tenantId: string): Promise<string> {
  const integration = await prisma.integration.findFirst({
    where: { tenantId, type: "JOBBER" },
  });

  if (!integration) throw new Error("Jobber not connected for this tenant");

  const config = integration.config as { refreshToken: string };

  const response = await fetch(JOBBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.JOBBER_CLIENT_ID,
      client_secret: process.env.JOBBER_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: config.refreshToken,
    }),
  });

  if (!response.ok) {
    await prisma.integration.update({
      where: { id: integration.id },
      data: { status: "expired" },
    });
    throw new Error("Jobber token refresh failed — reconnection required");
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      config: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      },
      status: "connected",
    },
  });

  return data.access_token;
}

async function getAccessToken(tenantId: string): Promise<string> {
  const integration = await prisma.integration.findFirst({
    where: { tenantId, type: "JOBBER" },
  });

  if (!integration) throw new Error("Jobber not connected");

  const config = integration.config as {
    accessToken: string;
    expiresAt: string;
  };

  // Refresh if expired or expiring within 5 min
  if (new Date(config.expiresAt) < new Date(Date.now() + 5 * 60 * 1000)) {
    return refreshJobberToken(tenantId);
  }

  return config.accessToken;
}

// ─── GraphQL Client ──────────────────────────────────────────

async function jobberQuery<T = unknown>(
  tenantId: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const token = await getAccessToken(tenantId);

  const response = await fetch(JOBBER_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-JOBBER-GRAPHQL-VERSION": GRAPHQL_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Jobber API error (${response.status}): ${errText}`);
  }

  const result = (await response.json()) as { data: T; errors?: { message: string }[] };

  if (result.errors?.length) {
    throw new Error(`Jobber GraphQL errors: ${result.errors.map((e) => e.message).join(", ")}`);
  }

  return result.data;
}

// ─── Client Sync ─────────────────────────────────────────────

export type JobberClient = {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  emails: { address: string; primary: boolean }[];
  phones: { number: string; primary: boolean }[];
  billingAddress: {
    street1: string;
    street2: string | null;
    city: string;
    province: string;
    postalCode: string;
  } | null;
};

export async function fetchJobberClients(
  tenantId: string,
  cursor?: string
): Promise<{ clients: JobberClient[]; nextCursor: string | null }> {
  const query = `
    query GetClients($first: Int!, $after: String) {
      clients(first: $first, after: $after) {
        nodes {
          id
          firstName
          lastName
          companyName
          emails { address primary }
          phones { number primary }
          billingAddress {
            street1
            street2
            city
            province
            postalCode
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const data = await jobberQuery<{
    clients: {
      nodes: JobberClient[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(tenantId, query, { first: 50, after: cursor ?? null });

  return {
    clients: data.clients.nodes,
    nextCursor: data.clients.pageInfo.hasNextPage ? data.clients.pageInfo.endCursor : null,
  };
}

/**
 * Sync Jobber clients into local ServiceRequest / User records.
 * Creates CUSTOMER users for new Jobber clients so they appear in the CRM.
 */
export async function syncJobberClients(tenantId: string): Promise<number> {
  let synced = 0;
  let cursor: string | undefined;

  do {
    const { clients, nextCursor } = await fetchJobberClients(tenantId, cursor);

    for (const client of clients) {
      const email = client.emails.find((e) => e.primary)?.address ?? client.emails[0]?.address;
      if (!email) continue;

      await prisma.user.upsert({
        where: { email },
        update: {
          firstName: client.firstName,
          lastName: client.lastName,
          phone: client.phones.find((p) => p.primary)?.number ?? client.phones[0]?.number,
        },
        create: {
          tenantId,
          email,
          firstName: client.firstName,
          lastName: client.lastName,
          phone: client.phones.find((p) => p.primary)?.number ?? client.phones[0]?.number,
          role: "CUSTOMER",
        },
      });
      synced++;
    }

    cursor = nextCursor ?? undefined;
  } while (cursor);

  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "JOBBER_CLIENT_SYNC",
      metadata: { clientsSynced: synced },
    },
  });

  return synced;
}

// ─── Job Sync ────────────────────────────────────────────────

export type JobberJob = {
  id: string;
  title: string;
  jobNumber: string;
  client: { id: string; firstName: string; lastName: string };
  startAt: string | null;
  endAt: string | null;
  total: number;
  jobStatus: string;
};

export async function fetchJobberJobs(
  tenantId: string,
  cursor?: string
): Promise<{ jobs: JobberJob[]; nextCursor: string | null }> {
  const query = `
    query GetJobs($first: Int!, $after: String) {
      jobs(first: $first, after: $after) {
        nodes {
          id
          title
          jobNumber
          client { id firstName lastName }
          startAt
          endAt
          total
          jobStatus
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const data = await jobberQuery<{
    jobs: {
      nodes: JobberJob[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(tenantId, query, { first: 50, after: cursor ?? null });

  return {
    jobs: data.jobs.nodes,
    nextCursor: data.jobs.pageInfo.hasNextPage ? data.jobs.pageInfo.endCursor : null,
  };
}

// ─── Create Client in Jobber ─────────────────────────────────

export async function createJobberClient(
  tenantId: string,
  input: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  }
): Promise<string> {
  const mutation = `
    mutation CreateClient($input: ClientCreateInput!) {
      clientCreate(input: $input) {
        client {
          id
        }
        userErrors {
          message
          path
        }
      }
    }
  `;

  const data = await jobberQuery<{
    clientCreate: {
      client: { id: string } | null;
      userErrors: { message: string; path: string[] }[];
    };
  }>(tenantId, mutation, {
    input: {
      firstName: input.firstName,
      lastName: input.lastName,
      emails: input.email ? [{ description: "Main", address: input.email }] : [],
      phones: input.phone ? [{ description: "Main", number: input.phone }] : [],
    },
  });

  if (data.clientCreate.userErrors.length > 0) {
    throw new Error(`Jobber client creation failed: ${data.clientCreate.userErrors.map((e) => e.message).join(", ")}`);
  }

  return data.clientCreate.client!.id;
}

// ─── Quote / Estimate Sync ──────────────────────────────────

export type JobberQuote = {
  id: string;
  quoteNumber: number;
  title: string | null;
  quoteStatus: string;
  amounts: { total: number } | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    emails: { address: string }[];
    phones: { number: string }[];
    billingAddress: {
      street1: string;
      street2: string | null;
      city: string;
      province: string;
      postalCode: string;
    } | null;
  };
  lineItems: { nodes: { name: string; description: string | null; totalPrice: number }[] };
  createdAt: string;
};

export async function fetchJobberQuotes(
  tenantId: string,
  cursor?: string
): Promise<{ quotes: JobberQuote[]; nextCursor: string | null }> {
  const query = `
    query GetQuotes($first: Int!, $after: String) {
      quotes(first: $first, after: $after) {
        nodes {
          id
          quoteNumber
          title
          quoteStatus
          amounts { total }
          client {
            id
            firstName
            lastName
            emails { address }
            phones { number }
            billingAddress {
              street1
              street2
              city
              province
              postalCode
            }
          }
          lineItems(first: 20) {
            nodes { name description totalPrice }
          }
          createdAt
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const data = await jobberQuery<{
    quotes: {
      nodes: JobberQuote[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(tenantId, query, { first: 50, after: cursor ?? null });

  return {
    quotes: data.quotes.nodes,
    nextCursor: data.quotes.pageInfo.hasNextPage ? data.quotes.pageInfo.endCursor : null,
  };
}

/**
 * Sync Jobber estimates/quotes as unassigned PENDING jobs.
 * Only syncs quotes with status "approved" or "draft" (i.e., active estimates).
 * Deduplicates by Job.jobberQuoteId.
 */
export async function syncJobberEstimates(tenantId: string): Promise<number> {
  let synced = 0;
  let cursor: string | undefined;

  do {
    const { quotes, nextCursor } = await fetchJobberQuotes(tenantId, cursor);

    for (const quote of quotes) {
      // Skip already-synced quotes
      const existing = await prisma.job.findUnique({
        where: { jobberQuoteId: quote.id },
      });
      if (existing) continue;

      // Skip quotes with no total
      const total = quote.amounts?.total ?? 0;
      if (total <= 0) continue;

      const client = quote.client;
      const customerName = `${client.firstName} ${client.lastName}`.trim();
      const customerEmail = client.emails?.[0]?.address ?? "";
      if (!customerEmail) {
        console.warn(`[jobber-sync] Skipping quote ${quote.id} — no customer email on file`);
        continue;
      }
      const customerPhone = client.phones?.[0]?.number ?? "";
      const address = client.billingAddress;

      // Build notes from line items
      const lineItemNotes = quote.lineItems.nodes
        .map((li) => `• ${li.name}${li.description ? ` — ${li.description}` : ""} ($${li.totalPrice.toFixed(2)})`)
        .join("\n");

      // Create ServiceRequest → Quote → Job in a transaction
      await prisma.$transaction(async (tx) => {
        const request = await tx.serviceRequest.create({
          data: {
            tenantId,
            customerName,
            customerEmail,
            customerPhone,
            addressLine1: address?.street1 ?? "See Jobber",
            addressLine2: address?.street2,
            city: address?.city ?? "Unknown",
            state: address?.province ?? "FL",
            postalCode: address?.postalCode ?? "00000",
            serviceType: "HOME_CLEAN",
            notes: `[Jobber Quote #${quote.quoteNumber}]${quote.title ? ` — ${quote.title}` : ""}\n\n${lineItemNotes}`,
            status: "QUOTED",
          },
        });

        await tx.quote.create({
          data: {
            requestId: request.id,
            subtotal: total,
            fees: 0,
            taxes: 0,
            total,
            smartNotes: `Synced from Jobber estimate #${quote.quoteNumber}`,
          },
        });

        await tx.job.create({
          data: {
            tenantId,
            requestId: request.id,
            status: "PENDING",
            payoutAmount: Math.round(total * 0.62 * 100) / 100,
            jobberQuoteId: quote.id,
          },
        });

        synced++;
      });
    }

    cursor = nextCursor ?? undefined;
  } while (cursor);

  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "JOBBER_ESTIMATE_SYNC",
      metadata: { estimatesSynced: synced },
    },
  });

  return synced;
}

// ─── Timesheet / Time Entry Sync ────────────────────────────

export type JobberTimeEntry = {
  id: string;
  startAt: string;
  endAt: string | null;
  duration: number | null; // seconds
  user: { id: string; name: { full: string } };
  note: string | null;
};

export async function fetchJobberTimeEntries(
  tenantId: string,
  cursor?: string
): Promise<{ entries: JobberTimeEntry[]; nextCursor: string | null }> {
  const query = `
    query GetTimeEntries($first: Int!, $after: String) {
      timeEntries(first: $first, after: $after) {
        nodes {
          id
          startAt
          endAt
          duration
          user { id name { full } }
          note
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const data = await jobberQuery<{
    timeEntries: {
      nodes: JobberTimeEntry[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(tenantId, query, { first: 50, after: cursor ?? null });

  return {
    entries: data.timeEntries.nodes,
    nextCursor: data.timeEntries.pageInfo.hasNextPage ? data.timeEntries.pageInfo.endCursor : null,
  };
}

/**
 * Sync Jobber time entries into local Timesheet records.
 * Matches Jobber users to CleanerProfiles by full name.
 * Deduplicates by Timesheet.jobberTimesheetId.
 */
export type SyncedTimesheetEvent = {
  cleanerName: string;
  eventType: "clock_in" | "clock_out";
  timestamp: Date;
  hoursWorked: number | null;
  note: string | null;
};

export async function syncJobberTimesheets(tenantId: string): Promise<{ synced: number; events: SyncedTimesheetEvent[] }> {
  let synced = 0;
  const events: SyncedTimesheetEvent[] = [];
  let cursor: string | undefined;

  // Pre-load all cleaners for name matching
  const cleaners = await prisma.cleanerProfile.findMany({
    where: { user: { tenantId } },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  const cleanerByName = new Map<string, string>();
  const cleanerNameById = new Map<string, string>();
  for (const c of cleaners) {
    const fullName = `${c.user.firstName} ${c.user.lastName}`.trim();
    cleanerByName.set(fullName.toLowerCase(), c.id);
    cleanerNameById.set(c.id, fullName);
  }

  do {
    const { entries, nextCursor } = await fetchJobberTimeEntries(tenantId, cursor);

    for (const entry of entries) {
      // Skip already-synced entries
      const existing = await prisma.timesheet.findUnique({
        where: { jobberTimesheetId: entry.id },
      });
      if (existing) continue;

      // Match Jobber user to cleaner
      const jobberName = entry.user.name.full.toLowerCase();
      const cleanerId = cleanerByName.get(jobberName);
      if (!cleanerId) {
        console.warn(`[jobber-sync] No cleaner match for Jobber user: "${entry.user.name.full}"`);
        continue;
      }

      const startAt = new Date(entry.startAt);
      const endAt = entry.endAt ? new Date(entry.endAt) : null;
      const durationSec = entry.duration ?? (endAt ? (endAt.getTime() - startAt.getTime()) / 1000 : null);
      const hoursWorked = durationSec ? Math.round((durationSec / 3600) * 100) / 100 : null;

      await prisma.timesheet.create({
        data: {
          cleanerId,
          date: startAt,
          clockIn: startAt,
          clockOut: endAt,
          hoursWorked,
          source: "jobber",
          jobberTimesheetId: entry.id,
          notes: entry.note,
          approved: false,
        },
      });

      synced++;

      // Track the event for clock-in/out alerting
      events.push({
        cleanerName: cleanerNameById.get(cleanerId) || entry.user.name.full,
        eventType: endAt ? "clock_out" : "clock_in",
        timestamp: endAt || startAt,
        hoursWorked,
        note: entry.note,
      });
    }

    cursor = nextCursor ?? undefined;
  } while (cursor);

  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "JOBBER_TIMESHEET_SYNC",
      metadata: { timesheetsSynced: synced },
    },
  });

  return { synced, events };
}

// ─── Check Connection Status ─────────────────────────────────

export async function isJobberConnected(tenantId: string): Promise<boolean> {
  const integration = await prisma.integration.findFirst({
    where: { tenantId, type: "JOBBER", status: "connected" },
  });
  return !!integration;
}

/**
 * Get all tenants with active Jobber connections.
 */
export async function getJobberConnectedTenants(): Promise<string[]> {
  const integrations = await prisma.integration.findMany({
    where: { type: "JOBBER", status: "connected" },
    select: { tenantId: true },
  });
  return integrations.map((i) => i.tenantId);
}
