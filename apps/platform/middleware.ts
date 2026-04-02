import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./src/lib/auth/token";

type AllowedRole = "HQ" | "MANAGER" | "CLEANER" | "CUSTOMER";

const roleRequirements: Array<{ prefix: string; roles: AllowedRole[] }> = [
  { prefix: "/admin", roles: ["HQ"] },
  { prefix: "/api/admin", roles: ["HQ", "MANAGER"] },
  { prefix: "/manager", roles: ["MANAGER", "HQ"] },
  { prefix: "/employee-hub", roles: ["CLEANER", "HQ", "MANAGER"] },
  { prefix: "/cleaner", roles: ["CLEANER", "HQ"] },
  { prefix: "/api/cleaner", roles: ["CLEANER", "HQ", "MANAGER"] },
  { prefix: "/api/employee", roles: ["CLEANER", "HQ", "MANAGER"] },
  { prefix: "/api/jobs", roles: ["CLEANER", "HQ"] },
  { prefix: "/api/client", roles: ["CUSTOMER", "HQ"] },
  { prefix: "/client", roles: ["CUSTOMER", "HQ"] }
];

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG ?? "tse";

const RESERVED_TENANT_PREFIXES = new Set([
  "admin",
  "api",
  "about",
  "apply",
  "cleaner",
  "client",
  "community",
  "contact",
  "employee-hub",
  "faq",
  "get-a-quote",
  "links",
  "login",
  "manager",
  "newsletter",
  "quote",
  "register",
  "request",
  "services"
]);

const isIpHost = (host: string) => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
const isRailwayManagedHost = (host: string) =>
  host === "railway.app" || host.endsWith(".railway.app") || host.endsWith(".up.railway.app");

const getRequiredRoles = (pathname: string) => {
  const match = roleRequirements.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
  return match?.roles;
};

export async function middleware(request: NextRequest) {
  const requiredRoles = getRequiredRoles(request.nextUrl.pathname);

  if (requiredRoles) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = await verifySessionToken(token);

    const isApiRoute = request.nextUrl.pathname === "/api" || request.nextUrl.pathname.startsWith("/api/");

    if (!session) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (!requiredRoles.includes(session.role)) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  const host = request.headers.get("host") ?? "";
  const hostNoPort = host.split(":")[0]?.toLowerCase() ?? "";
  const hostParts = hostNoPort.split(".").filter(Boolean);

  const pathSegments = request.nextUrl.pathname.split("/").filter(Boolean);
  const pathTenantCandidate = pathSegments.length > 0 ? pathSegments[0] : null;
  const pathTenant =
    pathTenantCandidate &&
    !RESERVED_TENANT_PREFIXES.has(pathTenantCandidate) &&
    !pathTenantCandidate.includes(".")
      ? pathTenantCandidate
      : null;

  const subdomainCandidate = (() => {
    if (hostParts.length > 2) return hostParts[0];
    if (hostParts.length === 2 && hostParts[1] === "localhost") return hostParts[0];
    return null;
  })();

  const subdomainTenant =
    subdomainCandidate &&
    !isRailwayManagedHost(hostNoPort) &&
    !["www", "app", "localhost", "127"].includes(subdomainCandidate)
      ? subdomainCandidate
      : null;

  const tenantSlug = pathTenant ?? subdomainTenant ?? DEFAULT_TENANT_SLUG;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-slug", tenantSlug);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
  response.headers.set("x-tenant-slug", tenantSlug);
  return response;
}

export const config = {
  matcher: ["/((?!_next|static|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\..*).*)" ]
};
