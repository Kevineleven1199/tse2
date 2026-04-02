import { type NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookies } from "@/src/lib/auth/cookies";
import type { CommunityAuthorRole } from "@/src/lib/community";

export const COMMUNITY_VISITOR_COOKIE = "gg_community_actor";

export type CommunityActor = {
  key: string;
  cookieValue?: string;
  cookieWasSet: boolean;
  isAuthenticated: boolean;
  tenantId: string | null;
  userId?: string;
  name?: string;
  role: CommunityAuthorRole;
  badge?: string;
  sessionRole?: string;
};

const mapSessionRole = (role?: string): CommunityAuthorRole => {
  switch (role) {
    case "CLEANER":
      return "cleaner";
    case "HQ":
    case "MANAGER":
      return "admin";
    default:
      return "client";
  }
};

const badgeForSessionRole = (role?: string) => {
  switch (role) {
    case "HQ":
      return "Admin";
    case "MANAGER":
      return "Manager";
    case "CLEANER":
      return "Cleaner";
    default:
      return undefined;
  }
};

export const getCommunityActor = async (): Promise<CommunityActor> => {
  const session = await getSessionFromCookies();
  if (session) {
    return {
      key: `user:${session.userId}`,
      cookieWasSet: false,
      isAuthenticated: true,
      tenantId: session.tenantId,
      userId: session.userId,
      name: session.name,
      role: mapSessionRole(session.role),
      badge: badgeForSessionRole(session.role),
      sessionRole: session.role,
    };
  }

  const store = await cookies();
  const existing = store.get(COMMUNITY_VISITOR_COOKIE)?.value;
  if (existing) {
    return {
      key: `visitor:${existing}`,
      cookieValue: existing,
      cookieWasSet: false,
      isAuthenticated: false,
      tenantId: process.env.DEFAULT_TENANT_ID ?? null,
      role: "client",
    };
  }

  const cookieValue = crypto.randomUUID();
  return {
    key: `visitor:${cookieValue}`,
    cookieValue,
    cookieWasSet: true,
    isAuthenticated: false,
    tenantId: process.env.DEFAULT_TENANT_ID ?? null,
    role: "client",
  };
};

export const applyCommunityActorCookie = (
  response: NextResponse,
  actor: CommunityActor
) => {
  if (!actor.cookieWasSet || !actor.cookieValue) {
    return response;
  }

  response.cookies.set(COMMUNITY_VISITOR_COOKIE, actor.cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
};

export const canAccessTeamCommunity = (actor: CommunityActor) =>
  Boolean(actor.isAuthenticated && actor.sessionRole && ["CLEANER", "HQ", "MANAGER"].includes(actor.sessionRole));
