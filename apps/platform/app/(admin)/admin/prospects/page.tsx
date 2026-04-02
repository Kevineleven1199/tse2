import { requireSession } from "@/src/lib/auth/session";
import ProspectsClient from "./prospects-client";

export default async function ProspectsPage() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return <div className="p-8 text-center text-red-600">Please log in to access this page.</div>;
  }
  if (!["HQ", "MANAGER"].includes(session.role)) {
    return <div className="p-8 text-center text-red-600">Unauthorized</div>;
  }
  return <ProspectsClient />;
}
