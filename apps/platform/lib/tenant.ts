import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG ?? "tse";

const normalizeHost = (host: string) => host.split(":")[0]?.toLowerCase() ?? "";
const isRailwayManagedHost = (host: string) =>
  host === "railway.app" || host.endsWith(".railway.app") || host.endsWith(".up.railway.app");

export const getTenantFromRequest = async (slug?: string) => {
  const requestHeaders = await headers();
  const headerSlug = requestHeaders.get("x-tenant-slug") ?? undefined;

  if (slug) {
    return prisma.tenant.findUnique({
      where: {
        slug
      }
    });
  }

  if (headerSlug && headerSlug !== DEFAULT_TENANT_SLUG) {
    const tenantBySlug = await prisma.tenant.findUnique({
      where: {
        slug: headerSlug
      }
    });

    if (tenantBySlug) {
      return tenantBySlug;
    }
  }

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const hostNoPort = normalizeHost(host);

  if (hostNoPort) {
    const tenantByDomain = await getTenantByDomain(hostNoPort);
    if (tenantByDomain) {
      return tenantByDomain;
    }
  }

  return prisma.tenant.findUnique({
    where: {
      slug: DEFAULT_TENANT_SLUG
    }
  });
};

export const getTenantByDomain = async (host: string) => {
  const hostNoPort = normalizeHost(host);
  if (!hostNoPort) {
    return prisma.tenant.findUnique({
      where: { slug: DEFAULT_TENANT_SLUG }
    });
  }

  const [subdomainCandidate] = hostNoPort.split(".").filter(Boolean);
  const slugCandidate =
    !isRailwayManagedHost(hostNoPort) && subdomainCandidate && !["www", "app"].includes(subdomainCandidate)
      ? subdomainCandidate
      : null;

  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        ...(slugCandidate ? [{ slug: slugCandidate }] : []),
        {
          customDomain: hostNoPort
        }
      ]
    }
  });

  return tenant ?? prisma.tenant.findUnique({ where: { slug: DEFAULT_TENANT_SLUG } });
};
