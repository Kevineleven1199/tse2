import { redirect } from "next/navigation";
import { getSession } from "@/src/lib/auth/session";

/**
 * Newsletter admin tool — redirect non-admins to homepage.
 * The actual newsletter preview is at /admin/campaigns.
 */
export default async function NewsletterPage() {
  const session = await getSession();

  if (!session || (session.role !== "HQ" && session.role !== "MANAGER")) {
    redirect("/");
  }

  // For admins, redirect to the admin campaigns section
  redirect("/admin/campaigns");
}
