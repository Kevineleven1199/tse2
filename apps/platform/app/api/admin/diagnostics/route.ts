/**
 * Temporary diagnostic endpoint to debug CRM/customer page errors.
 * DELETE THIS after debugging.
 *
 * GET /api/admin/diagnostics?secret=ggoc-diag-2026
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== "ggoc-diag-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // Test 1: Basic connection
  try {
    const count = await prisma.serviceRequest.count();
    results.serviceRequestCount = count;
  } catch (e: unknown) {
    results.serviceRequestCountError = e instanceof Error ? e.message : String(e);
  }

  // Test 2: The exact query from the customers page
  try {
    const requests = await prisma.serviceRequest.findMany({
      take: 3,
      include: {
        job: {
          include: {
            assignments: true,
          },
        },
        quote: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    results.customersQuerySample = requests.length;
    results.sampleData = requests.map(r => ({
      id: r.id,
      name: r.customerName,
      email: r.customerEmail,
      hasJob: !!r.job,
      hasQuote: !!r.quote,
    }));
  } catch (e: unknown) {
    results.customersQueryError = e instanceof Error ? e.message : String(e);
  }

  // Test 3: User count
  try {
    const users = await prisma.user.count();
    results.userCount = users;
  } catch (e: unknown) {
    results.userCountError = e instanceof Error ? e.message : String(e);
  }

  // Test 4: Check if CustomerEmail table exists
  try {
    const emails = await prisma.customerEmail.count();
    results.customerEmailCount = emails;
  } catch (e: unknown) {
    results.customerEmailError = e instanceof Error ? e.message : String(e);
  }

  // Test 5: Session/cookie test
  try {
    const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
    results.tenants = tenants;
  } catch (e: unknown) {
    results.tenantError = e instanceof Error ? e.message : String(e);
  }

  // Test 6: Check env vars exist (not values)
  results.envCheck = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    OPENPHONE_API_KEY: !!process.env.OPENPHONE_API_KEY,
    CRON_SECRET: !!process.env.CRON_SECRET,
    JWT_SECRET: !!process.env.JWT_SECRET,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
  };

  return NextResponse.json(results);
}
