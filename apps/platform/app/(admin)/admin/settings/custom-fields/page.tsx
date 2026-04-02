import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import CustomFieldsClient from "./custom-fields-client";

export default async function CustomFieldsPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  try {
    const fields = await prisma.customFieldDefinition.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    const fieldsByEntity = fields.reduce(
      (acc, field) => {
        const entity = field.entityType || "other";
        if (!acc[entity]) acc[entity] = 0;
        acc[entity] += 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
            SYSTEM CONFIGURATION
          </p>
          <h1 className="text-2xl font-semibold">Custom Fields</h1>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm text-muted-foreground">Total Fields</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fields.length}</p>
            </CardContent>
          </Card>

          {Object.entries(fieldsByEntity).map(([entity, count]) => (
            <Card key={entity}>
              <CardHeader className="pb-2">
                <p className="text-sm text-muted-foreground capitalize">
                  {entity}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{count}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <CustomFieldsClient initialData={fields.map(f => ({
          ...f,
          options: f.options as unknown,
          createdAt: f.createdAt.toISOString(),
          updatedAt: f.updatedAt.toISOString(),
        }))} />
      </div>
    );
  } catch (error) {
    console.error("Failed to load Custom Fields:", error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Custom Fields</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load data. Please try refreshing the page.
        </div>
      </div>
    );
  }
}
