import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE = "gg_session";

export type SessionPayload = {
  userId: string;
  email: string;
  role: "HQ" | "MANAGER" | "CLEANER" | "CUSTOMER";
  name: string;
  tenantId: string;
};

const getSecret = () => {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[SECURITY] AUTH_SECRET is not set. Refusing to start with insecure fallback in production.");
    }
    // Development-only fallback
    return new TextEncoder().encode("tse-dev-secret-do-not-use-in-prod");
  }
  return new TextEncoder().encode(secret);
};

export const createSessionToken = async (payload: SessionPayload, expiresIn: string | number = "7d") =>
  new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());

export const verifySessionToken = async (token?: string | null) => {
  if (!token) return null;
  try {
    const result = await jwtVerify(token, getSecret());
    return result.payload as SessionPayload;
  } catch {
    return null;
  }
};
