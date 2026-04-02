import PipelineBoard from "@/src/components/pipeline/PipelineBoard";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { requireSession } from "@/src/lib/auth/session";
import { getPipelineBoardData } from "@/src/lib/pipeline";

const CleanerPipelinePage = async () => {
  const session = await requireSession({ roles: ["CLEANER", "HQ"], redirectTo: "/login" });

  let board;
  try {
    board = await getPipelineBoardData(session);
  } catch (error) {
    console.error("[cleaner/pipeline] Failed to fetch pipeline data:", error);
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-700">Unable to load pipeline</p>
        <p className="mt-1 text-sm text-red-600">Please try refreshing the page.</p>
      </div>
    );
  }

  const noAssignments = board.columns.every((column) => column.houses.length === 0);

  return (
    <div className="space-y-6">
      {noAssignments && (
        <Card className="border border-dashed border-brand-200 bg-white">
          <CardHeader>
            <h1 className="text-2xl font-semibold text-accent">No houses assigned yet</h1>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Claim a job from the board or wait for dispatch to assign you to a home.</p>
            <p>
              Once you are on a job, this tracker will show where that house is in the workflow and when the customer needs a new time.
            </p>
          </CardContent>
        </Card>
      )}
      <PipelineBoard {...board} />
    </div>
  );
};

export default CleanerPipelinePage;
