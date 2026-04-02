import { redirect } from "next/navigation";
import type { SessionPayload } from "./token";
import { getSessionFromCookies } from "./cookies";

type RequireSessionOptions = {
  roles?: SessionPayload["role"][];
  redirectTo?: string;
};

export const getSession = async () => getSessionFromCookies();

export const requireSession = async (options: RequireSessionOptions = {}) => {
  const session = await getSession();
  if (!session) {
    const destination = options.redirectTo ?? "/";
    redirect(`/login?redirect=${encodeURIComponent(destination)}`);
  }
  if (options.roles && !options.roles.includes(session.role)) {
    redirect("/");
  }
  return session;
};
