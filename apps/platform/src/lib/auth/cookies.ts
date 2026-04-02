import { cookies } from "next/headers";
import { SESSION_COOKIE, type SessionPayload, createSessionToken, verifySessionToken } from "./token";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7 // 7 days
};

export const buildSessionCookie = async (payload: SessionPayload) => ({
  name: SESSION_COOKIE,
  value: await createSessionToken(payload),
  options: cookieOptions
});

export const buildClearSessionCookie = () => ({
  name: SESSION_COOKIE,
  value: "",
  options: { ...cookieOptions, maxAge: 0 }
});

export const getSessionFromCookies = async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
};
