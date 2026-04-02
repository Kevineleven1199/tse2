import PipelineBoard from "@/src/components/pipeline/PipelineBoard";
import { requireSession } from "@/src/lib/auth/session";
import { getPipelineBoardData } from "@/src/lib/pipeline";

export default async function ManagerPipelinePage() {
  const session = await requireSession({ roles: ["MANAGER", "HQ"], redirectTo: "/manager" });

  let board;
  try {
    board = await getPipelineBoardData(session);
  } catch (error) {
    console.error("[manager/pipeline] Failed to fetch pipeline data:", error);
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-700">Unable to load pipeline</p>
        <p className="mt-1 text-sm text-red-600">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PipelineBoard {...board} />
    </div>
  );
}
