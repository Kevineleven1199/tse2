import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

export const dynamic = "force-dynamic";

interface Signature {
  id: string;
  jobId: string;
  cleanerId: string;
  customerName: string;
  signedAt: string;
}

export default async function SignaturesPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  try {
    const signatures = await prisma.jobSignature.findMany({
      orderBy: { signedAt: "desc" },
      take: 50,
    });

    const signatureData: Signature[] = signatures.map((sig) => ({
      id: sig.id,
      jobId: sig.jobId,
      cleanerId: sig.cleanerId,
      customerName: sig.customerName,
      signedAt: sig.signedAt.toISOString(),
    }));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
                Job Records
              </p>
              <h1 className="text-2xl font-semibold">Job Signatures</h1>
              <p className="mt-1 text-sm text-brand-100">
                Customer signatures collected on completed jobs
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Signatures
                  </p>
                  <p className="mt-2 text-3xl font-bold text-accent">
                    {signatureData.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    This Month
                  </p>
                  <p className="mt-2 text-3xl font-bold text-accent">
                    {signatureData.filter((sig) => {
                      const date = new Date(sig.signedAt);
                      const now = new Date();
                      return (
                        date.getMonth() === now.getMonth() &&
                        date.getFullYear() === now.getFullYear()
                      );
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {signatureData.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-3">📝</p>
              <p className="font-semibold text-foreground">
                No signatures yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Customer signatures from completed jobs will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold text-accent">
                {signatureData.length} Signatures
              </h2>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Customer
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Job ID
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Cleaner ID
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Signed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {signatureData.map((sig) => (
                      <tr key={sig.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-foreground font-medium">
                          {sig.customerName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          {sig.jobId.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          {sig.cleanerId.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(sig.signedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch signatures:", error);
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
              Job Records
            </p>
            <h1 className="text-2xl font-semibold">Job Signatures</h1>
          </div>
        </div>

        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Error loading signatures. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
