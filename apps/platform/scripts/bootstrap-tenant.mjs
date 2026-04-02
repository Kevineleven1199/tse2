#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[bootstrap-tenant] DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

const tenantId = process.env.DEFAULT_TENANT_ID ?? "ten_tse";
const tenantSlug = process.env.DEFAULT_TENANT_SLUG ?? "tse";
const tenantName = process.env.DEFAULT_TENANT_NAME ?? "GoGreen HQ";

try {
  const existing = await prisma.tenant.findUnique({
    where: { slug: tenantSlug }
  });

  if (existing) {
    console.log(`Tenant '${tenantSlug}' already exists (id=${existing.id}). Skipping creation.`);
  } else {
    const created = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: tenantName,
        slug: tenantSlug
      }
    });
    console.log(`Created tenant '${created.name}' with id=${created.id}.`);
  }
} catch (error) {
  console.error("[bootstrap-tenant] Failed to ensure tenant", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
