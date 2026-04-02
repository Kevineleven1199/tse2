import { requireSession } from "@/src/lib/auth/session";
import EmployeeNewPostForm from "@/src/components/employee/EmployeeNewPostForm";

export default async function EmployeeNewPostPage() {
  const session = await requireSession({
    roles: ["CLEANER", "HQ", "MANAGER"],
    redirectTo: "/login",
  });

  return (
    <EmployeeNewPostForm
      authorName={session.name}
      sessionRole={session.role}
    />
  );
}
