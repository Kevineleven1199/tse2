import { requireSession } from "@/src/lib/auth/session";
import UserSwitcher from "@/src/components/admin/UserSwitcher";

export const metadata = {
  title: "Switch User | TriState Admin"
};

export default async function SwitchUserPage() {
  const session = await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  return (
    <div className="space-y-8">
      <UserSwitcher />
    </div>
  );
}
