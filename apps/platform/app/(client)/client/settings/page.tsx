import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { requireSession } from "@/src/lib/auth/session";
import { SettingsForm } from "./SettingsForm";

const ClientSettingsPage = async () => {
  await requireSession({ roles: ["CUSTOMER", "HQ"], redirectTo: "/login" });

  return (
    <Card className="bg-white">
      <CardHeader>
        <h1 className="text-2xl font-semibold text-accent">Profile & Preferences</h1>
        <p className="text-sm text-muted-foreground">
          Keep your contact details current so we can confirm entry instructions and visit windows quickly.
        </p>
      </CardHeader>
      <CardContent>
        <SettingsForm />
      </CardContent>
    </Card>
  );
};

export default ClientSettingsPage;
