import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function TranscriptsPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  const transcripts = await prisma.callTranscript.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const stats = {
    total: transcripts.length,
    needsFollowUp: transcripts.filter((t) => t.followUpNeeded).length,
    newCalls: transcripts.filter((t) => !t.processedAt).length,
    totalEstimated: transcripts.reduce(
      (sum, t) => sum + (t.estimatedTotal || 0),
      0
    ),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Call Transcripts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-analyzed phone call summaries and auto-estimates
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Total Calls
          </p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-medium text-muted-foreground">New</p>
          <p className="text-2xl font-bold text-accent">{stats.newCalls}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Needs Follow-up
          </p>
          <p className="text-2xl font-bold text-orange-500">
            {stats.needsFollowUp}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Est. Revenue
          </p>
          <p className="text-2xl font-bold text-green-600">
            ${stats.totalEstimated.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Transcript list */}
      {transcripts.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-4xl mb-3">📞</p>
          <p className="font-semibold text-foreground">
            No call transcripts yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Once your OpenPhone webhook is connected, call transcripts will
            appear here with AI summaries and auto-estimates.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {transcripts.map((t) => {
            const status = t.processedAt ? "reviewed" : "new";
            return (
              <div
                key={t.id}
                className={`rounded-xl border bg-white p-5 transition hover:shadow-md ${
                  t.followUpNeeded ? "border-l-4 border-l-orange-400" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-lg">
                        {t.direction === "inbound" ? "📲" : "📱"}
                      </span>
                      <span className="font-semibold text-foreground">
                        {t.customerName || t.fromNumber}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          status === "new"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {status}
                      </span>
                      {t.sentiment && (
                        <span
                          className={`text-xs ${
                            t.sentiment === "positive"
                              ? "text-green-600"
                              : t.sentiment === "negative"
                                ? "text-red-600"
                                : "text-gray-500"
                          }`}
                        >
                          {t.sentiment === "positive"
                            ? "😊"
                            : t.sentiment === "negative"
                              ? "😟"
                              : "😐"}{" "}
                          {t.sentiment}
                        </span>
                      )}
                    </div>

                    {t.summary && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {t.summary}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {t.estimatedService && (
                        <span className="inline-flex items-center gap-1 rounded bg-brand-50 px-2 py-0.5 text-accent font-medium">
                          🧹 {t.estimatedService.replace(/_/g, " ")}
                        </span>
                      )}
                      {t.estimatedTotal != null && (
                        <span className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-green-700 font-medium">
                          💰 ${t.estimatedTotal.toFixed(0)} est.
                        </span>
                      )}
                      {t.sqft && <span>📐 {t.sqft} sqft</span>}
                      {t.duration != null && (
                        <span>
                          ⏱️ {Math.round(t.duration / 60)}m {Math.round(t.duration % 60)}s
                        </span>
                      )}
                    </div>

                    {t.followUpNeeded && (
                      <div className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700">
                        ⚠️ Follow-up needed
                      </div>
                    )}
                  </div>

                  <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {t.dialogue && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-accent hover:underline">
                      View full transcript
                    </summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-muted-foreground">
                      {JSON.stringify(t.dialogue, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
