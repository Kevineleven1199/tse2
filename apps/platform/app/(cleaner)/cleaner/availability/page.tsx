import { requireSession } from "@/src/lib/auth/session";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { AvailabilityEditor } from "@/src/components/cleaner/AvailabilityEditor";

export default async function CleanerAvailabilityPage() {
  await requireSession({ roles: ["CLEANER", "HQ"], redirectTo: "/cleaner" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-accent">My Availability</h1>
        <p className="text-sm text-muted-foreground">
          Set your weekly availability so we can match you with the right jobs.
        </p>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <h2 className="text-lg font-semibold text-accent">Weekly Hours</h2>
          <p className="text-sm text-muted-foreground">
            Add time slots for each day you&apos;re available to work.
          </p>
        </CardHeader>
        <CardContent>
          <AvailabilityEditor />
        </CardContent>
      </Card>
    </div>
  );
}
