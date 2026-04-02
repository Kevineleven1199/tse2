import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/crm/contacts
 * Returns ALL contacts from the User table (role=CUSTOMER) with address data.
 * This is the master CRM endpoint — returns every contact in the system.
 */
export async function GET(request: Request) {
  const session = await requireSession({ roles: ["HQ", "MANAGER"] });
  const tenantId = session.tenantId;

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "500"), 1000);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  // Query ALL customers from User table
  const where: any = { tenantId, role: "CUSTOMER" };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        status: true, createdAt: true,
      },
      orderBy: { firstName: "asc" },
      take: limit,
      skip: offset,
    }),
    prisma.user.count({ where }),
  ]);

  // Batch fetch addresses for these users
  const emails = users.map(u => u.email);
  const addresses = await prisma.customerAddress.findMany({
    where: { tenantId: tenantId!, customerEmail: { in: emails } },
    select: { customerEmail: true, city: true, state: true, postalCode: true, addressLine1: true },
  });
  const addrMap = new Map(addresses.map(a => [a.customerEmail.toLowerCase(), a]));

  // Batch fetch service stats
  const serviceStats = await prisma.serviceRequest.groupBy({
    by: ["customerEmail"],
    where: { tenantId: tenantId!, customerEmail: { in: emails } },
    _count: true,
  }).catch(() => []);

  const jobCountMap = new Map<string, number>();
  for (const s of serviceStats) {
    jobCountMap.set(s.customerEmail.toLowerCase(), s._count);
  }

  const contacts = users.map(u => {
    const addr = addrMap.get(u.email.toLowerCase());
    const isImportPlaceholder = u.email.includes("@import") || u.email.includes("@placeholder");
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      name: `${u.firstName} ${u.lastName}`.trim(),
      email: isImportPlaceholder ? null : u.email,
      phone: u.phone,
      city: addr?.city || null,
      state: addr?.state || null,
      zip: addr?.postalCode || null,
      address: addr?.addressLine1 || null,
      status: u.status,
      totalJobs: jobCountMap.get(u.email.toLowerCase()) || 0,
      createdAt: u.createdAt.toISOString(),
    };
  });

  return NextResponse.json({
    contacts,
    total,
    offset,
    limit,
  });
}
