import { NavBar } from "@/src/components/NavBar";
import { Footer } from "@/src/components/Footer";
import { getSession } from "@/src/lib/auth/session";

/**
 * Shared layout for ALL public pages.
 * Ensures NavBar + Footer are always present so users can navigate easily.
 */
const PublicLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getSession();
  const navSession = session ? { name: session.name, role: session.role } : null;

  return (
    <>
      <NavBar session={navSession} />
      {children}
      <Footer />
    </>
  );
};

export default PublicLayout;
